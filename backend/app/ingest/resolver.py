"""
Resolver — string kodlari (dt_type, asset_code, signal_code) veritabanindaki
UUID'lere cevirir.

NEDEN CACHE?
  Gelen her mesajda dt/asset/signal icin DB'ye sorgu atmak yavas olurdu.
  Worker basladiginda seed'deki tum eslemeleri BIR KEZ bellege yukleriz;
  sonra her mesajda bellekten aninda (O(1)) cevirir.

ESLEMELER (gercek sema kolonlari):
  dt_registry.dt_type      ("OTOKAR_CORE") -> dt_registry.dt_id
  asset_registry           (dt_id, asset_code) -> asset_registry.asset_id
  signal_catalog.signal_code ("temperature") -> (signal_id, unit)

NOT: asset_code tek basina unique DEGIL; (dt_id, asset_code) birlikte unique
     (uq_asset_dt_code). Bu yuzden asset cache'i (dt_id, asset_code) ile anahtarlanir.
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class Resolver:
    def __init__(self) -> None:
        self._dt: dict[str, UUID] = {}                      # dt_type -> dt_id
        self._asset: dict[tuple[UUID, str], UUID] = {}      # (dt_id, asset_code) -> asset_id
        self._signal: dict[str, dict] = {}  # signal_code -> {signal_id, unit, range_min, range_max}
        self._loaded = False

    async def load(self, db: AsyncSession) -> None:
        """Seed'deki tum eslemeleri bellege yukler. Worker basinda 1 kez cagrilir."""
        # dt_registry: dt_type -> dt_id
        rows = await db.execute(text("SELECT dt_id, dt_type FROM dt_registry"))
        self._dt = {dt_type: dt_id for dt_id, dt_type in rows.all()}

        # asset_registry: (dt_id, asset_code) -> asset_id
        rows = await db.execute(text("SELECT asset_id, dt_id, asset_code FROM asset_registry"))
        self._asset = {(dt_id, code): aid for aid, dt_id, code in rows.all()}

       # signal_catalog: signal_code -> {signal_id, unit, range_min, range_max}
        rows = await db.execute(text(
            "SELECT signal_id, signal_code, unit, range_min, range_max FROM signal_catalog"
        ))
        self._signal = {
            code: {
                "signal_id": sid,
                "unit": unit,
                "range_min": float(rmin) if rmin is not None else None,
                "range_max": float(rmax) if rmax is not None else None,
            }
            for sid, code, unit, rmin, rmax in rows.all()
        }

        self._loaded = True
        print(
            f"[RESOLVER] yuklendi: {len(self._dt)} dt, "
            f"{len(self._asset)} asset, {len(self._signal)} signal",
            flush=True,
        )

    async def refresh(self, db: AsyncSession) -> None:
        """Cache'i yeniden yukler (yeni asset/signal eklendiyse)."""
        await self.load(db)

    # --- Cevirme metotlari --------------------------------------------------

    def dt_id(self, dt_type: str) -> UUID | None:
        return self._dt.get(dt_type)

    def asset_id(self, dt_id: UUID, asset_code: str) -> UUID | None:
        return self._asset.get((dt_id, asset_code))

    def signal(self, signal_code: str) -> dict | None:
        """Donus: {signal_id, unit, range_min, range_max} ya da None."""
        return self._signal.get(signal_code)

    @property
    def is_loaded(self) -> bool:
        return self._loaded