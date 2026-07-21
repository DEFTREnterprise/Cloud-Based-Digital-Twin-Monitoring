"""
auth.py — Kimlik / kullanici bilgisi uclari (Faz 2)

GET /api/v1/me            : token sahibi kullanicinin profili (tum giris yapanlara)
GET /api/v1/me/admin-check: sadece DEFTR_Admin rolune sahip kullanicilar (403 testi)

Bu router JWT pipeline'inin uctan uca dogrulamasi icin sade tutuldu.
Modul-rol matrisi (2.3.1) ileride buraya genisletilecek.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.core.config import settings
from app.core.authz import modules_for_roles
from app.core.security import AuthenticatedUser, get_current_user, require_roles

# main.py'deki global limiter'i re-use edecegiz. Import ederken circular
# olmasin diye lazy import kullanmiyoruz — main.py bu router'i import
# ediyor ama limiter tanimi router import'undan ONCE geliyor (order safe).
from app.core.limiter import limiter

router = APIRouter(prefix="/me", tags=["auth"])


class MeResponse(BaseModel):
    """Frontend'in acilista cektigi kullanici profili + modul erisim listesi."""
    sub: str
    username: str
    email: str | None
    tenant_code: str | None
    tenant_id: str | None
    is_admin: bool
    roles: list[str]
    allowed_modules: list[str]


@router.get("", response_model=MeResponse, summary="Token sahibi kullanici profili")
@limiter.limit(settings.RATE_LIMIT_ME)
async def read_me(
    request: Request,
    user: AuthenticatedUser = Depends(get_current_user),
) -> MeResponse:
    return MeResponse(
        sub=user.sub,
        username=user.username,
        email=user.email,
        tenant_code=user.tenant_code,
        tenant_id=user.tenant_id,
        is_admin=user.is_admin(),
        roles=user.roles,
        allowed_modules=modules_for_roles(user.roles),
    )


@router.get(
    "/admin-check",
    summary="Sadece DEFTR_Admin (RBAC ornek/test ucu)",
)
async def admin_only_probe(
    user: AuthenticatedUser = Depends(require_roles("DEFTR_Admin")),
) -> dict:
    return {
        "ok": True,
        "message": f"Merhaba {user.username}, DEFTR_Admin yetkisi dogrulandi.",
        "tenant_code": user.tenant_code,
    }