"""
iu_explorer.py — Infinite Uptime API kesif scripti (GECICI, kod repo'ya girmeyecek)

Amac: IU'ya login olup Sakarya plant (1716) icin:
  1) Plant hiyerarsisini (area/machineGroup/machine/monitor) dok
  2) 12 monitor icin son basic-features + computed-features cek
  3) Cikan payload'lari 'iu_snapshot.json'a yaz (feature sozlugu icin)

Kredantiyalleri komut satiri argumani olarak veya cevre degiskeninden okur.

Kullanim:
    python tools\iu_explorer.py --username <email> --password <sifre>
    # veya
    $env:IU_USERNAME='...'; $env:IU_PASSWORD='...'
    python tools\iu_explorer.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

IDAP_BASE = "https://api.infinite-uptime.com/api/3.0/idap-api"
PLANTOS_BASE = "https://plantos-dt-api.infinite-uptime.com"
PLANT_ID = 1716


def login(username: str, password: str) -> str:
    r = requests.post(
        f"{IDAP_BASE}/login",
        json={"username": username, "password": password},
        headers={"Accept": "application/json"},
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    token = data.get("accessToken") or data.get("access_token")
    if not token:
        token = (data.get("data") or {}).get("accessToken")
    if not token:
        raise RuntimeError(f"accessToken bulunamadi. Yanit: {json.dumps(data)[:500]}")
    print(f"[OK] login basarili, token uzunluk: {len(token)}", flush=True)
    return token


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


def get_plant_tree(token: str) -> dict:
    print(f"\n[REQ] GET /plants/{PLANT_ID}", flush=True)
    r = requests.get(
        f"{IDAP_BASE}/plants/{PLANT_ID}",
        headers=auth_headers(token),
        timeout=30,
    )
    r.raise_for_status()
    payload = r.json()
    body = payload.get("data", payload)
    # Kisa ozet
    for area in body.get("areas", []):
        print(f"  area: {area.get('name')}", flush=True)
        for mg in area.get("machineGroups", []):
            print(f"    mg: {mg.get('name')}", flush=True)
            for machine in mg.get("machines", []):
                print(f"      machine: {machine.get('name')}", flush=True)
                for mon in machine.get("monitors", []):
                    print(
                        f"        monitor id={mon.get('id')} "
                        f"name={mon.get('name')} "
                        f"device={mon.get('deviceIdentifier')} "
                        f"health={mon.get('healthScore')} "
                        f"status={mon.get('status')}",
                        flush=True,
                    )
    return payload


def get_basic_features(token: str, monitor_id: int, lookback_minutes: int = 60) -> list:
    now = datetime.now(timezone.utc)
    params = {
        "measurementLocationId": monitor_id,
        "from": (now - timedelta(minutes=lookback_minutes)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "to": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "interval": 1,
        "intervalUnit": "minute",
    }
    r = requests.get(
        f"{PLANTOS_BASE}/trend/basic-features",
        params=params,
        headers=auth_headers(token),
        timeout=30,
    )
    r.raise_for_status()
    body = r.json()
    return body if isinstance(body, list) else body.get("data", [])


def get_computed_features(token: str, monitor_id: int, lookback_hours: int = 2) -> list:
    now = datetime.now(timezone.utc)
    params = {
        "monitorId": monitor_id,
        "from": (now - timedelta(hours=lookback_hours)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "to": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    r = requests.get(
        f"{IDAP_BASE}/trend/computed-features",
        params=params,
        headers=auth_headers(token),
        timeout=30,
    )
    r.raise_for_status()
    body = r.json()
    return body.get("data", []) if isinstance(body, dict) else body


def extract_monitor_ids(plant_tree: dict) -> list[dict]:
    """Plant tree'den (monitor_id, machine_name, monitor_name) tuple'lari cikar."""
    body = plant_tree.get("data", plant_tree)
    mons = []
    for area in body.get("areas", []):
        for mg in area.get("machineGroups", []):
            for machine in mg.get("machines", []):
                for mon in machine.get("monitors", []):
                    mons.append({
                        "id": mon.get("id"),
                        "name": mon.get("name"),
                        "machine": machine.get("name"),
                        "healthScore": mon.get("healthScore"),
                        "status": mon.get("status"),
                        "deviceIdentifier": mon.get("deviceIdentifier"),
                    })
    return mons


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--username", default=os.getenv("IU_USERNAME"))
    ap.add_argument("--password", default=os.getenv("IU_PASSWORD"))
    ap.add_argument("--out", default="iu_snapshot.json")
    args = ap.parse_args()

    if not args.username or not args.password:
        print("HATA: --username / --password veya IU_USERNAME / IU_PASSWORD gerekli", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] IU'ya login: {args.username}", flush=True)
    token = login(args.username, args.password)

    print(f"\n[INFO] Plant tree cekiliyor (plant_id={PLANT_ID})", flush=True)
    plant_tree = get_plant_tree(token)

    monitors = extract_monitor_ids(plant_tree)
    print(f"\n[INFO] {len(monitors)} monitor bulundu.", flush=True)

    # Her monitor icin son basic + computed cek
    snapshot: dict = {
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "plant_id": PLANT_ID,
        "plant_tree": plant_tree,
        "monitors": [],
    }

    for mon in monitors:
        mon_id = mon["id"]
        print(f"\n[MON {mon_id}] {mon['machine']} / {mon['name']}", flush=True)

        try:
            basic = get_basic_features(token, mon_id, lookback_minutes=60)
            print(f"  basic-features: {len(basic)} kayit", flush=True)
            if basic:
                latest = basic[-1]
                print(f"    son time: {latest.get('time')}", flush=True)
                # jsonAvg'i parse et
                raw = latest.get("jsonAvg")
                if raw and raw not in ("null", "nan", ""):
                    parsed = json.loads(raw) if isinstance(raw, str) else raw
                    print(f"    jsonAvg keys: {sorted(parsed.keys())}", flush=True)
        except Exception as e:
            print(f"  basic-features PATLADI: {e}", flush=True)
            basic = []

        try:
            computed = get_computed_features(token, mon_id, lookback_hours=2)
            print(f"  computed-features: {len(computed)} kayit", flush=True)
            if computed:
                latest = computed[-1]
                print(f"    son timestamp: {latest.get('timestamp')}", flush=True)
                # Hangi alanlar dolu?
                filled = [k for k, v in latest.items() if v is not None and k != "timestamp"]
                print(f"    dolu alanlar: {filled[:15]}...", flush=True)
        except Exception as e:
            print(f"  computed-features PATLADI: {e}", flush=True)
            computed = []

        snapshot["monitors"].append({
            "meta": mon,
            "basic_features_sample": basic[-5:] if basic else [],  # son 5 kayit yeter
            "computed_features_sample": computed[-5:] if computed else [],
        })

    out_path = Path(args.out).resolve()
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)
    print(f"\n[DONE] Snapshot yazildi: {out_path}", flush=True)
    print(f"       Dosya boyutu: {out_path.stat().st_size // 1024} KB", flush=True)


if __name__ == "__main__":
    main()