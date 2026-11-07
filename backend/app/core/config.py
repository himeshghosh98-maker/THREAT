from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_safe_browsing_key: SecretStr | None = None
    database_url: str = "sqlite:///./artifacts/reports.db"
    cors_origins: str = "http://localhost:3000"

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
