import os
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent))
load_dotenv(Path(__file__).parent.parent / ".env")

from otokar_iu_bridge import IUClient

iu = IUClient(os.getenv("OTOKAR_IU_USERNAME"), os.getenv("OTOKAR_IU_PASSWORD"))

# 30 gunluk pencere — 198275 ve 198283 (snapshot'ta veri gelen iki ornek)
for mid in (198275, 198283, 198275):
    print(f"\n=== monitor {mid}, son 30 gun ===")
    b = iu.get_basic_features(mid, lookback_min=60 * 24 * 30)
    c = iu.get_computed_features(mid, lookback_hours=24 * 30)
    print(f"basic 30d rows: {len(b)}")
    if b:
        print(f"  earliest: {b[0].get('time')}")
        print(f"  latest:   {b[-1].get('time')}")
    print(f"computed 30d rows: {len(c)}")
    if c:
        print(f"  earliest ts: {c[0].get('timestamp')}")
        print(f"  latest ts:   {c[-1].get('timestamp')}")

# Plant tree hala geliyor mu? (izin karsilastirmasi)
import requests
h = {"Authorization": f"Bearer {iu._ensure_token()}"}
r = requests.get("https://api.infinite-uptime.com/api/3.0/idap-api/plants/1716", headers=h, timeout=30)
print(f"\n=== /plants/1716 status: {r.status_code} ===")
data = r.json().get("data", {})
areas = data.get("areas", [])
mon_count = sum(len(m.get("monitors", [])) for a in areas for mg in a.get("machineGroups", []) for m in mg.get("machines", []))
print(f"plant hala {mon_count} monitor donuyor (izin OK isareti)")

# Eger izin sorunu varsa response body ne diyor?
r = requests.get("https://plantos-dt-api.infinite-uptime.com/trend/basic-features",
                 params={"measurementLocationId": 198275,
                         "from": "2026-07-15T00:00:00Z",
                         "to":   "2026-07-15T23:59:59Z",
                         "interval": 1, "intervalUnit": "minute"},
                 headers=h, timeout=30)
print(f"\n=== 15 Temmuz tam gunlik basic status: {r.status_code} ===")
print(f"raw body (first 400 chars): {r.text[:400]}")