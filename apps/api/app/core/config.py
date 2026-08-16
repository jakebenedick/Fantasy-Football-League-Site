from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    sleeper_base_url: str = "https://api.sleeper.app/v1"
    sleeper_timeout_seconds: float = 10.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
