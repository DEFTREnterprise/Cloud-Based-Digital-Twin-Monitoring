"""
GET /api/v1/assets — varlik (motor) listesi

Frontend'in SSE akisindaki asset_id (UUID) degerlerini insan-okur koda
(MOTOR_01, MOTOR_02, ...) eslemesi icin gereklidir. DT Selector'daki
"Subsystem/Asset" dropdown'i bu endpoint'ten beslenir.

Auth + tenant izolasyonu (Faz 2.4.1 P0.1):
  - Anonim erisim yok: Depends(get_current_user) ile 401 gate.
  - Non-admin kullanicilar SADECE kendi tenant'larindaki asset'leri gorur
    (asset_registry -> dt_registry.tenant_id uzerinden JOIN).
  - Admin (DEFTR_Admin) tum tenant'lari gorur (cross-tenant supervizyon).
  - Opsiyonel ?dt_id=... query param ile tek bir DT'ye daralt.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user

router = APIRouter(prefix="/api/v1", tags=["assets"])


class AssetMeta(BaseModel):
    asset_id: uuid.UUID
    dt_id: uuid.UUID
    asset_code: str
    subsystem: str | None = None


@router.get("/assets", response_model=list[AssetMeta])
async def list_assets(
    dt_id: Optional[uuid.UUID] = Query(None, description="Opsiyonel: tek bir DT'ye daralt"),
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Kullanicinin gorebilecegi asset'leri doner (asset_code sirali).

    - Admin: tum asset'ler (opsiyonel dt_id ile daraltilabilir).
    - Non-admin: sadece kendi tenant'indaki DT'lere bagli asset'ler.
    """
    admin = user.is_admin()

    # Asyncpg NULL-tip tuzaginin onune gecmek icin sorgulari filtre kombinasyonuna
    # gore ayri ayri kuruyoruz (bkz. AI_WORKING_PROTOCOL §5).
    if admin and dt_id is None:
        sql = text("""
            SELECT a.asset_id, a.dt_id, a.asset_code, a.subsystem
            FROM asset_registry a
            ORDER BY a.asset_code
        """)
        params = {}
    elif admin and dt_id is not None:
        sql = text("""
            SELECT a.asset_id, a.dt_id, a.asset_code, a.subsystem
            FROM asset_registry a
            WHERE a.dt_id = :dt_id
            ORDER BY a.asset_code
        """)
        params = {"dt_id": dt_id}
    else:
        # Non-admin: tenant filtresi zorunlu.
        if not getattr(user, "tenant_id", None):
            raise HTTPException(status_code=403, detail="tenant claim missing")

        if dt_id is None:
            sql = text("""
                SELECT a.asset_id, a.dt_id, a.asset_code, a.subsystem
                FROM asset_registry a
                JOIN dt_registry d ON d.dt_id = a.dt_id
                WHERE d.tenant_id = :tenant_id
                ORDER BY a.asset_code
            """)
            params = {"tenant_id": user.tenant_id}
        else:
            sql = text("""
                SELECT a.asset_id, a.dt_id, a.asset_code, a.subsystem
                FROM asset_registry a
                JOIN dt_registry d ON d.dt_id = a.dt_id
                WHERE d.tenant_id = :tenant_id
                  AND a.dt_id = :dt_id
                ORDER BY a.asset_code
            """)
            params = {"tenant_id": user.tenant_id, "dt_id": dt_id}

    rows = await db.execute(sql, params)
    return [AssetMeta(**dict(r._mapping)) for r in rows]