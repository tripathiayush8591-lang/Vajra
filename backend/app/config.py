import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")  # repo root fallback


def _bool(v: str) -> bool:
    return str(v).strip().lower() in ("1", "true", "yes", "on")


class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    OFFLINE_MODE: bool = _bool(os.getenv("OFFLINE_MODE", "false"))
    PORT: int = int(os.getenv("PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{BASE_DIR / 'data' / 'civicpulse.db'}"
    )
    MEDIA_DIR: Path = BASE_DIR / "data" / "media"
    REPORTS_DIR: Path = BASE_DIR / "data" / "reports"

    @property
    def llm_available(self) -> bool:
        return bool(self.GEMINI_API_KEY) and not self.OFFLINE_MODE


settings = Settings()
settings.MEDIA_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
Path(settings.DATABASE_URL.split("///")[-1]).parent.mkdir(parents=True, exist_ok=True)
