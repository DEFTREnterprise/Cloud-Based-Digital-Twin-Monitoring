"""
limiter.py — Global slowapi Limiter instance'i.

Ayri dosyada tutuyoruz cunku hem main.py hem de router'lar (auth.py, stream.py)
limiter'a ihtiyac duyuyor. main.py'de tanimlanirsa circular import olusur:
  main.py -> routers -> main.py
Buraya cikarinca zincir kirilir: hem main hem routers -> core.limiter.

STORAGE BACKEND (S1.4)
----------------------
Varsayilan slowapi depolamasi SUREC ICI bellektir. Uretimde uvicorn
--workers 2 ile calisiyor; her isci kendi sayacini tuttugu icin efektif
limit isci sayisi kadar katlaniyordu (60/dk yerine fiilen 120/dk).
Redis ortak sayac saglar.

REDIS ERISILEMEZSE: servis ACILMAYA DEVAM EDER, in-memory'ye duser ve
uyari loglanir. Gerekce: rate limit bir derinlemesine savunma katmanidir,
kritik yol degil; kimlik dogrulama Keycloak'ta yapiliyor. Redis'in
yoklugunda API'nin komple durmasi, korumanin zayiflamasindan daha buyuk
hasar verir.
"""
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

log = logging.getLogger(__name__)

MEMORY_URI = "memory://"


def _resolve_storage_uri() -> str:
    """Redis erisilebilirse onun URI'sini, degilse in-memory doner."""
    uri = (settings.RATE_LIMIT_STORAGE_URI or "").strip()

    if not uri or uri.startswith("memory"):
        log.info("[limiter] in-memory storage (yapilandirma geregi)")
        return MEMORY_URI

    try:
        # limits paketi slowapi ile birlikte gelir; storage_from_string
        # baglanti kurmadan nesneyi olusturur, check() gercek testi yapar.
        from limits.storage import storage_from_string

        storage = storage_from_string(uri)
        if storage.check():
            log.info("[limiter] Redis storage aktif: %s", _mask(uri))
            return uri
        log.warning(
            "[limiter] Redis erisilemedi (check basarisiz): %s "
            "-> in-memory'ye dusuluyor. Cok iscili calismada rate limit "
            "isci sayisi kadar katlanir.", _mask(uri))
    except Exception as exc:  # noqa: BLE001 - baglanti/ithal hatalarinin hepsi
        log.warning(
            "[limiter] Redis storage kurulamadi (%s: %s) -> in-memory'ye "
            "dusuluyor. Cok iscili calismada rate limit isci sayisi kadar "
            "katlanir.", type(exc).__name__, exc)

    return MEMORY_URI


def _mask(uri: str) -> str:
    """URI icindeki parolayi loglamadan gizler."""
    if "@" in uri and "//" in uri:
        scheme, rest = uri.split("//", 1)
        return f"{scheme}//***@{rest.split('@', 1)[1]}"
    return uri


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri=_resolve_storage_uri(),
)
