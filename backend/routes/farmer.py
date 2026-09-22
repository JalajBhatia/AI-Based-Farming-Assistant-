"""Farmer profile, reverse geocode, dashboard aggregation."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from pathlib import Path

import requests
from flask import Blueprint, current_app, jsonify, request

from database import get_db
from routes.auth import current_user_row

farmer_bp = Blueprint("farmer", __name__)


def _require_user():
    row = current_user_row()
    if not row:
        return None
    return row


@farmer_bp.route("/profile", methods=["GET"])
def get_profile():
    row = _require_user()
    if not row:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    u = {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "full_name": row.get("full_name") or "",
        "phone": row.get("phone") or "",
        "state": row.get("state") or "",
        "district": row.get("district") or "",
        "village": row.get("village") or "",
        "lat": float(row["lat"]) if row.get("lat") is not None else None,
        "lng": float(row["lng"]) if row.get("lng") is not None else None,
        "main_crop": row.get("main_crop") or "",
        "land_acres": float(row["land_acres"]) if row.get("land_acres") is not None else None,
        "has_irrigation": bool(row.get("has_irrigation")),
        "preferred_language": row.get("preferred_language") or "hi",
        "ui_mode": row.get("ui_mode") or "smart",
        "theme": row.get("theme") or "light",
        "profile_pic": row.get("profile_pic") or "",
    }
    return jsonify({"success": True, **u}), 200


@farmer_bp.route("/profile", methods=["PUT"])
def put_profile():
    row = _require_user()
    if not row:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    body = request.get_json(silent=True) or {}

    fields = []
    values = []
    mapping = {
        "full_name": "full_name",
        "phone": "phone",
        "state": "state",
        "district": "district",
        "village": "village",
        "lat": "lat",
        "lng": "lng",
        "main_crop": "main_crop",
        "land_acres": "land_acres",
        "has_irrigation": "has_irrigation",
        "preferred_language": "preferred_language",
        "ui_mode": "ui_mode",
        "theme": "theme",
        "profile_pic": "profile_pic",
    }
    for key, col in mapping.items():
        if key not in body:
            continue
        val = body[key]
        if key == "has_irrigation":
            val = 1 if val in (True, "true", "yes", 1, "1") else 0
        elif key in ("lat", "lng", "land_acres") and val is not None and val != "":
            try:
                val = float(val)
            except (TypeError, ValueError):
                continue
        fields.append(f"{col} = %s")
        values.append(val)

    if not fields:
        return jsonify({"success": True, "message": "No changes."}), 200

    values.append(row["id"])
    sql = "UPDATE users SET " + ", ".join(fields) + " WHERE id = %s"
    db = get_db()
    cur = db.cursor()
    cur.execute(sql, tuple(values))
    db.commit()
    cur.close()
    return jsonify({"success": True}), 200


@farmer_bp.route("/location", methods=["POST"])
def reverse_location():
    row = _require_user()
    if not row:
        return jsonify({"success": False, "error": "Unauthorized."}), 401
    body = request.get_json(silent=True) or {}
    try:
        lat = float(body.get("lat"))
        lng = float(body.get("lng"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "lat and lng required."}), 400

    try:
        q = urllib.parse.urlencode({"lat": lat, "lon": lng, "format": "json"})
        url = f"https://nominatim.openstreetmap.org/reverse?{q}"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "FarmSaathi/1.0 (farmer app)"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 502

    addr = data.get("address") or {}
    state = addr.get("state") or addr.get("region") or ""
    district = (
        addr.get("county")
        or addr.get("state_district")
        or addr.get("district")
        or addr.get("municipality")
        or ""
    )
    village = (
        addr.get("village")
        or addr.get("town")
        or addr.get("city")
        or addr.get("hamlet")
        or ""
    )
    display = data.get("display_name") or ""

    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        UPDATE users
        SET lat = %s, lng = %s, state = %s, district = %s, village = %s
        WHERE id = %s
        """,
        (lat, lng, state, district, village, row["id"]),
    )
    db.commit()
    cur.close()

    return (
        jsonify(
            {
                "success": True,
                "lat": lat,
                "lng": lng,
                "state": state,
                "district": district,
                "village": village,
                "formatted_address": display,
            }
        ),
        200,
    )


def _load_json(name: str) -> dict | list:
    p = Path(__file__).resolve().parent.parent / "data" / name
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))


@farmer_bp.route("/dashboard", methods=["GET"])
def dashboard():
    row = _require_user()
    if not row:
        return jsonify({"success": False, "error": "Unauthorized."}), 401

    from routes.weather import build_forecast_payload

    lat = row.get("lat")
    lng = row.get("lng")
    weather = None
    if lat is not None and lng is not None:
        try:
            weather = build_forecast_payload(float(lat), float(lng))
        except Exception:
            weather = None

    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT id, image_path, disease_name, hindi_name, confidence, severity, created_at
        FROM predictions WHERE user_id = %s
        ORDER BY created_at DESC LIMIT 3
        """,
        (row["id"],),
    )
    preds = cur.fetchall()
    cur.close()
    pred_out = []
    for p in preds or []:
        pred_out.append(
            {
                "id": p["id"],
                "image_path": p.get("image_path"),
                "disease_name": p.get("disease_name"),
                "hindi_name": p.get("hindi_name"),
                "confidence": float(p["confidence"]) if p.get("confidence") is not None else None,
                "severity": p.get("severity"),
                "created_at": str(p.get("created_at") or ""),
            }
        )

    crop = (row.get("main_crop") or "Wheat").strip()
    state = (row.get("state") or "").strip()
    mandi = None
    if crop and state:
        try:
            from routes.mandi import build_mandi_payload

            mandi = build_mandi_payload(crop, state)
        except Exception:
            mandi = None

    schemes_data = _load_json("subsidies.json")
    schemes = schemes_data.get("schemes", []) if isinstance(schemes_data, dict) else []
    active_schemes = []
    for s in schemes:
        states = s.get("states") or []
        if state and states and state not in states:
            continue
        active_schemes.append(s)
    active_schemes = active_schemes[:8]

    month = __import__("datetime").datetime.now().month
    cal_all = _load_json("crop_calendars.json")
    if not isinstance(cal_all, dict):
        cal_all = {}
    crop_key = (row.get("main_crop") or "wheat").lower().replace(" ", "_")
    crop_calendar = cal_all.get(crop_key, cal_all.get("default", []))

    pests = _load_json("pest_alerts.json")
    pest_list = pests if isinstance(pests, list) else []
    mc = (row.get("main_crop") or "").strip().lower().replace(" ", "_")
    pest_alerts = []
    for p in pest_list:
        if state and p.get("state") and p.get("state") != state:
            continue
        if (row.get("district") or "") and p.get("district") and p.get("district") != row.get("district"):
            continue
        if mc and p.get("crop") and str(p.get("crop")).lower() != mc:
            continue
        pest_alerts.append(p)
        if len(pest_alerts) >= 5:
            break

    return (
        jsonify(
            {
                "success": True,
                "weather": weather,
                "recent_predictions": pred_out,
                "mandi": mandi,
                "schemes": active_schemes,
                "crop_calendar": crop_calendar,
                "calendar_month": month,
                "pest_alerts": pest_alerts,
            }
        ),
        200,
    )
