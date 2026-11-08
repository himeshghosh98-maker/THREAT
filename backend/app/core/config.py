from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    chain_mode: Literal["local", "sepolia"] = "local"
    local_rpc_url: str = "http://127.0.0.1:8545"
    contract_address: str | None = None
    deployer_private_key: SecretStr | None = None
    sepolia_rpc_url: SecretStr | None = None
    llm_provider: Literal["anthropic", "openai", "gemini"] = "anthropic"
    anthropic_model: str = "claude-haiku-5-5"
    openai_model: str = "gpt-4.1-mini"
    gemini_model: str = "gemini-3.5-flash"
    anthropic_api_key: SecretStr | None = None
    openai_api_key: SecretStr | None = None
    gemini_api_key: SecretStr | None = None
    google_safe_browsing_key: SecretStr | None = None
    database_url: str = "sqlite:///./artifacts/reports.db"
    cors_origins: str = "http://localhost:3000"

    @property
    def provider_key(self) -> SecretStr | None:
        return getattr(self, self.llm_provider + "_api_key")

    @property
    def provider_model(self) -> str:
        return getattr(self, self.llm_provider + "_model")

    @property
    def sensitive_values(self):
        return (self.anthropic_api_key, self.openai_api_key, self.gemini_api_key, self.google_safe_browsing_key,
                self.deployer_private_key, self.sepolia_rpc_url)

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
