import io
import json
from pathlib import Path

import numpy as np
from flask import Blueprint, request, jsonify, current_app
from PIL import Image

disease_bp = Blueprint("disease", __name__)

_model = None
_load_error = None
CLASS_NAMES = []
UPLOAD_DISEASE = Path("uploads/disease_images")

def load_model_once():
    global _model, _load_error, CLASS_NAMES
    if _model is not None or _load_error is not None:
        return
    try:
        from tensorflow.keras.models import load_model
        model_path = current_app.config.get("MODEL_PATH")
        class_names_path = current_app.config.get("CLASS_NAMES_PATH")
        
        if not model_path or not Path(model_path).exists():
            _load_error = "Model file not found"
            return
            
        _model = load_model(model_path)
        
        if class_names_path and Path(class_names_path).exists():
            with open(class_names_path, 'r', encoding='utf-8') as f:
                CLASS_NAMES = json.load(f)
        else:
            _load_error = "Class names file not found"
            _model = None
    except Exception as e:
        _load_error = str(e)

def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((224, 224))
    arr = np.array(img, dtype=np.float32) / 255.0
    x = np.expand_dims(arr, axis=0)
    return x

def _meta_for_class(disease_name):
    return {
        "hindi_name": disease_name,
        "severity": "Medium" if "blight" in disease_name.lower() or "spot" in disease_name.lower() else "Low",
        "treatment": "Apply appropriate fungicide or organic remedy.",
        "prevention": "Ensure good drainage and air circulation.",
        "is_healthy": "healthy" in disease_name.lower()
    }

@disease_bp.route("/predict", methods=["POST"])
def predict_disease():
    if "image" not in request.files:
        return jsonify({
            "success": False,
            "error": "Image required"
        }), 400

    image_file = request.files["image"]
    image_bytes = image_file.read()

    load_model_once()
    if _model is None:
        return jsonify({
            "success": False,
            "error": _load_error or "Model not loaded"
        }), 503

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((224, 224))
        arr = np.array(img, dtype=np.float32) / 255.0
        x = np.expand_dims(arr, axis=0)

        preds = _model.predict(x)[0]
        idx = int(np.argmax(preds))

        disease_name = CLASS_NAMES[idx] if idx < len(CLASS_NAMES) else "Unknown"
        confidence = float(preds[idx])

        return jsonify({
            "success": True,
            "disease_name": disease_name,
            "confidence": confidence
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
