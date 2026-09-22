"""OpenWeatherMap 5-day forecast, MySQL cache (1h), farming advice + severe alerts."""
from __future__ import annotations

import hashlib
import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request

from database import get_db

weather_bp = Blueprint("weather", __name__)

CACHE_SECONDS = 3600


def _farming_advice_struct(rain_mm: float, temp_max: float, wind_kmh: float, humidity: float) -> dict:
    if rain_mm > 20:
        return {
            "level": "danger",
            "hi": "भारी बारिश — खेत में न जाएं",
            "en": "Heavy rain — avoid field",
        }
    if rain_mm > 5:
        return {
            "level": "warning",
            "hi": "बारिश होगी — सिंचाई न करें",
            "en": "Rain expected — skip irrigation",
        }
    if temp_max > 40:
        return {
            "level": "warning",
            "hi": "लू चल रही है — सुबह 6 बजे काम करें",
            "en": "Heatwave — work at 6 AM",
        }
    if wind_kmh > 40:
        return {
            "level": "warning",
            "hi": "तेज़ हवा — कीटनाशक न डालें",
            "en": "Strong wind — no pesticides",
        }
    if humidity > 85:
        return {
            "level": "info",
            "hi": "नमी ज़्यादा — फफूंद का खतरा",
            "en": "High humidity — fungal risk",
        }
    return {
        "level": "info",
        "hi": "मौसम सामान्य — नियमित देखभाल",
        "en": "Conditions normal — regular care",
    }


def _severe_alert(rain_mm: float, temp_max: float, wind_kmh: float) -> tuple[bool, str]:
    if rain_mm > 20:
        return True, "भारी बारिश की चेतावनी — खेत में न जाएं।"
    if temp_max > 42:
        return True, "अत्यधिक गर्मी — बाहर काम करने से बचें।"
    if wind_kmh > 50:
        return True, "तूफ़ान जैसी हवा — सुरक्षित स्थान पर रहें।"
    return False, ""


def _cache_key(lat: float, lng: float) -> str:
    raw = f"{round(lat, 4)},{round(lng, 4)}"
    return hashlib.sha256(raw.encode()).hexdigest()[:64]


def _get_cache(cache_key: str) -> dict | None:
    db = get_db()
    cur = db.cursor()
    cur.execute(
        "SELECT data, cached_at FROM weather_cache WHERE cache_key = %s LIMIT 1",
        (cache_key,),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        return None
    cached_at = row.get("cached_at")
    if cached_at and datetime.utcnow() - cached_at.replace(tzinfo=None) > timedelta(seconds=CACHE_SECONDS):
        return None
    data = row.get("data")
    if isinstance(data, str):
        return json.loads(data)
    return data


def _set_cache(cache_key: str, lat: float, lng: float, payload: dict) -> None:
    db = get_db()
    cur = db.cursor()
    cur.execute("DELETE FROM weather_cache WHERE cache_key = %s", (cache_key,))
    cur.execute(
        """
        INSERT INTO weather_cache (cache_key, lat, lng, data)
        VALUES (%s, %s, %s, %s)
        """,
        (cache_key, lat, lng, json.dumps(payload)),
    )
    db.commit()
    cur.close()


def _fetch_openweather(lat: float, lng: float) -> dict:
    key = current_app.config.get("OPENWEATHER_API_KEY") or ""
    if not key:
        raise RuntimeError("OPENWEATHER_API_KEY not configured")
    q = urllib.parse.urlencode({"lat": lat, "lon": lng, "appid": key, "units": "metric"})
    url = f"https://api.openweathermap.org/data/2.5/forecast?{q}"
    with urllib.request.urlopen(url, timeout=25) as resp:
        return json.loads(resp.read().decode())


def build_forecast_payload(lat: float, lng: float, use_cache: bool = True) -> dict:
    ck = _cache_key(lat, lng)
    if use_cache:
        cached = _get_cache(ck)
        if cached:
            cached["cached"] = True
            return cached

    data = _fetch_openweather(lat, lng)
    items = data.get("list", [])
    days = []
    for item in items[:40]:
        rain_mm = 0.0
        if "rain" in item:
            rain_mm = float(item["rain"].get("3h") or item["rain"].get("1h") or 0)
        w = item.get("weather", [{}])[0]
        wind_ms = float(item.get("wind", {}).get("speed") or 0)
        wind_kmh = wind_ms * 3.6
        main = item.get("main") or {}
        pop = float(item.get("pop") or 0.0)
        temp_max = float(main.get("temp_max") or main.get("temp") or 0)
        humidity = float(main.get("humidity") or 0)
        adv = _farming_advice_struct(rain_mm, temp_max, wind_kmh, humidity)
        sev, sev_msg = _severe_alert(rain_mm, temp_max, wind_kmh)
        days.append(
            {
                "dt_txt": item.get("dt_txt"),
                "temp_min": float(main.get("temp_min") or main.get("temp") or 0),
                "temp_max": temp_max,
                "humidity": humidity,
                "rainfall_mm": rain_mm,
                "rain_chance_pct": round(pop * 100, 1),
                "wind_speed_ms": wind_ms,
                "wind_kmh": round(wind_kmh, 1),
                "condition": w.get("description", ""),
                "icon": w.get("icon", ""),
                "icon_code": w.get("icon", ""),
                "farming_advice": adv,
                "severe_alert": sev,
                "severe_message": sev_msg if sev else "",
            }
        )

    by_day = {}
    for d in days:
        day_key = (d["dt_txt"] or "")[:10]
        if day_key and day_key not in by_day:
            by_day[day_key] = d

    forecast_days = list(by_day.values())[:5]
    today = forecast_days[0] if forecast_days else (days[0] if days else None)

    city_raw = data.get("city")
    if isinstance(city_raw, dict):
        city_name = city_raw.get("name", "—")
    elif isinstance(city_raw, str):
        city_name = city_raw
    else:
        city_name = "—"

    out = {
        "success": True,
        "city": city_name,
        "lat": lat,
        "lon": lng,
        "farming_advice": today["farming_advice"] if today else {},
        "severe_alert": today.get("severe_alert", False) if today else False,
        "severe_message": today.get("severe_message", "") if today else "",
        "today": (
            {
                "temp_min": round(today["temp_min"]),
                "temp_max": round(today["temp_max"]),
                "humidity": round(today["humidity"]),
                "rain_chance_pct": today.get("rain_chance_pct"),
                "rainfall_mm": today.get("rainfall_mm"),
                "wind_kmh": today.get("wind_kmh"),
            }
            if today
            else None
        ),
        "forecast": forecast_days,
        "cached": False,
    }
    try:
        _set_cache(ck, lat, lng, out)
    except Exception:
        pass
    return out


@weather_bp.route("", methods=["GET"])
def weather():
    lat = request.args.get("lat")
    lon = request.args.get("lon") or request.args.get("lng")
    district = (request.args.get("district") or "").strip()
    state = (request.args.get("state") or "").strip()

    coords_path = Path(__file__).resolve().parent.parent / "data" / "district_coords.json"
    if (not lat or not lon) and district and state and coords_path.exists():
        mapping = json.loads(coords_path.read_text(encoding="utf-8"))
        key_lookup = f"{district}|{state}".lower()
        for k, v in mapping.items():
            if k.lower() == key_lookup:
                lat, lon = str(v["lat"]), str(v["lon"])
                break

    if not lat or not lon:
        lat = 28.6139
        lon = 77.2090
    try:
        la, lo = float(lat), float(lon)
    except ValueError:
        return jsonify({"success": False, "error": "Invalid coordinates."}), 400

    try:
        payload = build_forecast_payload(la, lo, use_cache=True)
        return jsonify(payload), 200
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 502
