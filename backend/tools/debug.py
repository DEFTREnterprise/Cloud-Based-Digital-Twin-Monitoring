"""iu_debug.py — Ham yaniti disk'e dok, yapiyi gorelim."""
import json
import os
import sys
from pathlib import Path

import requests

IDAP_BASE = "https://api.infinite-uptime.com/api/3.0/idap-api"

username = os.getenv("IU_USERNAME")
password = os.getenv("IU_PASSWORD")
if not username or not password:
    sys.exit("IU_USERNAME / IU_PASSWORD env vars gerekli")

# Login
r = requests.post(
    f"{IDAP_BASE}/login",
    json={"username": username, "password": password},
    headers={"Accept": "application/json"},
    timeout=30,
)
r.raise_for_status()
data = r.json()
token = data.get("accessToken") or data.get("access_token") or (data.get("data") or {}).get("accessToken")
print(f"Login OK, token len={len(token)}")
print(f"Login response top-level keys: {list(data.keys())}")
# Login response'un tamami (token disinda kullanici bilgisi de olabilir)
Path("iu_login_response.json").write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

h = {"Authorization": f"Bearer {token}", "Accept": "application/json"}

# Plant listesi — hangi plant'lere erisimin var?
print("\n[1] GET /plants (tum erisilebilir plant'ler)")
try:
    r = requests.get(f"{IDAP_BASE}/plants", headers=h, timeout=30)
    print(f"    status: {r.status_code}")
    if r.ok:
        Path("iu_plants_list.json").write_text(r.text, encoding="utf-8")
        body = r.json()
        # kaba ozet
        if isinstance(body, dict):
            print(f"    top-level keys: {list(body.keys())}")
            data_field = body.get("data", body)
        else:
            data_field = body
        if isinstance(data_field, list):
            print(f"    plant count: {len(data_field)}")
            for p in data_field[:10]:
                print(f"      id={p.get('id')} name={p.get('name')}")
    else:
        print(f"    body: {r.text[:300]}")
except Exception as e:
    print(f"    HATA: {e}")

# Plant 1716 — Sakarya (bilinen)
print("\n[2] GET /plants/1716 (Sakarya)")
try:
    r = requests.get(f"{IDAP_BASE}/plants/1716", headers=h, timeout=30)
    print(f"    status: {r.status_code}")
    if r.ok:
        Path("iu_plant_1716.json").write_text(r.text, encoding="utf-8")
        body = r.json()
        if isinstance(body, dict):
            print(f"    top-level keys: {list(body.keys())}")
            # 'data' veya kokte anahtarlari incele
            for key_path in (["data"], ["data", "areas"], ["areas"], ["data", "plant", "areas"]):
                cur = body
                ok = True
                for k in key_path:
                    if isinstance(cur, dict) and k in cur:
                        cur = cur[k]
                    else:
                        ok = False
                        break
                if ok:
                    print(f"    path {'.'.join(key_path)}: type={type(cur).__name__}, "
                          f"len={len(cur) if hasattr(cur, '__len__') else 'n/a'}")
        # Ilk 500 karakter ekrana da bas
        print(f"    body preview: {r.text[:500]}")
    else:
        print(f"    body: {r.text[:500]}")
except Exception as e:
    print(f"    HATA: {e}")

print("\n[DONE] iu_login_response.json, iu_plants_list.json, iu_plant_1716.json yazildi.")