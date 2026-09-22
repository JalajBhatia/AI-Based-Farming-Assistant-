"""Flask entry — FarmSaathi API."""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, jsonify, render_template, send_from_directory

from config import Config
from database import close_db, init_db
from routes.ai_advisor import ai_advisor_bp
from routes.assistant import assistant_bp
from routes.auth import auth_bp
from routes.community import community_bp
from routes.disease import disease_bp
from routes.farmer import farmer_bp
from routes.finance import build_subsidies_response, finance_bp
from routes.mandi import mandi_bp
from routes.ndvi import ndvi_bp
from routes.profile import profile_bp
from routes.recommendation import recommendation_bp
from routes.voice import voice_bp
from routes.weather import weather_bp

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"


def create_app() -> Flask:
    app = Flask(
        __name__,
        static_folder="../frontend",
        static_url_path="",
        template_folder="../templates",
    )
    app.config.from_object(Config)
    app.config["MODEL_PATH"] = str(Config.MODEL_PATH)
    app.config["CLASS_NAMES_PATH"] = str(Config.CLASS_NAMES_PATH)
    app.config["OPENWEATHER_API_KEY"] = Config.OPENWEATHER_API_KEY
    app.config["AGMARKNET_API_KEY"] = Config.AGMARKNET_API_KEY
    app.config["NASA_TOKEN"] = Config.NASA_TOKEN
    app.config["JWT_SECRET"] = Config.JWT_SECRET
    app.config["JWT_ALGORITHM"] = Config.JWT_ALGORITHM
    app.config["JWT_EXPIRY_DAYS"] = Config.JWT_EXPIRY_DAYS
    app.config["MYSQL_HOST"] = Config.MYSQL_HOST
    app.config["MYSQL_PORT"] = Config.MYSQL_PORT
    app.config["MYSQL_USER"] = Config.MYSQL_USER
    app.config["MYSQL_PASS"] = Config.MYSQL_PASS
    app.config["MYSQL_DB"] = Config.MYSQL_DB

    print(f"DEBUG: BASE_DIR={BASE_DIR}", file=sys.stderr)
    print(f"DEBUG: FRONTEND_DIR={FRONTEND_DIR}", file=sys.stderr)
    print(f"DEBUG: CWD={os.getcwd()}", file=sys.stderr)
    print(f"DEBUG: MODEL_PATH={app.config['MODEL_PATH']}", file=sys.stderr)
    print(
        f"DEBUG: MODEL_PATH exists={os.path.exists(app.config['MODEL_PATH'])}",
        file=sys.stderr,
    )
    print(f"DEBUG: CLASS_NAMES_PATH={app.config['CLASS_NAMES_PATH']}", file=sys.stderr)
    print(
        f"DEBUG: CLASS_NAMES_PATH exists={os.path.exists(app.config['CLASS_NAMES_PATH'])}",
        file=sys.stderr,
    )

    Path(Config.UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
    for sub in ("disease_images", "community_images"):
        Path(Config.UPLOAD_FOLDER, sub).mkdir(parents=True, exist_ok=True)

    from flask_cors import CORS

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": "*",
                "supports_credentials": True,
            }
        },
    )

    init_db(app)

    if not Path(Config.MODEL_PATH).exists():
        print(
            f"WARNING: Model file not found ({Config.MODEL_PATH}) — disease prediction returns 503. "
            "Place model.h5 in backend/models/ or set MODEL_PATH / MODEL_FILE in .env.",
            file=sys.stderr,
        )

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(farmer_bp, url_prefix="/api/farmer")
    app.register_blueprint(disease_bp, url_prefix="/api/disease")
    app.register_blueprint(weather_bp, url_prefix="/api/weather")
    app.register_blueprint(mandi_bp, url_prefix="/api/mandi")
    app.register_blueprint(finance_bp, url_prefix="/api/finance")
    app.register_blueprint(voice_bp, url_prefix="/api/voice")
    app.register_blueprint(community_bp, url_prefix="/api/community")
    app.register_blueprint(ndvi_bp, url_prefix="/api")
    app.register_blueprint(ai_advisor_bp, url_prefix="/api/advisor")
    app.register_blueprint(assistant_bp, url_prefix="/api/assistant")
    app.register_blueprint(profile_bp, url_prefix="/api/profile")
    app.register_blueprint(recommendation_bp, url_prefix="/api")

    app.add_url_rule("/api/subsidies", "api_subsidies", build_subsidies_response, methods=["GET"])

    @app.route("/api/config", methods=["GET"])
    def public_config():
        return jsonify(
            {
                "app_name": Config.APP_NAME,
                "google_client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            }
        )

    @app.route("/uploads/<path:subpath>", methods=["GET"])
    def serve_upload(subpath):
        return send_from_directory(BASE_DIR / "uploads", subpath, as_attachment=False)

    @app.route("/health", methods=["GET"])
    def health():
        return {"status": "ok", "app": Config.APP_NAME}

    @app.route("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.route("/voice.html")
    def voice_page():
        return render_template("voice.html")

    @app.route("/<path:path>")
    def serve_frontend(path):
        if path == "voice.html":
            return render_template("voice.html")
        file_path = FRONTEND_DIR / path
        if file_path.exists() and file_path.is_file():
            return send_from_directory(FRONTEND_DIR, path)
        return send_from_directory(FRONTEND_DIR, "index.html")

    app.teardown_appcontext(close_db)
    return app


app = create_app()

if __name__ == "__main__":
    os.chdir(BASE_DIR)
    print(f"DEBUG: Changed working directory to {os.getcwd()}", file=sys.stderr)
    app.run(debug=Config.DEBUG, host="0.0.0.0", port=Config.PORT)
