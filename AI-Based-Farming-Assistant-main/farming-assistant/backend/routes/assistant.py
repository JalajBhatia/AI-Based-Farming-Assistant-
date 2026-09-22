"""Unified AI assistant route for text and image inputs."""
from __future__ import annotations

import io
import json
import uuid
from pathlib import Path

import numpy as np
from flask import Blueprint, current_app, jsonify, request
from PIL import Image

from ai_client import API_KEY, generate_text
from database import get_db
from routes import disease as disease_route
from routes.auth import current_user_row

assistant_bp = Blueprint("assistant", __name__)


def _get_payload() -> tuple[str, str]:
    if request.is_json:
        payload = request.get_json(silent=True) or {}
        message = (payload.get("message") or "").strip()
        language = (payload.get("language") or "en").strip()[:20]
        return message, language or "en"

    message = (request.form.get("message") or "").strip()
    language = (request.form.get("language") or "en").strip()[:20]
    return message, language or "en"


def _predict_disease_response(image_file):
    model_path = Path(current_app.config["MODEL_PATH"])
    print("ASSISTANT MODEL PATH:", model_path)
    print("EXISTS:", model_path.exists())
    
    if not model_path.exists():
        return jsonify({"success": False, "error": "Disease model unavailable."}), 503

    disease_route.load_model_once()
    if disease_route._model is None:
        err = disease_route._load_error or "Disease model unavailable."
        return jsonify({"success": False, "error": err}), 503

    raw = image_file.read()
    try:
        Image.open(io.BytesIO(raw)).verify()
    except Exception:
        return jsonify({"success": False, "error": "Invalid image file."}), 400

    class_names = disease_route.CLASS_NAMES
    if not class_names:
        cp = Path(current_app.config["CLASS_NAMES_PATH"])
        class_names = json.loads(cp.read_text(encoding="utf-8")) if cp.exists() else []

    if not class_names:
        return jsonify({"success": False, "error": "Class names unavailable."}), 503

    try:
        x = disease_route.preprocess_image(raw)
        probs = disease_route._model.predict(x, verbose=0)[0]
    except Exception as exc:
        return jsonify({"success": False, "error": f"Prediction failed: {exc}"}), 500

    idx = int(np.argmax(probs))
    if idx >= len(class_names):
        return jsonify({"success": False, "error": "Class index out of range."}), 500

    disease_name = class_names[idx]
    confidence = float(probs[idx])
    meta = disease_route._meta_for_class(disease_name)
    is_healthy = bool(meta.get("is_healthy", "healthy" in disease_name.lower()))

    disease_route.UPLOAD_DISEASE.mkdir(parents=True, exist_ok=True)
    fname = f"{uuid.uuid4().hex}.jpg"
    fpath = disease_route.UPLOAD_DISEASE / fname
    try:
        fpath.write_bytes(raw)
    except Exception:
        fname = ""

    user = current_user_row()
    uid = user["id"] if user else None
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute(
            """
            INSERT INTO predictions (user_id, image_path, disease_name, hindi_name, confidence, severity)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                uid,
                f"disease_images/{fname}" if fname else None,
                disease_name,
                meta.get("hindi_name", disease_name),
                confidence,
                meta.get("severity", "medium"),
            ),
        )
        db.commit()
        cur.close()
    except Exception:
        pass

    response_text = (
        f"Disease: {meta.get('hindi_name', disease_name)}. "
        f"Confidence: {round(confidence * 100, 1)}%. "
        f"Treatment: {meta.get('treatment', '')} "
        f"Prevention: {meta.get('prevention', '')}"
    )
    if is_healthy:
        response_text = (
            f"Leaf looks healthy: {meta.get('hindi_name', disease_name)}. "
            f"Confidence: {round(confidence * 100, 1)}%. "
            f"Prevention: {meta.get('prevention', '')}"
        )

    return (
        jsonify(
            {
                "success": True,
                "type": "disease",
                "response": response_text.strip(),
                "disease_name": disease_name,
                "hindi_name": meta.get("hindi_name", disease_name),
                "confidence": confidence,
                "severity": meta.get("severity", "medium"),
                "treatment": meta.get("treatment", ""),
                "prevention": meta.get("prevention", ""),
                "organic_remedy": meta.get("organic_remedy", ""),
                "is_healthy": is_healthy,
            }
        ),
        200,
    )


@assistant_bp.route("", methods=["POST"])
def assistant():
    language_map = {
        "hi": "Hindi",
        "en": "English",
        "ta": "Tamil",
        "te": "Telugu",
        "mr": "Marathi",
        "pa": "Punjabi",
        "gu": "Gujarati",
        "bn": "Bengali",
        "kn": "Kannada",
        "ml": "Malayalam",
        "or": "Odia",
        "as": "Assamese",
    }
    message, language = _get_payload()

    image_file = request.files.get("image") or request.files.get("file")
    if image_file and image_file.filename:
        return _predict_disease_response(image_file)

    if not message:
        return jsonify({"success": False, "error": "Message or image is required."}), 400

    prompt = f"""You are an AI Farming Assistant.

Rules:
* Respond in {language_map.get(language, language)}
* Be practical
* Help farmers
* Keep answers simple

User: {message}"""

    try:
        response_text = (
            generate_text(prompt, system_prompt="You are an AI Farming Assistant.")
            if API_KEY
            else ""
        )
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 502

    if not response_text:
        response_text = "Assistant is unavailable right now."

    return jsonify({"success": True, "response": response_text, "type": "text"}), 200
