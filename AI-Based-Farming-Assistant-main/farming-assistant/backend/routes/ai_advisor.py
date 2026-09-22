"""AI crop advice + static crop calendar and pest alerts."""
from __future__ import annotations

import json
import traceback
from datetime import datetime
from pathlib import Path

from flask import Blueprint, jsonify, request

from ai_client import API_KEY, generate_farming_advice, generate_text
from routes.auth import current_user_row

ai_advisor_bp = Blueprint("ai_advisor", __name__)

DATA = Path(__file__).resolve().parent.parent / "data"


def _load(name: str):
    p = DATA / name
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


@ai_advisor_bp.route("/crop-recommendation", methods=["GET"])
def crop_recommendation():
    try:
        lat = float(request.args.get("lat", ""))
        lng = float(request.args.get("lng", ""))
    except ValueError:
        return jsonify({"success": False, "error": "lat and lng required."}), 400
    month = int(request.args.get("month", datetime.now().month))

    soil_note = ""
    try:
        import requests

        sm = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lng,
                "current": "soil_moisture_0_to_7cm,temperature_2m",
                "timezone": "auto",
            },
            timeout=15,
        ).json()
        cur = sm.get("current") or {}
        soil_note = f"Soil moisture index ~{cur.get('soil_moisture_0_to_7cm')}, temp {cur.get('temperature_2m')}C"
    except Exception:
        soil_note = "Weather context partial."

    if not API_KEY:
        return jsonify({"success": False, "error": "AI API key not configured."}), 503

    user = current_user_row() or {}
    crop = (request.args.get("crop") or user.get("main_crop") or "General farming").strip()
    state = (request.args.get("state") or user.get("state") or "India").strip()
    weather_note = f"Month: {month}. {soil_note}"
    soil_context = "Soil data not directly available from sensors."

    try:
        text = generate_farming_advice(crop, state, soil_context, weather_note)
    except Exception as exc:
        print("AI ERROR:", repr(exc))
        traceback.print_exc()
        text = "AI service temporarily unavailable. Please try again."
        return jsonify({"success": False, "error": text}), 502

    lines = [ln.strip() for ln in text.split("\n") if ln.strip()][:3]
    recommendations = []
    for ln in lines:
        parts = [p.strip() for p in ln.split("|")]
        recommendations.append(
            {
                "line": ln,
                "crop": parts[0] if parts else ln,
                "hindi_reason": parts[2] if len(parts) > 2 else "",
                "english_reason": parts[3] if len(parts) > 3 else "",
            }
        )

    return jsonify(
        {
            "success": True,
            "month": month,
            "recommendations": recommendations,
            "raw": text,
        }
    ), 200


@ai_advisor_bp.route("/crop-calendar", methods=["GET"])
def crop_calendar():
    crop = (request.args.get("crop") or "wheat").strip().lower().replace(" ", "_")
    state = (request.args.get("state") or "").strip()
    data = _load("crop_calendars.json") or {}
    if not isinstance(data, dict):
        data = {}
    cal = data.get(crop) or data.get("default", [])
    return jsonify({"success": True, "crop": crop, "state": state, "calendar": cal}), 200


@ai_advisor_bp.route("/pest-alerts", methods=["GET"])
def pest_alerts():
    state = (request.args.get("state") or "").strip()
    district = (request.args.get("district") or "").strip()
    crop = (request.args.get("crop") or "").strip().lower()
    raw = _load("pest_alerts.json")
    alerts = raw if isinstance(raw, list) else []
    filtered = []
    for a in alerts:
        if state and a.get("state") and a.get("state") != state:
            continue
        if district and a.get("district") and a.get("district") != district:
            continue
        if crop and a.get("crop") and a.get("crop") != crop:
            continue
        filtered.append(a)

    summary_hi = ""
    if API_KEY and filtered:
        try:
            blob = json.dumps(filtered[:5], ensure_ascii=False)
            summary_hi = generate_text(
                f"किसान भाई के लिए इन अलर्ट का 2 वाक्य में सरल हिंदी सारांश दें। "
                f"इसे व्यावहारिक और भारत-विशेष रखें: {blob}"
            )
        except Exception as exc:
            print("AI ERROR:", repr(exc))
            traceback.print_exc()
            summary_hi = ""

    return jsonify({"success": True, "alerts": filtered[:15], "summary_hi": summary_hi}), 200
