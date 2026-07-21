from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Application ---
    APP_NAME: str = "CB-MDTM Backend"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # --- Database ---
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "cbmdtm"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "DEFTRServer1"

    # --- SSE / KPI ---
    SSE_KEEPALIVE_SECONDS: int = 15
    KPI_WINDOW_HOURS: int = 1

    # --- Keycloak / JWT (Faz 2) ---
    KEYCLOAK_ISSUER: str = "http://localhost:8080/realms/cbmdtm"
    KEYCLOAK_JWKS_URL: str = "http://localhost:8080/realms/cbmdtm/protocol/openid-connect/certs"
    KEYCLOAK_AUDIENCE: str = "account"
    KEYCLOAK_ALGORITHM: str = "RS256"
    KEYCLOAK_VERIFY_AUDIENCE: bool = False
    JWKS_CACHE_TTL_SECONDS: int = 3600

    # --- CORS + Rate limit (Faz 2.3.2) ---
    # NOT: pydantic-settings v2 list[str] alanini JSON gibi parse etmeye
    # calisir ve validator'dan once patlar. Cozum: raw string olarak sakla,
    # property ile list expose et.
    CORS_ORIGINS_RAW: str = "http://localhost:5173"
    RATE_LIMIT_DEFAULT: str = "60/minute"
    RATE_LIMIT_ME: str = "30/minute"

    @property
    def CORS_ORIGINS(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS_RAW.split(",") if o.strip()]

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()