from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os
from pathlib import Path

class Settings(BaseSettings):
    APP_NAME: str = "Nova AI Data Analyst Engine"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Security & Authentication
    JWT_SECRET_KEY: str = "nova-super-secret-jwt-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Server & Environmention
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    # File Upload & Storage Limits
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    UPLOAD_DIR: Path = BASE_DIR / "storage" / "uploads"
    CATALOG_FILE: Path = BASE_DIR / "storage" / "datasets_catalog.json"
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: List[str] = [".csv", ".xlsx", ".xls"]

    # NVIDIA NIM AI Configuration
    NVIDIA_NIM_API_KEY: str = Field(default="", alias="NVIDIA_NIM_API_KEY")
    NVIDIA_NIM_BASE_URL: str = Field(default="https://integrate.api.nvidia.com/v1", alias="NVIDIA_NIM_BASE_URL")
    NVIDIA_NIM_MODEL: str = Field(default="meta/llama-3.1-70b-instruct", alias="NVIDIA_NIM_MODEL")

    # PostgreSQL Database Credentials
    POSTGRES_HOST: str = Field(default="localhost", alias="POSTGRES_HOST")
    POSTGRES_PORT: int = Field(default=5432, alias="POSTGRES_PORT")
    POSTGRES_USER: str = Field(default="postgres", alias="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field(default="postgres", alias="POSTGRES_PASSWORD")
    POSTGRES_DB: str = Field(default="analytics_db", alias="POSTGRES_DB")

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def init_directories(self) -> None:
        """Create necessary storage directories."""
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.init_directories()
