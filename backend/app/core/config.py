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
    DB_PASSWORD: str = "DEFTRServer1"  # Change this to your actual password

    # --- SSE / KPI ---
    SSE_KEEPALIVE_SECONDS: int = 15
    KPI_WINDOW_HOURS: int = 1

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()