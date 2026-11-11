from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AI_", extra="ignore")

    provider: str = "mock"
    host: str = "0.0.0.0"
    port: int = 8000


settings = Settings()
