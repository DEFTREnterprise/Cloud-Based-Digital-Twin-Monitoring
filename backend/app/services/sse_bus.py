"""
SSE Event Bus — ingest worker yeni kayitlari buraya koyar,
/stream/telemetry ucu buradan okur.
Her bagli istemci kendi Queue'suna sahiptir; baglanti kesilince
_subscribers listesinden cikarilir (bellek sizintisi onlenir).
"""
import asyncio
import json
from collections.abc import AsyncGenerator


class SSEBus:
    def __init__(self) -> None:
        self._subscribers: list[asyncio.Queue] = []

    def publish(self, payload: dict) -> None:
        """Ingest worker'dan cagrilir."""
        message = json.dumps(payload, default=str)
        dead = []
        for q in self._subscribers:
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self._subscribers.remove(q)

    async def subscribe(self) -> AsyncGenerator[str, None]:
        q: asyncio.Queue = asyncio.Queue(maxsize=500)
        self._subscribers.append(q)
        try:
            while True:
                msg = await q.get()
                yield msg
        finally:
            if q in self._subscribers:
                self._subscribers.remove(q)


# Uygulama genelinde tek instance
sse_bus = SSEBus()