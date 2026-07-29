Konuşma metni
Açılış — ne kanıtladık

"Bugün gösterdiğimiz şey şu: Otokar sahasındaki Infinite Uptime sensörlerinden gelen veri, bulut tabanlı izleme platformumuza kayıpsız, kalite damgalı ve canlı olarak akıyor. Zincirin tamamı çalışır durumda."

Zincir — teknik akış

"Veri şu yolu izliyor: IU bulut API'si → köprü servisimiz → MQTT broker → ingest worker → TimescaleDB → REST/SSE API → arayüz.

Köprü mimarisini bilinçli seçtik: IU'ya özgü mantık tek bir dosyada izole, arkasındaki hiçbir bileşen kaynağı tanımıyor. Yarın başka bir sensör sistemi geldiğinde sadece köprüyü yazıyoruz, platform aynı kalıyor."

Rakamlar — psql çıktısını göster

"12 monitörden 24 sinyal alıyoruz. Altısı dakikalık temel ölçüm, on sekizi otuz dakikalık hesaplanmış özellik. Son bir saatte temel sinyallerin her birinde 420 kayıt — kesintisiz."

(ekranda accel_total | (m/s2)^2, acoustic_db | dB, vibration_x | mm/s satırlarını göster)

Dün yaptığımız düzeltme — bu en güçlü kısım

"Burada bir noktayı özellikle paylaşmak istiyorum, çünkü metodolojimizi gösteriyor.

Sinyal sözlüğünü başlangıçta IU dokümantasyonundan ve değer aralıklarından çıkarımla oluşturmuştuk. Dün Taha Bey'e yazılı teyit için başvurduk ve iki hatamız çıktı:

Birincisi, 0001 kodlu sinyali yerçekimi ivmesi birimi sanıyorduk. Gerçekte ivmenin karesi — eksen katkılarının kareler toplamı. Ham değeri yanlış birimle saklasaydık her kayıt karesi kadar hatalı olacaktı.

İkincisi, 0006 kodlu sinyali yatak sıcaklığı varsaymıştık. Gerçekte akustik ses seviyesi, desibel. Yani hem birim hem fiziksel anlam yanlıştı; sinyal kodunu da değiştirdik.

Bunu bir migration olarak kayıt altına aldık, geri alınabilir şekilde. Çıkardığımız ders şu: dış sistem entegrasyonunda sözlük varsayımı yapılmaz, sistem sahibinden yazılı teyit alınır. Bu disiplini Ankara kurulumunda da uygulayacağız."

Kalite modeli — Data Quality %100'ü açıkla

"Ekrandaki veri kalitesi göstergesi %100. Ama bu sayının nasıl hesaplandığı önemli.

Başlangıçta sabit iki saniyelik bir gecikme eşiğimiz vardı. IU verisi bu eşiği hep aşıyordu ve her kayıt 'gecikmiş' damgası alıyordu. Sebebini incelediğimizde şunu gördük: ölçüm anı ile veritabanına yazım anı arasındaki fark yalnızca bizim işleme süremiz değil, kaynağın kendi ritmini de içeriyor. IU verisini bir dakikalık pencerelerde topluyor; hesaplanmış özellikleri otuz dakikada bir üretiyor.

Bu bir performans sorunu değil, dış sistemin doğası. Eşiği gevşetmek yerine sinyalin kendi beklenen periyoduna oranladık: bir sinyal, beklenen periyodunun dört katından geç geldiyse gerçekten gecikmiştir — dört tur üst üste kaçırılmış demektir. Hızlı sinyaller için taban eşik korunuyor, yani performans gereksinimimiz gevşetilmedi."

Gecikme metriği — sorulmadan sen söyle

"Gecikme göstergesi yaklaşık on yedi dakika görünüyor. Bu kaynak gecikmesi: otuz dakikalık hesaplanmış özellikler p95 değerini yukarı çekiyor. Platformun kendi işleme gecikmesi milisaniye mertebesinde.

Bir sonraki iterasyonda bu ikisini ayrıştıracağız — kaynak gecikmesi ve platform gecikmesi ayrı metrikler olacak. Bu ayrım Otokar'ın kestirimci bakım tarafında doğrudan işe yarar: bir alarmın geç gelmesi sensörden mi kaynaklanıyor, platformdan mı, net görülür."

Güvenlik ve izolasyon

"Giriş Keycloak üzerinden. Ekranın sağ altında rol ve kurum bilgisi görünüyor: OTOKAR kurumu, görüntüleyici rolü. Bu kullanıcı yalnızca OTOKAR varlıklarını görebiliyor; kurum izolasyonu arayüzde değil, veritabanı sorgu katmanında uygulanıyor. Sol menüdeki modül listesi de role göre daralıyor — yönetici rolüyle girildiğinde altı modül görünüyor."

Kapanış — dürüst kapsam

"Bugün kanıtladığımız: veri zinciri uçtan uca çalışıyor, kalite modeli işliyor, yetkilendirme ve izolasyon yerinde.

Sıradaki işler: sinyal grafiklerinin canlı kayıt defterine bağlanması, kestirimci bakım uçlarının devreye alınması, ve Ankara sunucusuna kurulum. Sunucu altyapısı hazır; kurulum bu hafta içinde uzaktan yapılacak."