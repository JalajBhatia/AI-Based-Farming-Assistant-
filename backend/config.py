"""Load configuration from environment."""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    APP_NAME = os.getenv("APP_NAME", "FarmSaathi")
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-change-me-in-production")
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    PORT = int(os.getenv("PORT", "5000"))

    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASS = os.getenv("MYSQL_PASS", "")
    MYSQL_DB = os.getenv("MYSQL_DB", "farming_db")

    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
    NASA_TOKEN = os.getenv("NASA_TOKEN")
    AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY")

    JWT_SECRET = os.getenv("JWT_SECRET", SECRET_KEY)
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRY_DAYS = int(os.getenv("JWT_EXPIRY_DAYS", "30"))

    AUTH_MODE = os.getenv("AUTH_MODE", "local")

    UPLOAD_FOLDER = str(BASE_DIR / "uploads")
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024

    # Model loading with pathlib - always use absolute paths
    _models_dir = BASE_DIR / "models"
    
    # Try models/model.h5 first, then models/plant_disease_model.h5
    _model_candidates = [
        _models_dir / "model.h5",
        _models_dir / "plant_disease_model.h5",
    ]
    
    MODEL_PATH = None
    for candidate in _model_candidates:
        if candidate.exists():
            MODEL_PATH = str(candidate.resolve())
            break
    
    if MODEL_PATH is None:
        MODEL_PATH = str((_models_dir / "model.h5").resolve())
    
    print(f"DEBUG CONFIG: MODEL_PATH={MODEL_PATH}", file=sys.stderr)
    print(f"DEBUG CONFIG: MODEL_PATH exists={Path(MODEL_PATH).exists()}", file=sys.stderr)

    _class_names_path = _models_dir / "class_names.json"
    CLASS_NAMES_PATH = str(_class_names_path.resolve())
    print(f"DEBUG CONFIG: CLASS_NAMES_PATH={CLASS_NAMES_PATH}", file=sys.stderr)
    print(f"DEBUG CONFIG: CLASS_NAMES_PATH exists={_class_names_path.exists()}", file=sys.stderr)
