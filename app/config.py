from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./desk.db"
    SECRET_KEY: str = "dev-secret-key-change-this-in-production-32-bytes"
    TOKEN_TTL_MINUTES: int = 60
    PASSWORD_ITERATIONS: int = 600000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
