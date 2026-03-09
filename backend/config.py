from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    DB_HOST: str = "localhost"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "studly_db"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:8080"
    JWT_SECRET: str = "your_jwt_secret_key"
    PORT: int = 3000
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
