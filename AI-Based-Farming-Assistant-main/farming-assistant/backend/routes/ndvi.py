"""NASA GIBS NDVI tile info + rough vegetation score from WMS pixel sample; soil moisture via Open-Meteo."""
from __future__ import annotations

import io
from datetime import datetime, timedelta

import requests
from flask import Blueprint, jsonify, request
from PIL import Image

ndvi_bp = Blueprint("ndvi", __name__)

WMS_BASE = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"


def _latest_modis_time() -> str:
    """Approximate recent 8-day MODIS period (YYYY-MM-DD)."""
    d = datetime.utcnow().date() - timedelta(days=16)
    return d.strftime("%Y-%m-%d")


def _sample_ndvi_brightness(lat: float, lng: float, time_str: str) -> float | None:
    """Fetch small WMS PNG; map mean green-channel brightness to 0–1 proxy score."""
    bbox = f"{lng - 0.06},{lat - 0.06},{lng + 0.06},{lat + 0.06}"
    params = {
        "SERVICE": "WMS",
        "VERSION": "1.3.0",
        "REQUEST": "GetMap",
        "LAYERS": "MODIS_Terra_NDVI_8Day",
        "STYLES": "",
        "CRS": "EPSG:4326",
        "BBOX": bbox,
        "WIDTH": "96",
        "HEIGHT": "96",
        "FORMAT": "image/png",
        "TIME": time_str,
        "TRANSPARENT": "true",
    }
    try:
        r = requests.get(WMS_BASE, params=params, timeout=25)
        r.raise_for_status()
        img = Image.open(io.BytesIO(r.content)).convert("RGB")
        pixels = list(img.getdata())
        if not pixels:
            return None
        greens = [p[1] / 255.0 for p in pixels if sum(p) > 10]
        if not greens:
            return None
        return sum(greens) / len(greens)
    except Exception:
        return None


def _status_from_score(score: float) -> tuple[str, str, str]:
    if score > 0.6:
        return "excellent", "बहुत अच्छी फसल", "Excellent vegetation"
    if score >= 0.4:
        return "good", "अच्छी फसल", "Good vegetation"
    if score >= 0.2:
        return "fair", "औसत फसल", "Fair vegetation"
    return "poor", "कमज़ोर फसल", "Poor vegetation"


@ndvi_bp.route("/ndvi", methods=["GET"])
def ndvi():
    try:
        lat = float(request.args.get("lat", ""))
        lng = float(request.args.get("lng", ""))
    except ValueError:
        return jsonify({"success": False, "error": "lat and lng required."}), 400
    zoom = int(request.args.get("zoom", "14"))
    time_str = _latest_modis_time()
    score = _sample_ndvi_brightness(lat, lng, time_str)
    if score is None:
        return jsonify(
            {
                "success": True,
                "tile_url_template": (
                    f"https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/"
                    f"MODIS_Terra_NDVI_8Day/default/{time_str}/250m/{{z}}/{{y}}/{{x}}.png"
                ),
                "wms_url": WMS_BASE,
                "wms_layer": "MODIS_Terra_NDVI_8Day",
                "wms_time": time_str,
                "ndvi_score": None,
                "vegetation_status": "unknown",
                "hindi_status": "उपग्रह चित्र लोड नहीं हो सका — मानचित्र देखें",
                "status_english": "Could not sample NDVI tile — use map overlay",
                "last_updated": time_str,
                "zoom_hint": zoom,
            }
        ), 200

    veg_code, hi, en = _status_from_score(score)
    template = (
        f"https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/"
        f"MODIS_Terra_NDVI_8Day/default/{time_str}/250m/{{z}}/{{y}}/{{x}}.png"
    )
    return jsonify(
        {
            "success": True,
            "tile_url_template": template,
            "wms_url": WMS_BASE,
            "wms_layer": "MODIS_Terra_NDVI_8Day",
            "wms_time": time_str,
            "ndvi_score": round(score, 3),
            "ndvi_estimate_only": True,
            "vegetation_status": veg_code,
            "hindi_status": hi,
            "status_english": en,
            "last_updated": time_str,
            "zoom_hint": zoom,
        }
    ), 200


@ndvi_bp.route("/soil", methods=["GET"])
def soil():
    try:
        lat = float(request.args.get("lat", ""))
        lng = float(request.args.get("lng", ""))
    except ValueError:
        return jsonify({"success": False, "error": "lat and lng required."}), 400
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "soil_moisture_0_to_7cm",
        "timezone": "auto",
    }
    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
        cur = data.get("current") or {}
        sm = cur.get("soil_moisture_0_to_7cm")
        if sm is None:
            return jsonify({"success": False, "error": "Soil moisture not available for this location."}), 502
        pct = min(100.0, max(0.0, float(sm) * 100.0))
        health = min(100, int(40 + pct * 1.2))
        if pct < 15:
            rec = "मिट्टी सूखी है — हल्की सिंचाई करें।"
        elif pct > 45:
            rec = "नमी अधिक है — सड़न से बचाव करें, जल निकास ठीक रखें।"
        else:
            rec = "मिट्टी की नमी संतुलित है — नियमित देखभाल जारी रखें।"
        return jsonify(
            {
                "success": True,
                "soil_moisture_pct": round(pct, 1),
                "soil_health_score": health,
                "recommendation_hi": rec,
                "source": "open-meteo",
            }
        ), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 502
