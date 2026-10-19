from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./desk.db"
    SECRET_KEY: str = "dev-secret-key-change-this-in-production-32-bytes"
    TOKEN_TTL_MINUTES: int = 60
    PASSWORD_ITERATIONS: int = 600000
    ENVIRONMENT: str = "development"
    RATE_LIMIT_ENABLED: bool = True
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
