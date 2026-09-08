from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days (10080 minutes)

    API_ORIGIN: str

    model_config=SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()