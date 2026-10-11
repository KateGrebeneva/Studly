from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    DB_HOST: str = "localhost"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "studly_db"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080"
    JWT_SECRET: str = "your_jwt_secret_key"
    PORT: int = 8000
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  

    @property
    def cors_origins(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]
        # фронт открывают и через localhost, и через 127.0.0.1
        for o in list(origins):
            for a, b in (("localhost", "127.0.0.1"), ("127.0.0.1", "localhost")):
                if a in o and o.replace(a, b) not in origins:
                    origins.append(o.replace(a, b))
        return origins

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
