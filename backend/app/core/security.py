"""
security.py — JWT (Keycloak OIDC) dogrulama cekirdegi

Sorumluluklar
-------------
1) Keycloak JWKS endpoint'inden public key'leri ceker ve TTL'li bir cache tutar.
2) Gelen Bearer token'i RS256 ile dogrular (imza + iss + opsiyonel aud).
3) FastAPI icin iki dependency saglar:
   - get_current_user: token -> AuthenticatedUser
   - require_roles("ROL1", "ROL2"): role tabanli koruma (OR mantigi)

Not: bu modul DB veya app state'ine bagimli degildir; saf bir dogrulayicidir.
Tenant filtreleme/audit gibi seyler bu modulun cikti DTO'sundan beslenir.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError
from pydantic import BaseModel, Field

from app.core.config import settings

from app.core.database import AsyncSessionLocal
from sqlalchemy import text as _sql_text

from fastapi import Request

from app.services.audit import AuditAction, audit_log

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Cikti DTO'su: endpoint'ler bunu Depends ile alir.
# Token'in icinden surekli kullanacagimiz alanlari onceden cikariyoruz ki
# route'lar JWT claim isimleriyle ugrasmasin.
# ---------------------------------------------------------------------------
class AuthenticatedUser(BaseModel):
    """Dogrulanmis kullanicinin backend tarafindaki temsili."""
    sub: str = Field(..., description="Keycloak user UUID")
    username: str
    email: str | None = None
    tenant_code: str | None = Field(
        default=None,
        description="Multi-tenancy ayrimi icin token'a gomulu tenant kodu (OTOKAR/DEFTR/ESOGU)",
    )
    tenant_id: str | None = Field(
        default=None,
        description="tenant_code'un DB'deki UUID karsiligi (tenant tablosundan cozulur).",
    )
    roles: list[str] = Field(default_factory=list, description="realm_access.roles listesi")
    raw_claims: dict[str, Any] = Field(default_factory=dict, description="Tum JWT payload (audit/debug icin)")

    def has_role(self, role: str) -> bool:
        return role in self.roles

    def has_any_role(self, *roles: str) -> bool:
        return any(r in self.roles for r in roles)

    def is_admin(self) -> bool:
        """DEFTR_Admin -> tenant izolasyonundan muaf (tum tenant'lari gorur)."""
        return "DEFTR_Admin" in self.roles


# ---------------------------------------------------------------------------
# JWKS cache
# ---------------------------------------------------------------------------
class _JWKSCache:
    """Keycloak JWKS endpoint'i icin TTL + kid-miss force-refresh cache.

    - get_key(kid): once cache'e bakar, kid yoksa veya TTL bittiyse Keycloak'a gider.
    - refresh(): JWKS'i her cagriyi durduruyor olmadan en fazla bir kez yeniler
      (concurrent istekler ayni fetch'i bekler).
    """
    def __init__(self) -> None:
        self._keys: dict[str, dict[str, Any]] = {}   # kid -> JWK dict
        self._fetched_at: float = 0.0
        self._ttl: float = float(settings.JWKS_CACHE_TTL_SECONDS)
        # asyncio.Lock thread-safe degil ama tek event loop'ta yeterli.
        # FastAPI/uvicorn tek loop kullaniyor; problem olmaz.
        import asyncio
        self._lock = asyncio.Lock()

    @property
    def is_stale(self) -> bool:
        return (time.monotonic() - self._fetched_at) > self._ttl

    async def get_key(self, kid: str) -> dict[str, Any]:
        # Hizli yol: cache'de var ve fresh ise
        if not self.is_stale and kid in self._keys:
            return self._keys[kid]
        # Aksi halde refresh dene (kid bilinmiyor olabilir; key rotation senaryosu)
        await self._refresh_if_needed(force=kid not in self._keys)
        key = self._keys.get(kid)
        if key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token kid '{kid}' Keycloak JWKS'inde bulunamadi",
            )
        return key

    async def _refresh_if_needed(self, *, force: bool) -> None:
        async with self._lock:
            # Lock alindiktan sonra tekrar bak: baska istek bizden once yenilemis olabilir.
            if not force and not self.is_stale:
                return
            await self._fetch()

    async def _fetch(self) -> None:
        url = settings.KEYCLOAK_JWKS_URL
        logger.info("JWKS yenileniyor: %s", url)
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as e:
            logger.error("JWKS fetch hatasi: %s", e)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Kimlik dogrulama servisi (Keycloak JWKS) erisilemez",
            ) from e

        keys = data.get("keys", [])
        if not keys:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Keycloak JWKS bos donduruldu",
            )
        # kid -> JWK haritala
        self._keys = {k["kid"]: k for k in keys if "kid" in k}
        self._fetched_at = time.monotonic()
        logger.info("JWKS yenilendi, %d anahtar yuklendi", len(self._keys))


# Tek global instance (uygulama omru boyunca)
_jwks_cache = _JWKSCache()

# ---------------------------------------------------------------------------
# Tenant cache: tenant_code (str) -> tenant_id (UUID str)
# ---------------------------------------------------------------------------
class _TenantCache:
    """tenant.tenant_code -> tenant.tenant_id TTL'li cache.

    JWKS cache ile ayni deseni kullanir. Yeni tenant eklenirse en fazla TTL
    kadar bekler (default 1 saat).
    """
    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._map: dict[str, str] = {}  # tenant_code -> tenant_id (uuid str)
        self._fetched_at: float = 0.0
        self._ttl = float(ttl_seconds)
        import asyncio
        self._lock = asyncio.Lock()

    @property
    def is_stale(self) -> bool:
        return (time.monotonic() - self._fetched_at) > self._ttl

    async def get(self, tenant_code: str) -> str | None:
        """tenant_code -> tenant_id (str UUID). Yoksa None."""
        if not self.is_stale and tenant_code in self._map:
            return self._map[tenant_code]
        # Miss veya stale -> refresh
        await self._refresh(force=tenant_code not in self._map)
        return self._map.get(tenant_code)

    async def _refresh(self, *, force: bool) -> None:
        async with self._lock:
            if not force and not self.is_stale:
                return
            try:
                async with AsyncSessionLocal() as db:
                    rows = await db.execute(
                        _sql_text("SELECT tenant_code, tenant_id FROM tenant WHERE status = 'ACTIVE'")
                    )
                    self._map = {code: str(tid) for code, tid in rows.all()}
                    self._fetched_at = time.monotonic()
                    logger.info("tenant cache yenilendi: %d tenant", len(self._map))
            except Exception as exc:
                logger.error("tenant cache refresh hatasi: %s", exc)
                # Cache'i bozma (eski map'i tut); istekler bir sure calismaya devam eder


_tenant_cache = _TenantCache()

# ---------------------------------------------------------------------------
# Saf token dogrulayici (FastAPI'den bagimsiz, test edilebilir)
# ---------------------------------------------------------------------------
async def verify_token(token: str) -> dict[str, Any]:
    """Token'i dogrular ve payload'u dict olarak dondurur.

    Hatalar 401 olarak FastAPI'ye atilir; cagiran route'lara temiz yansir.
    """
    # 1) Header'dan kid'i cikar (imza dogrulamadan once)
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token header parse edilemedi: {e}",
        ) from e

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token header'inda 'kid' yok",
        )

    alg = unverified_header.get("alg")
    if alg != settings.KEYCLOAK_ALGORITHM:
        # Algoritma karistirma (alg=none / HS256) saldirisina karsi: izinli olanlari
        # asagidaki jwt.decode cagrisinda da kisitliyoruz, ama erken disari atalim.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Beklenmeyen JWT algoritmasi: {alg}",
        )

    # 2) JWKS cache'ten matching key'i al
    key = await _jwks_cache.get_key(kid)

    # 3) Imza + claim dogrulamasi
    decode_options = {
        "verify_signature": True,
        "verify_aud": settings.KEYCLOAK_VERIFY_AUDIENCE,
        "verify_iss": True,
        "verify_exp": True,
    }
    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=[settings.KEYCLOAK_ALGORITHM],
            issuer=settings.KEYCLOAK_ISSUER,
            audience=settings.KEYCLOAK_AUDIENCE if settings.KEYCLOAK_VERIFY_AUDIENCE else None,
            options=decode_options,
        )
    except ExpiredSignatureError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token suresi dolmus",
        ) from e
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token dogrulanamadi: {e}",
        ) from e

    return payload


# ---------------------------------------------------------------------------
# Payload -> AuthenticatedUser cevirici
# ---------------------------------------------------------------------------
async def _user_from_claims(claims: dict[str, Any]) -> AuthenticatedUser:
    realm_access = claims.get("realm_access") or {}
    roles = realm_access.get("roles") or []
    tenant_code = claims.get("tenant_code")
    tenant_id = await _tenant_cache.get(tenant_code) if tenant_code else None
    return AuthenticatedUser(
        sub=claims.get("sub", ""),
        username=claims.get("preferred_username") or claims.get("sub", ""),
        email=claims.get("email"),
        tenant_code=tenant_code,
        tenant_id=tenant_id,
        roles=list(roles),
        raw_claims=claims,
    )


# ---------------------------------------------------------------------------
# FastAPI dependency'leri
# ---------------------------------------------------------------------------
# auto_error=False: header yoksa biz 401 mesajini kendimiz uretiriz (daha net hata).
_bearer_scheme = HTTPBearer(auto_error=False, description="Keycloak JWT (Bearer)")


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> AuthenticatedUser:
    """Bearer token'i alir, dogrular ve AuthenticatedUser dondurur.

    Audit yazar:
      - Basarili dogrulama       -> AUTH_OK
      - Token yok / gecersiz     -> AUTH_FAIL_401
      - JWKS/altyapi hatasi (5xx)-> AUTH_ERROR

    Korumali endpoint'lerde: `user: AuthenticatedUser = Depends(get_current_user)`
    """
    if credentials is None or not credentials.credentials:
        await audit_log(
            request=request,
            action=AuditAction.AUTH_FAIL_401,
            status_code=401,
            details={"reason": "missing_bearer"},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization: Bearer <token> bekleniyor",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = await verify_token(credentials.credentials)
    except HTTPException as exc:
        # verify_token 401 (imza/exp/iss) veya 503 (JWKS erisim) firlatabilir.
        # Kategoriye gore audit action belirle.
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            await audit_log(
                request=request,
                action=AuditAction.AUTH_FAIL_401,
                status_code=401,
                details={"reason": "invalid_token", "detail": str(exc.detail)},
            )
        else:
            await audit_log(
                request=request,
                action=AuditAction.AUTH_ERROR,
                status_code=exc.status_code,
                details={"reason": "auth_infra_error", "detail": str(exc.detail)},
            )
        raise

    user = await _user_from_claims(claims)
    await audit_log(
        request=request,
        action=AuditAction.AUTH_OK,
        status_code=200,
        user_sub=user.sub,
        username=user.username,
        tenant_code=user.tenant_code,
    )
    return user


def require_roles(*required_roles: str):
    """Role tabanli koruma factory'si (OR mantigi)."""
    if not required_roles:
        raise ValueError("require_roles en az bir rol bekler")

    async def _checker(
        request: Request,
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if not user.has_any_role(*required_roles):
            await audit_log(
                request=request,
                action=AuditAction.AUTH_FAIL_403,
                status_code=403,
                user_sub=user.sub,
                username=user.username,
                tenant_code=user.tenant_code,
                details={
                    "required_roles": list(required_roles),
                    "user_roles": user.roles,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Bu uc nokta {list(required_roles)} rollerinden birini gerektirir; "
                    f"kullanici rolleri: {user.roles}"
                ),
            )
        return user

    return _checker

def require_tenant_asset_access():
    """Route'un asset_id parametresi ile tenant tutarliligini dogrular.

    Kullanim ornekleri route icinde ADIM 23.4'te. Bu helper simdilik AGN, cunku
    her route farkli asset kaynagi kullanir; her route icin ayri helper cikarmak
    yerine burada AuthenticatedUser ve is_admin uzerinden yonetecegiz.
    """
    # Not: sirf dokumantasyon amacli. Gercek kontrol route body'de yapiliyor.
    pass