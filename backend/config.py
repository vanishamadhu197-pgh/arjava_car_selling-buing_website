import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "AK Cars API"
    PROJECT_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    # Database Configuration
    # Supports PostgreSQL (e.g. postgresql://user:password@localhost:5432/ak_cars)
    # Defaults to local SQLite if PostgreSQL URL is not configured
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./ak_cars.db"
    )

    # Media / File Storage Configuration
    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: list = ["image/jpeg", "image/png", "image/webp", "image/jpg"]

    # Security & CORS
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ak_cars_super_secret_development_key_2026")
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

settings = Settings()
