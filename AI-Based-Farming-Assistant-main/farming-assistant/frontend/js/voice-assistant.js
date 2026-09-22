function getCurrentLanguage() {
  return localStorage.getItem("language") || "en";
}

console.log("voice-assistant.js loaded");

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
  as: "as-IN"
};

class FarmingVoiceAssistant {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.error("SpeechRecognition not supported in this browser");
    }
    this.recognition = SR ? new SR() : null;
    this.synthesis = window.speechSynthesis;
    this.initialized = false;
    this.isListening = false;
  }

  init() {
    if (this.initialized) {
      console.log("Voice assistant already initialized");
      return;
    }
    this.setupUI();
    this.initialized = true;
  }

  setupUI() {
    const input = document.getElementById("voice-text-input");
    const sendBtn = document.getElementById("voice-send-btn");
    const voiceBtn = document.getElementById("voice-btn");
    const imageBtn = document.getElementById("image-send-btn");
    const history = document.getElementById("voice-chat-history");

    console.log("Voice assistant setup UI", {
      inputFound: !!input,
      sendBtnFound: !!sendBtn,
      voiceBtnFound: !!voiceBtn,
      imageBtnFound: !!imageBtn,
      historyFound: !!history
    });

    if (!input || !sendBtn || !voiceBtn || !history) {
      return;
    }

    sendBtn.addEventListener("click", () => {
      console.log("Send button clicked");
      this.handleTextSubmit();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        console.log("Enter key pressed for voice input");
        this.handleTextSubmit();
      }
    });

    voiceBtn.addEventListener("click", () => {
      console.log("Voice button clicked");
      this.startListening();
    });

    imageBtn?.addEventListener("click", async () => {
      const file = document.getElementById("leaf-image-input")?.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("image", file);
      formData.append("language", getCurrentLanguage());

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          body: formData
        });

        const data = await res.json();

        this.showMessage("user", "Image uploaded");
        this.showMessage("ai", data.response || data.error || "Error");
      } catch (e) {
        console.error("Image upload failed", e);
        this.showMessage("ai", "Image upload failed");
      }
    });

    console.log("Voice assistant buttons connected");
  }

  handleTextSubmit() {
    const input = document.getElementById("voice-text-input");
    if (!input) return;

    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }

    this.processCommand(text);
    input.value = "";
    input.focus();
  }

  startListening() {
    console.log("Voice click triggered");

    if (!this.recognition) {
      this.showMessage("ai", "Voice not supported. Use Chrome browser.");
      document.getElementById("voice-text-input")?.focus();
      return;
    }

    if (this.isListening) {
      return;
    }

    this.recognition.lang = langMap[getCurrentLanguage()] || "en-US";
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.isListening = true;

    this.recognition.onstart = () => {
      console.log("Speech recognition started");
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Speech recognized", transcript);
      this.processCommand(transcript);
    };

    this.recognition.onerror = (e) => {
      console.error("Speech error:", e);
      this.isListening = false;
      this.showMessage("ai", "Voice error: " + (e?.error || "unknown"));
      document.getElementById("voice-text-input")?.focus();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log("Speech recognition ended");
    };

    const startRecognition = () => {
      try {
        this.recognition.start();
      } catch (e) {
        console.error("Could not start recognition:", e);
        this.isListening = false;
        this.showMessage("ai", "Could not start listening");
        document.getElementById("voice-text-input")?.focus();
      }
    };

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("mediaDevices.getUserMedia not supported");
      startRecognition();
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log("Microphone access granted");
        startRecognition();
      })
      .catch((e) => {
        console.error("Microphone permission denied", e);
        this.isListening = false;
        this.showMessage("ai", "Microphone permission denied");
        document.getElementById("voice-text-input")?.focus();
      });
  }

  async processCommand(text) {
    this.showMessage("user", text);

    try {
      const res = await window.apiJson("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          language: getCurrentLanguage()
        }),
        timeoutMs: 6500,
      });

      if (!res.ok || !res.data) {
        this.showMessage("ai", res.error || "Error");
        return;
      }

      const reply = res.data.response || "";
      this.showMessage("ai", reply);
      this.speak(reply);

      if (res.data.action === "navigate" && res.data.page) {
        setTimeout(() => {
          window.location.href = res.data.page;
        }, 1500);
      }
    } catch (e) {
      console.error(e);
      this.showMessage("ai", "Error");
    }
  }

  showMessage(role, text) {
    const history = document.getElementById("voice-chat-history");
    if (!history) return;

    const msg = document.createElement("div");
    msg.className = `voice-msg ${role}-msg`;
    msg.textContent = text;
    history.appendChild(msg);
    history.scrollTop = history.scrollHeight;
  }

  speak(text) {
    if (!this.synthesis || !text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langMap[getCurrentLanguage()] || "en-US";
    utterance.rate = 0.85;
    utterance.volume = 1;

    this.synthesis.cancel();
    this.synthesis.speak(utterance);
  }
}

window.initVoiceAssistant = function () {
  if (window.farmingVoice) {
    window.farmingVoice.init();
    return window.farmingVoice;
  }

  const assistant = new FarmingVoiceAssistant();
  window.farmingVoice = assistant;

  const start = () => assistant.init();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  return assistant;
};
