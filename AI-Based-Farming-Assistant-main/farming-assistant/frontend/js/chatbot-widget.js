/**
 * Chatbot Widget — Floating chat button with full popup interface
 * Replaces old voice button with integrated chat + voice system
 */
(function () {
  let chatbotState = {
    isOpen: false,
    isMinimized: false,
    isFullscreen: false,
    previousSize: null,
  };

  const CHAT_HISTORY_KEY = "farmsaathi_chat_history";

  function getChatHistory() {
    try {
      return JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveChatHistory(history) {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(-50))); // Keep last 50 messages
    } catch (e) {
      console.error("Failed to save chat history", e);
    }
  }

  function addMessageToHistory(role, content) {
    const history = getChatHistory();
    history.push({
      role,
      content,
      timestamp: Date.now(),
    });
    saveChatHistory(history);
  }

  function createChatbotButton() {
    if (document.getElementById("chatbot-float-btn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "chatbot-float-btn";
    btn.className = "chatbot-float-btn";
    btn.innerHTML = '<span class="chat-icon">💬</span>';
    btn.setAttribute("aria-label", "Open Farm AI Assistant");
    btn.addEventListener("click", toggleChatbot);

    document.body.appendChild(btn);
  }

  function createChatbotContainer() {
    if (document.getElementById("chatbot-container")) return;

    const container = document.createElement("div");
    container.id = "chatbot-container";
    container.className = "chatbot-container";
    container.innerHTML = `
      <div class="chatbot-header">
        <div class="chatbot-title">
          <span class="chatbot-icon">🌾</span>
          <span class="chatbot-title-text">Farm AI Assistant</span>
        </div>
        <div class="chatbot-controls">
          <button type="button" class="chatbot-control-btn" id="chatbot-minimize" title="Minimize">
            <span>–</span>
          </button>
          <button type="button" class="chatbot-control-btn" id="chatbot-fullscreen" title="Fullscreen">
            <span>⬜</span>
          </button>
          <button type="button" class="chatbot-control-btn" id="chatbot-close" title="Close">
            <span>✕</span>
          </button>
        </div>
      </div>
      <div class="chatbot-body">
        <div id="chatbot-messages" class="chatbot-messages"></div>
        <div id="chatbot-typing" class="chatbot-typing" style="display: none;">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-text">AI is typing...</span>
        </div>
      </div>
      <div class="chatbot-input-container">
        <input type="text" id="chatbot-text-input" class="chatbot-text-input" placeholder="Type your message..." />
        <button type="button" id="chatbot-voice-btn" class="chatbot-voice-btn" title="Voice Input">
          <span>🎤</span>
        </button>
        <button type="button" id="chatbot-send-btn" class="chatbot-send-btn" title="Send">
          <span>➤</span>
        </button>
      </div>
      <div class="chatbot-footer">
        <span>Powered by AI</span>
      </div>
    `;

    document.body.appendChild(container);

    // Attach event listeners
    document.getElementById("chatbot-minimize")?.addEventListener("click", minimizeChatbot);
    document.getElementById("chatbot-fullscreen")?.addEventListener("click", toggleFullscreen);
    document.getElementById("chatbot-close")?.addEventListener("click", closeChatbot);
    document.getElementById("chatbot-send-btn")?.addEventListener("click", sendMessage);
    document.getElementById("chatbot-voice-btn")?.addEventListener("click", startVoiceInput);
    document.getElementById("chatbot-text-input")?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    // Load chat history
    loadChatHistory();
  }

  function loadChatHistory() {
    const messagesContainer = document.getElementById("chatbot-messages");
    if (!messagesContainer) return;

    const history = getChatHistory();
    messagesContainer.innerHTML = "";

    if (history.length === 0) {
      // Welcome message
      addMessageToUI("ai", "Hello! I'm your Farm AI Assistant. How can I help you today? 🌾");
    } else {
      history.forEach((msg) => {
        addMessageToUI(msg.role, msg.content, false);
      });
    }

    scrollToBottom();
  }

  function addMessageToUI(role, content, saveToHistory = true) {
    const messagesContainer = document.getElementById("chatbot-messages");
    if (!messagesContainer) return;

    const msgDiv = document.createElement("div");
    msgDiv.className = `chatbot-message ${role === "user" ? "user-message" : "ai-message"}`;
    msgDiv.innerHTML = `
      <div class="message-content">${escapeHtml(content)}</div>
      <div class="message-time">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
    `;

    messagesContainer.appendChild(msgDiv);
    scrollToBottom();

    if (saveToHistory) {
      addMessageToHistory(role, content);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function scrollToBottom() {
    const messagesContainer = document.getElementById("chatbot-messages");
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function showTypingIndicator() {
    const typingEl = document.getElementById("chatbot-typing");
    if (typingEl) {
      typingEl.style.display = "flex";
      scrollToBottom();
    }
  }

  function hideTypingIndicator() {
    const typingEl = document.getElementById("chatbot-typing");
    if (typingEl) {
      typingEl.style.display = "none";
    }
  }

  async function sendMessage() {
    const input = document.getElementById("chatbot-text-input");
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    // Add user message
    addMessageToUI("user", message);
    input.value = "";

    // Show typing indicator
    showTypingIndicator();

    // Get current language
    const language = localStorage.getItem("language") || localStorage.getItem("selectedLanguage") || "en";

    try {
      const res = await window.apiJson("/api/voice", {
        method: "POST",
        headers: window.getAuthHeaders(),
        body: JSON.stringify({ message, language }),
        timeoutMs: 15000,
      });

      hideTypingIndicator();

      if (res.ok && res.data && res.data.response) {
        const aiResponse = res.data.response;
        addMessageToUI("ai", aiResponse);

        // Auto voice response
        speakResponse(aiResponse, language);
      } else {
        addMessageToUI("ai", "Sorry, I couldn't process your request. Please try again.");
      }
    } catch (e) {
      hideTypingIndicator();
      addMessageToUI("ai", "Network error. Please check your connection and try again.");
    }
  }

  function speakResponse(text, language) {
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Language mapping
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

    utterance.lang = langMap[language] || "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  }

  function startVoiceInput() {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      window.showToast?.("error", "Voice input not supported in this browser");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    const language = localStorage.getItem("language") || localStorage.getItem("selectedLanguage") || "en";
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

    recognition.lang = langMap[language] || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    const voiceBtn = document.getElementById("chatbot-voice-btn");
    if (voiceBtn) {
      voiceBtn.classList.add("listening");
      voiceBtn.innerHTML = "<span>🔴</span>";
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById("chatbot-text-input");
      if (input) {
        input.value = transcript;
      }
      if (voiceBtn) {
        voiceBtn.classList.remove("listening");
        voiceBtn.innerHTML = "<span>🎤</span>";
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (voiceBtn) {
        voiceBtn.classList.remove("listening");
        voiceBtn.innerHTML = "<span>🎤</span>";
      }
      window.showToast?.("error", "Voice input failed. Please try again.");
    };

    recognition.onend = () => {
      if (voiceBtn) {
        voiceBtn.classList.remove("listening");
        voiceBtn.innerHTML = "<span>🎤</span>";
      }
    };

    recognition.start();
  }

  function toggleChatbot() {
    if (chatbotState.isOpen) {
      closeChatbot();
    } else {
      openChatbot();
    }
  }

  function openChatbot() {
    const container = document.getElementById("chatbot-container");
    const btn = document.getElementById("chatbot-float-btn");

    if (!container) {
      createChatbotContainer();
    }

    const containerEl = document.getElementById("chatbot-container");
    if (containerEl) {
      containerEl.classList.add("open");
      chatbotState.isOpen = true;
    }

    if (btn) {
      btn.style.display = "none";
    }

    // Focus input
    setTimeout(() => {
      document.getElementById("chatbot-text-input")?.focus();
    }, 300);
  }

  function closeChatbot() {
    const container = document.getElementById("chatbot-container");
    const btn = document.getElementById("chatbot-float-btn");

    if (container) {
      container.classList.remove("open", "minimized", "fullscreen");
      chatbotState.isOpen = false;
      chatbotState.isMinimized = false;
      chatbotState.isFullscreen = false;
    }

    if (btn) {
      btn.style.display = "flex";
    }
  }

  function minimizeChatbot() {
    const container = document.getElementById("chatbot-container");
    if (!container) return;

    if (chatbotState.isMinimized) {
      // Restore
      container.classList.remove("minimized");
      chatbotState.isMinimized = false;
    } else {
      // Minimize
      container.classList.add("minimized");
      container.classList.remove("fullscreen");
      chatbotState.isMinimized = true;
      chatbotState.isFullscreen = false;
    }
  }

  function toggleFullscreen() {
    const container = document.getElementById("chatbot-container");
    if (!container) return;

    if (chatbotState.isFullscreen) {
      // Exit fullscreen
      container.classList.remove("fullscreen");
      chatbotState.isFullscreen = false;
    } else {
      // Enter fullscreen
      container.classList.add("fullscreen");
      container.classList.remove("minimized");
      chatbotState.isFullscreen = true;
      chatbotState.isMinimized = false;
    }
  }

  // Initialize chatbot widget
  window.initChatbotWidget = function () {
    if (!window.isLoggedIn || !window.isLoggedIn()) return;

    createChatbotButton();
    createChatbotContainer();
  };

  // Auto-initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => window.initChatbotWidget?.(), 100);
    });
  } else {
    setTimeout(() => window.initChatbotWidget?.(), 100);
  }
})();
