# COPY-PASTE READY CODE BLOCKS

## FRONTEND: voice-assistant.js

### Complete Fixed File

```javascript
/**
 * Voice: Web Speech API + backend /api/voice
 * FIXED: Proper language handling across speech recognition, API, and synthesis
 */

// SINGLE SOURCE OF TRUTH FOR LANGUAGE
function getCurrentLanguage() {
  return localStorage.getItem("selectedLanguage") || "hi";
}

// LANGUAGE MAPPING FOR SPEECH APIs
const langMap = {
  en: "en-US",
  hi: "hi-IN",
  pa: "pa-IN",
  mr: "mr-IN",
  te: "te-IN",
  ta: "ta-IN",
  gu: "gu-IN",
  bn: "bn-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  or: "or-IN",
  as: "as-IN",
};

class FarmingVoiceAssistant {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = SR ? new SR() : null;
    this.synthesis = window.speechSynthesis;
    this.setupTextInput();
    this.setupLanguageSync();
  }

  setupLanguageSync() {
    // Listen for language changes
    window.addEventListener("storage", (e) => {
      if (e.key === "selectedLanguage") {
        // Language updated, next voice action will use new language
      }
    });
  }

  setupTextInput() {
    const input = document.getElementById("voice-text-input");
    const sendBtn = document.getElementById("voice-send-btn");
    
    if (input && sendBtn) {
      sendBtn.addEventListener("click", () => {
        const text = input.value.trim();
        if (text) {
          this.processCommand(text);
          input.value = "";
          input.focus();
        }
      });
      
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const text = input.value.trim();
          if (text) {
            this.processCommand(text);
            input.value = "";
          }
        }
      });
    }
  }

  startListening() {
    const btn = document.getElementById("voice-btn");
    if (!this.recognition) {
      this.showToast(typeof t === "function" ? t("voice_not_supported") : "Voice not supported");
      return;
    }
    
    // FIX 1: Set recognition language dynamically from current selection
    const currentLang = getCurrentLanguage();
    this.recognition.lang = langMap[currentLang] || "en-US";
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    
    btn?.classList.remove("listening");
    btn?.classList.add("listening-red");
    
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.processCommand(transcript);
    };
    
    this.recognition.onend = () => {
      btn?.classList.remove("listening-red");
    };
    
    this.recognition.onerror = () => {
      btn?.classList.remove("listening-red");
    };
    
    try {
      this.recognition.start();
    } catch (e) {
      btn?.classList.remove("listening-red");
      this.showToast(typeof t === "function" ? t("voice_not_supported") : "");
    }
  }

  async processCommand(text) {
    this.showToastBubble("user", text);
    this.showLoadingMessage();
    
    try {
      // FIX 2: Send correct field name "message" and include language
      const currentLang = getCurrentLanguage();
      const res = await window.apiJson("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text,
          language: currentLang 
        }),
        timeoutMs: 6500,
      });
      
      this.removeLoadingMessage();
      
      if (!res.ok || !res.data) {
        this.showToastBubble("ai", res.error || (typeof t === "function" ? t("api_error") : "Error"));
        return;
      }
      
      const data = res.data;
      const reply = data.response || "";
      this.showToastBubble("ai", reply);
      
      // FIX 3: Speak in current language
      this.speak(reply);
      
      if (data.action === "navigate" && data.page) {
        setTimeout(() => {
          window.location.href = data.page;
        }, 1500);
      }
      if (data.action === "show_weather" || data.intent === "weather") {
        setTimeout(() => {
          window.location.href = "weather.html";
        }, 1500);
      }
      if (data.action === "open_disease" || data.intent === "disease") {
        setTimeout(() => {
          window.location.href = "disease.html";
        }, 1500);
      }
    } catch (e) {
      console.error(e);
      this.removeLoadingMessage();
      this.showToastBubble("ai", typeof t === "function" ? t("api_error") : "Error");
    }
  }

  showLoadingMessage() {
    const history = document.getElementById("voice-chat-history");
    if (!history) return;
    
    const loadingId = "voice-loading-msg";
    if (document.getElementById(loadingId)) return;
    
    const msg = document.createElement("div");
    msg.id = loadingId;
    msg.className = "voice-msg ai-msg loading-msg";
    msg.innerHTML = '<span class="loading-dots">●●●</span>';
    history.appendChild(msg);
    history.scrollTop = history.scrollHeight;
  }

  removeLoadingMessage() {
    const loadingMsg = document.getElementById("voice-loading-msg");
    if (loadingMsg) {
      loadingMsg.remove();
    }
  }

  showToastBubble(role, text) {
    let el = document.getElementById("voice-toast-stack");
    if (!el) {
      el = document.createElement("div");
      el.id = "voice-toast-stack";
      el.className = "voice-toast-stack";
      document.body.appendChild(el);
    }
    const b = document.createElement("div");
    b.className = "voice-toast " + role;
    b.setAttribute("role", "status");
    b.textContent = text;
    el.appendChild(b);
    setTimeout(() => b.classList.add("show"), 10);
    setTimeout(() => {
      b.classList.remove("show");
      setTimeout(() => b.remove(), 300);
    }, 12000);
    
    this.addToChatHistory(role, text);
  }

  addToChatHistory(role, text) {
    const history = document.getElementById("voice-chat-history");
    if (!history) return;
    
    const msg = document.createElement("div");
    msg.className = `voice-msg ${role}-msg`;
    msg.textContent = text;
    history.appendChild(msg);
    history.scrollTop = history.scrollHeight;
  }

  showToast(text) {
    this.showToastBubble("ai", text);
  }

  // FIX 3: Speak function with proper language mapping
  speak(text) {
    if (!this.synthesis || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const currentLang = getCurrentLanguage();
    utterance.lang = langMap[currentLang] || "en-US";
    utterance.rate = 0.85;
    utterance.volume = 1;
    this.synthesis.cancel();
    this.synthesis.speak(utterance);
  }
}

window.initVoiceAssistant = function () {
  window.farmingVoice = new FarmingVoiceAssistant();
};
```

---

## BACKEND: voice.py

### Complete Fixed File

```python
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

# LANGUAGE NAMES FOR PROMPTS
LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "pa": "Punjabi",
    "mr": "Marathi",
    "te": "Telugu",
    "ta": "Tamil",
    "gu": "Gujarati",
    "bn": "Bengali",
    "kn": "Kannada",
    "ml": "Malayalam",
    "or": "Odia",
    "as": "Assamese",
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
    """
    FIX: Enforce strict language response in AI prompt
    """
    if not API_KEY:
        return None
    try:
        lang_name = LANGUAGE_NAMES.get(language, "English")
        
        # STRICT LANGUAGE ENFORCEMENT IN PROMPT
        system_prompt = f"""You are FarmSaathi, an AI assistant for Indian farmers.

STRICT INSTRUCTIONS:
- ALWAYS respond ONLY in {lang_name}
- Use simple farmer-friendly language
- Do NOT switch to English unless language is 'en'
- Keep responses practical and helpful
- Max 3 sentences
- Address farmer as 'किसान भाई' in Hindi, 'Farmer friend' in English"""

        prompt = f"User question: {text}"
        return generate_text(prompt, system_prompt=system_prompt)
    except Exception as exc:
        print("AI ERROR:", repr(exc))
        traceback.print_exc()
        return None


@voice_bp.route("", methods=["POST"])
def voice():
    payload = request.get_json(silent=True) or {}
    
    # FIX: Read "message" field (not "text") and language
    user_message = (payload.get("message") or "").strip()
    language = (payload.get("language") or "hi").strip()[:5]

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
```

---

## DEPLOYMENT INSTRUCTIONS

### Step 1: Backup Current Files
```bash
cp frontend/js/voice-assistant.js frontend/js/voice-assistant.js.backup
cp backend/routes/voice.py backend/routes/voice.py.backup
```

### Step 2: Replace Files
```bash
# Copy the complete fixed files above to:
# - frontend/js/voice-assistant.js
# - backend/routes/voice.py
```

### Step 3: Restart Backend
```bash
# Stop Flask
# Ctrl+C

# Start Flask
python app.py
```

### Step 4: Clear Browser Cache
```
Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
Select "All time"
Click "Clear data"
```

### Step 5: Test
1. Open app in browser
2. Select Hindi
3. Speak: "मौसम कैसा है?"
4. Verify: AI responds in Hindi, speech plays in Hindi
5. Select English
6. Type: "What about weather?"
7. Verify: AI responds in English, speech plays in English

---

## ROLLBACK INSTRUCTIONS

If issues occur:

```bash
# Restore from backup
cp frontend/js/voice-assistant.js.backup frontend/js/voice-assistant.js
cp backend/routes/voice.py.backup backend/routes/voice.py

# Restart Flask
python app.py

# Clear browser cache
```

---

## VERIFICATION COMMANDS

### Check Frontend File
```bash
grep -n "getCurrentLanguage" frontend/js/voice-assistant.js
# Should show: function getCurrentLanguage() { ... }
```

### Check Backend File
```bash
grep -n "LANGUAGE_NAMES" backend/routes/voice.py
# Should show: LANGUAGE_NAMES = { ... }
```

### Check API Field
```bash
grep -n "message" backend/routes/voice.py
# Should show: user_message = (payload.get("message") or "").strip()
```

---

## QUICK TEST SCRIPT

```javascript
// Run in browser console to test
console.log("Current language:", localStorage.getItem("selectedLanguage"));
console.log("Language map:", langMap);
console.log("Current lang code:", getCurrentLanguage());
```

---

**Ready to deploy! ✅**
