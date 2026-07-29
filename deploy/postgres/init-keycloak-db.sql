-- Keycloak icin ayri veritabani.
-- Bu dosya SADECE ilk `docker compose up` sirasinda, pgdata volume'u bosken
-- calisir (docker-entrypoint-initdb.d davranisi). Sonradan degistirmek
-- istersen volume'u silmen ya da elle CREATE DATABASE calistirman gerekir.
--
-- Dev ortamda da ayni desen kullaniliyordu (PG'de 'keycloak' DB).

CREATE DATABASE keycloak;
