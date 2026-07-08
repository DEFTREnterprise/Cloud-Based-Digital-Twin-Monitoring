"""
GET /api/v1/assets — varlik (motor) listesi

Frontend'in SSE akisindaki asset_id (UUID) degerlerini insan-okur koda
(MOTOR_01, MOTOR_02, ...) eslemesi icin gereklidir. DT Selector'daki
"Subsystem/Asset" dropdown'i bu endpoint'ten beslenir.
"""
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(prefix="/api/v1", tags=["assets"])


class AssetMeta(BaseModel):
    asset_id: uuid.UUID
    dt_id: uuid.UUID
    asset_code: str
    subsystem: str | None = None


@router.get("/assets", response_model=list[AssetMeta])
async def list_assets(db: AsyncSession = Depends(get_db)):
    """Tum kayitli varliklari doner (asset_code sirali)."""
    sql = text("""
        SELECT asset_id, dt_id, asset_code, subsystem
        FROM asset_registry
        ORDER BY asset_code
    """)
    rows = await db.execute(sql)
    return [AssetMeta(**dict(r._mapping)) for r in rows]
