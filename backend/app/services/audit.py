"""
audit.py — Audit event yazma yardimci modulu (FR-API-008)

Kullanim:
    from app.services.audit import audit_log, AuditAction

    await audit_log(
        request=request,
        action=AuditAction.AUTH_OK,
        status_code=200,
        user_sub=user.sub,
        username=user.username,
        tenant_code=user.tenant_code,
    )

Tasarim ilkeleri
----------------
- Best-effort: yazma basarisiz olursa istegi bloklamayiz; yalnizca log.warning.
- Kisa omurlu session: request'in ana DB session'indan bagimsiz;
  request rollback olsa bile audit COMMIT edilir.
- Cagirici tarafta await gerektirir; sync context'ten cagirma.
"""
from __future__ import annotations

import enum
import logging
from typing import Any

from fastapi import Request
from sqlalchemy import text

from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


class AuditAction(str, enum.Enum):
    """audit_event.action enum degerleri (DB enum ile eslesir)."""
    AUTH_OK = "AUTH_OK"
    AUTH_FAIL_401 = "AUTH_FAIL_401"
    AUTH_FAIL_403 = "AUTH_FAIL_403"
    AUTH_ERROR = "AUTH_ERROR"


# Raw SQL — SQLAlchemy ORM model tanimlamadan ilerliyoruz (0001/0002 stilinde).
# ORM model istersek Faz 3'te eklenebilir. Simdilik text() yeterli.
_INSERT_SQL = text("""
    INSERT INTO audit_event (
        user_sub, username, tenant_code,
        method, path, status_code, action,
        client_ip, user_agent, correlation_id, details
    ) VALUES (
        :user_sub, :username, :tenant_code,
        :method, :path, :status_code, CAST(:action AS audit_action),
        :client_ip, :user_agent, :correlation_id, CAST(:details AS jsonb)
    )
""")


def _extract_client_ip(request: Request) -> str | None:
    """X-Forwarded-For varsa ilk IP'yi al (proxy arkasi); yoksa direct client."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


async def audit_log(
    *,
    request: Request,
    action: AuditAction,
    status_code: int,
    user_sub: str | None = None,
    username: str | None = None,
    tenant_code: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Bir audit event yazar. Basarisiz olursa sessiz gecer (log.warning)."""
    import json

    params = {
        "user_sub": user_sub,
        "username": username,
        "tenant_code": tenant_code,
        "method": request.method,
        "path": request.url.path,
        "status_code": status_code,
        "action": action.value,
        "client_ip": _extract_client_ip(request),
        "user_agent": request.headers.get("user-agent"),
        "correlation_id": request.headers.get("x-correlation-id"),
        "details": json.dumps(details) if details else None,
    }

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(_INSERT_SQL, params)
            await session.commit()
    except Exception as exc:  # noqa: BLE001
        # Best-effort: audit yazma DB sorunu nedeniyle basarisiz olsa bile
        # asil istegi patlatmayiz. Ama uyariyi logla ki fark edilebilsin.
        logger.warning(
            "audit_log basarisiz: action=%s path=%s status=%s err=%s",
            action.value, params["path"], status_code, exc,
        )