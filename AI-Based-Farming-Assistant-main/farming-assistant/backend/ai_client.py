"""Groq SDK client helpers for FarmSaathi."""
from __future__ import annotations

import os

try:
    from groq import Groq
except Exception:  # pragma: no cover - optional dependency is not required in demo mode
    Groq = None

API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("GEMINI_API_KEY") or "demo-key"
client = Groq(api_key=API_KEY) if Groq and API_KEY and API_KEY != "demo-key" else None


def generate_text(prompt: str, system_prompt: str = "You are a professional agriculture expert.") -> str:
    if client is None:
        return (
            "Demo advisory: Maintain regular soil moisture, monitor for pest outbreaks, "
            "and use local agronomic practices suited to your crop and region."
        )

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
    )
    return (response.choices[0].message.content or "").strip()


def generate_farming_advice(crop: str, state: str, soil: str | None = None, weather: str | None = None) -> str:
    prompt = f"""
You are an expert agricultural advisor for Indian farmers.

Give highly practical, localized, and real-world advice.

User Input:
- Crop: {crop}
- State: {state}
- Soil: {soil or "Assume general soil conditions common in this region of India."}
- Weather: {weather or "Assume seasonal weather typical for the current period in this Indian state."}

Respond in this EXACT format:

🌱 Crop Strategy:
- (what to do)

💧 Irrigation:
- (watering advice)

🌿 Fertilizer Plan:
- (specific fertilizers)

⚠️ Risks:
- (diseases, weather risks)

💡 Expert Tips:
- (advanced suggestions)

Rules:
- Keep it simple and farmer-friendly
- No generic AI text
- Use India-specific context
"""

    return generate_text(prompt)
