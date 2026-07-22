
### 1. Docker Engine + Docker Compose Plugin
Docker'ın resmi apt deposu eklenerek kuruldu (Ubuntu'nun kendi deposundaki `docker.io` değil, `docker-ce` + `docker-compose-plugin`).

**Kurulum:**
```bash
sudo apt remove -y docker.io
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

**Test:**
```bash
docker --version
docker compose version
docker run hello-world
```
**Sonuç:** ✅ Başarılı — Docker Engine çalışıyor, Compose plugin `docker compose` komutuyla erişilebilir durumda, `hello-world` konteyneri sorunsuz çalıştı.

---

### 2. Python 3.11 + venv
Ubuntu 22.04'ün varsayılan deposu 3.10 verdiği için `deadsnakes` PPA eklendi.

**Kurulum:**
```bash
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev
```

**Test:**
```bash
python3.11 --version
python3.11 -m venv testenv && source testenv/bin/activate && python --version
```
**Sonuç:** ✅ Başarılı — Python 3.11 kurulu, sanal ortam (venv) sorunsuz oluşturulup aktif edildi.

---

### 3. nginx
**Kurulum:**
```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
```

**Test:**
```bash
systemctl status nginx
```
Tarayıcıdan `http://localhost` adresi kontrol edildi.
**Sonuç:** ✅ Başarılı — nginx servisi aktif, karşılama sayfası tarayıcıda görüntülendi.

---

### 4. Git
**Kurulum:**
```bash
sudo apt install -y git
```

**Test:**
```bash
git --version
```
**Sonuç:** ✅ Başarılı — `git version 2.34.1` kurulu.

---

### 5. Firewall (UFW) — Port Kuralları
DEFTR gereksinimlerine göre gerekli portlar açıldı: 22 (SSH), 80/443 (HTTPS), 8883 (MQTT/TLS Faz 3).

**Kurulum:**
```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8883/tcp
sudo ufw enable
```

**Test:**
```bash
sudo ufw status verbose
```
**Sonuç:** ✅ Başarılı — Kurallar aktif, tüm 4 port doğru şekilde listede görünüyor.

---

### 6. Kalıcı Disk
**Test:**
```bash
df -h /
```
**Sonuç:** ✅ Başarılı — Ubuntu için ayrılan bölüm 100GB minimum gereksinimin üzerinde, kullanılabilir alan yeterli.

---

## ⏳ Yapılmayan / Bekleyen Adım

### SSH Erişimi (DEFTR Ekibi — SK + DK + ZG public key'leri)
`openssh-server` kurulumu ve `authorized_keys` dosyasına ekip üyelerinin public key'lerinin eklenmesi **henüz yapılmadı**. İleride yapılacağı zaman izlenecek adımlar:

```bash
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
mkdir -p ~/.ssh && chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys   # SK, DK, ZG public key'lerini buraya ekle
chmod 600 ~/.ssh/authorized_keys
```

(Opsiyonel güvenlik sertleştirmesi: `/etc/ssh/sshd_config` içinde `PasswordAuthentication no` yapıp yalnızca key-based girişe izin vermek.)

---

## Özet Tablo

| Bileşen | Durum | Test Edildi mi |
|---|---|---|
| Docker Engine + Compose | ✅ Kuruldu | ✅ Evet |
| Python 3.11 + venv | ✅ Kuruldu | ✅ Evet |
| nginx | ✅ Kuruldu | ✅ Evet |
| git | ✅ Kuruldu | ✅ Evet |
| Firewall (22/80/443/8883) | ✅ Kuruldu | ✅ Evet |
| Kalıcı disk (100GB+) | ✅ Uygun | ✅ Evet |
| SSH erişimi (DEFTR ekibi) | ⏳ Yapılmadı | — |

**Genel durum:** SSH erişimi hariç, DEFTR gereksinimlerinin tamamı kuruldu ve test edildi. Ortam Faz 3'e (MQTT/TLS 8883 dahil) hazır durumda.
