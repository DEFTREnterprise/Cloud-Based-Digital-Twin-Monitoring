#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mock_publisher.py — CB-MDTM sahte OTOKAR telemetri ureteci (Faz 0, gorev 0.4)
============================================================================

NE YAPAR?
  Gercek OTOKAR sensor/API akisi henuz hazir olmadigi icin onun YERINE gecer.
  N adet motor icin gercekci sinyal degerleri uretir, ara ara anomali enjekte
  eder ve bu degerleri JSON olarak MQTT broker'a (Mosquitto) QoS-1 ile publish
  eder. Boylece ekip, gercek veri akiyormus gibi tum hatti kurup test edebilir.

AKISTAKI YERI:
  [BU KOD]  --MQTT publish-->  Mosquitto broker  --subscribe-->  ingest worker (SK)
            -->  TimescaleDB  -->  Query/SSE (ZG)  -->  React panel

TASARIM ILKESI:
  Sinyaller KOD degil, VERIdir. Hangi sinyallerin oldugu asagidaki CATALOG
  listesinde yasar. Yeni sinyal eklemek = CATALOG'a bir satir eklemek; kodun
  geri kalanina dokunmazsin. Bu liste, ileride yazacagin SIGNAL_CATALOG seed'i
  (gorev 1.1.3) ile AYNI olmalidir.

CALISTIRMA (en basit):
  python mock_publisher.py --broker localhost --username <kullanici> --password <sifre>

Durdurmak icin: Ctrl+C
"""

from __future__ import annotations  # tip ipuclarinda ileri-referans icin (eski Python uyumu)

import argparse          # komut satiri parametrelerini (--rate, --motors ...) okumak icin
import json              # Python sozlugunu JSON metnine cevirmek icin
import sys               # cikis/yazdirma kontrolu icin
import time              # zamanlama (saniyede 1 mesaj ritmi) ve uyku icin
from dataclasses import dataclass        # kisa, temiz veri siniflari tanimlamak icin
from datetime import datetime, timezone, timedelta  # UTC zaman damgasi uretmek icin

import numpy as np       # random-walk uretimi icin (vektorel, hizli rastgelelik)

# paho-mqtt: MQTT publish/subscribe kutuphanesi. 1.x ve 2.x API'si farkli oldugu
# icin asagida iki surumu de destekleyen kucuk bir uyum katmani var.
import paho.mqtt.client as mqtt


# ===========================================================================
# 1) SINYAL KATALOGU  --  EN COK DOKUNACAGIN YER
# ===========================================================================
# Her satir bir sinyalin nasil davranacagini anlatir. Yeni bir sinyal eklemek
# istersen (ornegin robot kolu icin "position" veya "acceleration") sadece
# buraya yeni bir SignalSpec satiri ekle. Baska hicbir yeri degistirmen gerekmez.

@dataclass
class SignalSpec:
    code: str        # sinyal kodu  -> SIGNAL_CATALOG.signal_code ile BIREBIR ayni olmali
    unit: str        # birim (ornegin "degC", "g", "rpm")
    mean: float      # normal calismadaki ortalama deger (degerin etrafinda gezindigi merkez)
    sigma: float     # her adimdaki rastgele gurultunun buyuklugu (ne kadar dalgalanir)
    reversion: float # ortalamaya geri cekme gucu: 0 = serbest suruklenir, 1 = aninda ortalamaya doner
    lo: float        # fiziksel ALT sinir (deger bunun altina inmez)
    hi: float        # fiziksel UST sinir (deger bunun ustune cikmaz)
    warn: float      # uyari esigi  (panelde sari cizgi; SIGNAL_CATALOG'a da gider)
    critical: float  # kritik esik  (panelde kirmizi cizgi)


CATALOG: list[SignalSpec] = [
    # code           unit    mean    sigma  reversion  lo     hi    warn   critical
    SignalSpec("temperature", "degC",   65.0,   0.8,   0.05,    40.0,  95.0,  80.0,  90.0),
    SignalSpec("vibration",   "g",       1.2,   0.05,  0.08,     0.0,   8.0,   3.5,   5.0),
    SignalSpec("speed",       "rpm",  1450.0,   8.0,   0.05,     0.0, 3000.0, 2500.0, 2800.0),
    # --- Yeni sinyal ornegi (robot kolu konumu). Acmak istersen yorumu kaldir: ---
    # SignalSpec("position",  "mm",      0.0,   2.0,   0.02,  -500.0,  500.0,  450.0,  490.0),
    # SignalSpec("acceleration","m/s2",  0.0,   0.3,   0.10,   -20.0,   20.0,   15.0,   18.0),
]


# ===========================================================================
# 2) KANAL DURUMU  --  her (motor, sinyal) ciftinin anlik hali
# ===========================================================================
# Bir "kanal" = belirli bir motorun belirli bir sinyali (orn. MOTOR_03'un sicakligi).
# Her kanalin kendi son degeri ve aktif senaryosu vardir; bu yuzden ayri tutariz.

@dataclass
class Channel:
    spec: SignalSpec          # bu kanal hangi sinyal tipinde (yukaridaki CATALOG'dan)
    value: float              # kanalin SON uretilen degeri (bir sonraki adimin baslangici)
    scenario: str = "normal"  # aktif senaryo: "normal" | "spike" | "drift"
    ticks_left: int = 0       # aktif senaryo daha kac adim (saniye) surecek
    drift_peak: float = 0.0   # "drift" senaryosunda yavasca ulasilacak tepe deger


def build_farm(n_motors: int) -> dict[int, list[Channel]]:
    """Her motor icin, CATALOG'daki tum sinyallere birer kanal olusturur.
    Donus: { motor_no -> [Channel, Channel, ...] }  (motorlar 1..n_motors)."""
    farm: dict[int, list[Channel]] = {}
    for motor_id in range(1, n_motors + 1):
        # Her kanali, ilgili sinyalin ortalama degerinden baslatiyoruz (saglikli baslangic).
        farm[motor_id] = [Channel(spec=s, value=s.mean) for s in CATALOG]
    return farm


# ===========================================================================
# 3) DEGER URETIMI  --  random-walk + ortalamaya geri cekme + senaryo etkisi
# ===========================================================================

def advance(ch: Channel, rng: np.random.Generator) -> float:
    """Bir kanali tek adim ilerletir ve yeni degeri dondurur."""
    s = ch.spec

    # (a) TEMEL HAREKET: random-walk + mean reversion.
    #     - mean reversion: deger kendi ortalamasina dogru hafifce cekilir.
    #       Bu olmazsa saf random-walk zamanla sinirsiz suruklenir (200 dereceye gider).
    #     - noise: ustune kucuk rastgele bir adim eklenir ki gercek sensor gibi titresin.
    drift_term = s.reversion * (s.mean - ch.value)
    noise = rng.normal(0.0, s.sigma)
    ch.value += drift_term + noise

    # (b) SENARYO ETKISI: kanal bir anomali senaryosundaysa, onun etkisini uygula.
    if ch.scenario == "spike" and ch.ticks_left > 0:
        # ANI SICRAMA: degeri kritik esigin uzerine firlatir (1-3 adim surer).
        ch.value = s.critical + abs(rng.normal(s.sigma * 5, s.sigma * 2))
        ch.ticks_left -= 1
        if ch.ticks_left == 0:
            ch.scenario = "normal"

    elif ch.scenario == "drift" and ch.ticks_left > 0:
        # KADEMELI SAPMA: degeri yavasca tepe noktasina (drift_peak) dogru cek.
        #   Senin tarif ettigin senaryo: yavasca yukselip esigi asar, bir sure
        #   sonra senaryo bitince mean reversion onu tekrar normale indirir.
        ch.value += (ch.drift_peak - ch.value) * 0.15
        ch.ticks_left -= 1
        if ch.ticks_left == 0:
            ch.scenario = "normal"  # bittikten sonra (a) adimi yavasca eski haline dondurur

    # (c) GUVENLIK: deger fiziksel sinirlarin disina tasmasin.
    ch.value = max(s.lo, min(s.hi, ch.value))
    return ch.value


def maybe_trigger(ch: Channel, spike_prob: float, drift_prob: float,
                  rng: np.random.Generator) -> None:
    """Kanal su an normalse, kucuk bir olasilikla yeni bir anomali senaryosu baslatir."""
    if ch.scenario != "normal":
        return  # zaten bir senaryo calisiyorsa yenisini baslatma
    r = rng.random()
    if r < spike_prob:
        ch.scenario = "spike"
        ch.ticks_left = int(rng.integers(1, 4))           # 1-3 adimlik ani spike
    elif r < spike_prob + drift_prob:
        ch.scenario = "drift"
        ch.ticks_left = int(rng.integers(20, 60))          # 20-59 saniyelik yavas tirmanma
        ch.drift_peak = ch.spec.critical * rng.uniform(1.02, 1.15)  # esigi biraz asan tepe


# ===========================================================================
# 4) MESAJ (PAYLOAD) OLUSTURMA  --  MQTT'ye basilacak JSON
# ===========================================================================
# Bu JSON, tum sistemin "ortak dili"dir. ingest worker'in dogrulayacagi TelemetryIn
# modeli ve TELEMETRY_MEASUREMENTS tablosu bu alanlarla eslesir. Alan adlarini
# degistirirsen worker (SK) ile mutlaka birlikte degistirin.

def build_payload(motor_id: int, channels: list[Channel], source: str,
                  ts: datetime) -> dict:
    return {
        "schema_version": "1.0",                  # ileride format degisirse ayirt etmek icin
        "dt_id": "OTOKAR_CORE",                    # hangi dijital ikiz (DT_REGISTRY ile eslesir)
        "asset_code": f"MOTOR_{motor_id:02d}",     # hangi varlik (ASSET_REGISTRY.asset_code -> MOTOR_01..)
        "source": source,                          # verinin kaynagi: REAL (mock, gercek OTOKAR'i temsilen)
        "ts_utc": ts.isoformat().replace("+00:00", "Z"),  # olcum zamani, UTC, ISO-8601 (..Z)
        "readings": [                              # bu motorun o anki tum sinyal okumalari
            {
                "signal_code": ch.spec.code,       # sinyal kodu (SIGNAL_CATALOG ile eslesir)
                "value": round(ch.value, 3),       # deger (3 ondalik yeterli)
                "unit": ch.spec.unit,              # birim
            }
            for ch in channels
        ],
    }


# ===========================================================================
# 5) MQTT BAGLANTISI  --  paho-mqtt 1.x ve 2.x icin uyumlu kurulum
# ===========================================================================

def make_client(args) -> mqtt.Client:
    """MQTT istemcisini olusturur, kullanici/sifre ayarini yapar ve geri cagri
    (callback) fonksiyonlarini baglar."""

    # paho-mqtt 2.x yeni bir imza ister; 1.x eski imza kullanir. Ikisini de destekle:
    try:
        client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,          # paho-mqtt 2.x
            client_id="cbmdtm-mock-publisher",
        )
    except AttributeError:
        client = mqtt.Client(client_id="cbmdtm-mock-publisher")  # paho-mqtt 1.x

    # Mosquitto'da allow_anonymous=false ayarliysa (gorev 0.1.3) kullanici/sifre zorunlu.
    if args.username:
        client.username_pw_set(args.username, args.password)

    # Baglanti kurulunca / koptugunda kisa bilgi yazdiran callback'ler.
    # *args sayesinde hem 1.x hem 2.x imzasiyla calisir.
    def on_connect(client, userdata, flags, rc, *_):
        print(f"[MQTT] baglandi (sonuc: {rc})", flush=True)

    def on_disconnect(client, userdata, *_):
        print("[MQTT] baglanti koptu", flush=True)

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    return client


# ===========================================================================
# 6) KOMUT SATIRI PARAMETRELERI
# ===========================================================================

def parse_args():
    p = argparse.ArgumentParser(description="CB-MDTM sahte OTOKAR telemetri ureteci")
    # --- Baglanti ---
    p.add_argument("--broker", default="localhost", help="MQTT broker adresi")
    p.add_argument("--port", type=int, default=1883, help="MQTT broker portu")
    p.add_argument("--username", default=None, help="MQTT kullanici adi (auth aciksa gerekir)")
    p.add_argument("--password", default=None, help="MQTT sifresi")
    # --- Yuk / olcek ---
    p.add_argument("--motors", type=int, default=12, help="Kac motor simule edilecek")
    p.add_argument("--rate", type=float, default=1.0, help="Motor basina saniyedeki mesaj sayisi (Hz)")
    p.add_argument("--topic-prefix", default="factory/motor",
                   help="Topic onu (sonuna /{id}/telemetry eklenir)")
    p.add_argument("--qos", type=int, default=1, choices=[0, 1, 2],
                   help="MQTT teslimat seviyesi (kayipsizlik icin 1)")
    p.add_argument("--duration", type=float, default=None,
                   help="Kac saniye calissin (bos birakirsan suresiz)")
    p.add_argument("--seed", type=int, default=None,
                   help="Rastgelelik tohumu (ayni tohum = ayni veri, tekrar uretilebilirlik)")
    # --- Anomali senaryolari (kanal basina, her adimda) ---
    p.add_argument("--spike-prob", type=float, default=0.002, help="Ani spike olasiligi")
    p.add_argument("--drift-prob", type=float, default=0.001, help="Kademeli sapma olasiligi")
    # --- Dayaniklilik testleri (Faz 3/4 icin; varsayilan KAPALI) ---
    p.add_argument("--drop-rate", type=float, default=0.0,
                   help="[Faz3] Mesaj dusurme olasiligi (kayip simulasyonu)")
    p.add_argument("--lag-prob", type=float, default=0.0,
                   help="[Faz3] Mesaji gecmis zaman damgasiyla gonderme olasiligi (gecikme simulasyonu)")
    return p.parse_args()


# ===========================================================================
# 7) ANA DONGU  --  belirli ritimde tum motorlar icin mesaj uret ve publish et
# ===========================================================================

def main():
    args = parse_args()

    # Rastgelelik ureteci. seed verilirse her calismada AYNI veri uretilir (testler icin faydali).
    rng = np.random.default_rng(args.seed)

    farm = build_farm(args.motors)   # tum motor/sinyal kanallari
    client = make_client(args)
    client.connect(args.broker, args.port)
    client.loop_start()              # ag isini arka planda yapan thread'i baslat

    period = 1.0 / args.rate         # iki tur arasindaki hedef sure (sn). rate=1 -> 1 sn.
    next_tick = time.monotonic()     # bir sonraki turun hedef zamani (kayan saat)
    start = time.monotonic()
    last_report = start
    published = 0
    dropped = 0

    print(f"[BASLA] {args.motors} motor x {args.rate} Hz, topic '{args.topic_prefix}/<id>/telemetry', "
          f"QoS-{args.qos}. Durdurmak icin Ctrl+C.", flush=True)

    try:
        while True:
            now = datetime.now(timezone.utc)   # bu turun gercek zamani (UTC)

            # --- Tum motorlar icin bir adim uret ve publish et ---
            for motor_id, channels in farm.items():
                # 1) Her kanali ilerlet (gerekirse yeni senaryo tetikle):
                for ch in channels:
                    maybe_trigger(ch, args.spike_prob, args.drift_prob, rng)
                    advance(ch, rng)

                # 2) [Faz3] Kayip simulasyonu: kucuk olasilikla bu mesaji hic gonderme.
                if args.drop_rate > 0 and rng.random() < args.drop_rate:
                    dropped += 1
                    continue

                # 3) [Faz3] Gecikme simulasyonu: kucuk olasilikla zaman damgasini geriye al
                #    (worker bunu ingest_lag yuksek gorup QUALITY_FLAG=DELAYED isaretler).
                ts = now
                if args.lag_prob > 0 and rng.random() < args.lag_prob:
                    ts = now - timedelta(seconds=float(rng.uniform(3, 10)))

                # 4) JSON mesaji olustur ve publish et.
                topic = f"{args.topic_prefix}/{motor_id:02d}/telemetry"
                payload = build_payload(motor_id, channels, source="REAL", ts=ts)
                client.publish(topic, json.dumps(payload), qos=args.qos)
                published += 1

            # --- Periyodik durum yazdir (her ~5 sn) ---
            if time.monotonic() - last_report >= 5.0:
                print(f"[DURUM] gonderilen={published}  dusurulen={dropped}", flush=True)
                last_report = time.monotonic()

            # --- Sure dolduysa cik ---
            if args.duration is not None and (time.monotonic() - start) >= args.duration:
                break

            # --- Ritmi koru: bir sonraki tura kadar uyu ---
            next_tick += period
            sleep_for = next_tick - time.monotonic()
            if sleep_for > 0:
                time.sleep(sleep_for)
            else:
                # Geri kaldiysak (sistem yavasladi), saati simdiye hizala ki birikme olmasin.
                next_tick = time.monotonic()

    except KeyboardInterrupt:
        print("\n[DUR] Ctrl+C alindi, kapatiliyor...", flush=True)
    finally:
        client.loop_stop()
        client.disconnect()
        print(f"[BITTI] toplam gonderilen={published}  dusurulen={dropped}", flush=True)


if __name__ == "__main__":
    main()
