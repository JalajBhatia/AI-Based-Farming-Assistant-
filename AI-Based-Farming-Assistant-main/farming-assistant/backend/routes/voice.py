"""Keyword intents + AI fallback for FarmSaathi voice assistant."""
from __future__ import annotations

import traceback

from flask import Blueprint, jsonify, request

from ai_client import API_KEY, generate_text

voice_bp = Blueprint("voice", __name__)

INTENT_KEYWORDS = {
    "weather": ["मौसम", "बारिश", "गर्मी", "ठंड", "weather", "rain", "temperature", "barish"],
    "disease": ["बीमारी", "रोग", "पत्ती", "खराब", "disease", "sick", "pest", "keede"],
    "mandi": ["मंडी", "भाव", "कीमत", "बेचना", "mandi", "price", "sell", "bhav"],
    "loan": ["लोन", "kcc", "उधार", "ब्याज", "loan", "credit", "interest"],
    "subsidy": ["सब्सिडी", "योजना", "सरकार", "scheme", "government", "yojana"],
    "crop": ["फसल", "बीज", "खेती", "crop", "seed", "planting", "kya ugayen"],
    "soil": ["मिट्टी", "उर्वरक", "खाद", "soil", "fertilizer", "compost"],
}

RESPONSES = {
    "weather": {"hi": "मौसम देखने के लिए मौसम वाला पेज खोलें।", "en": "Open the Weather page for your forecast."},
    "disease": {"hi": "फसल की बीमारी जाँच के लिए रोग जाँच पेज खोलें।", "en": "Open Disease Check to scan your crop leaf."},
    "mandi": {"hi": "मंडी भाव देखने के लिए मंडी पेज खोलें।", "en": "Open Mandi prices for market rates."},
    "loan": {"hi": "KCC लोन और EMI के लिए वित्त पेज खोलें।", "en": "Open Finance for KCC and EMI calculator."},
    "subsidy": {"hi": "सरकारी योजनाओं के लिए योजना पेज खोलें।", "en": "Open Government schemes page."},
    "crop": {"hi": "फसल सलाह के लिए AI सलाहकार पेज खोलें।", "en": "Open AI Advisor for crop suggestions."},
    "soil": {"hi": "मिट्टी नमी के लिए NDVI / मिट्टी मानचित्र पेज खोलें।", "en": "Open NDVI map for soil moisture view."},
    "general": {"hi": "किसान भाई, मौसम, बीमारी, मंडी या योजना के बारे में पूछें।", "en": "Ask about weather, disease, mandi prices, or schemes."},
}


def detect_intent(text: str) -> str:
    t = text.lower()
    for intent, keywords in INTENT_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in t:
                return intent
    return "general"


def _fallback(intent: str, lang: str) -> str:
    block = RESPONSES.get(intent, RESPONSES["general"])
    lang = lang if lang in block else "hi"
    return block.get(lang) or block.get("hi") or RESPONSES["general"]["hi"]


def ask_ai(text: str, language: str) -> str | None:
    if not API_KEY:
        return None
    try:
        prompt = f"""
You are an AI Farming Assistant.

STRICT RULES:
- ALWAYS respond ONLY in {language}
- Use simple farmer-friendly language
- Never switch language
- Keep answers practical

User: {text}
"""
        return generate_text(prompt)
    except Exception as exc:
        print("AI ERROR:", repr(exc))
        traceback.print_exc()
        return None


@voice_bp.route("", methods=["POST"])
def voice():
    payload = request.get_json(silent=True) or {}

    user_message = (payload.get("message") or "").strip()
    language = (payload.get("language") or "en").strip()[:5]

    if not user_message:
        return jsonify({"success": False, "error": "Message is required."}), 400

    intent = detect_intent(user_message)
    action = None
    page = None

    if intent == "weather":
        action = "navigate"
        page = "weather.html"
    elif intent == "disease":
        action = "navigate"
        page = "disease.html"
    elif intent == "mandi":
        action = "navigate"
        page = "mandi.html"
    elif intent == "loan":
        action = "navigate"
        page = "finance.html"
    elif intent == "subsidy":
        action = "navigate"
        page = "subsidies.html"
    elif intent == "crop":
        action = "navigate"
        page = "ai-advisor.html"
    elif intent == "soil":
        action = "navigate"
        page = "ndvi-map.html"

    reply = _fallback(intent, language)
    if intent == "general":
        ai_reply = ask_ai(user_message, language)
        if ai_reply:
            reply = ai_reply

    out = {"success": True, "response": reply, "intent": intent}
    if action:
        out["action"] = action
    if page:
        out["page"] = page
    return jsonify(out), 200
