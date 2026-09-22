# 🚀 CHATBOT WIDGET - QUICK REFERENCE

## 📦 FILES

```
frontend/
├── css/
│   └── chatbot-widget.css          ← Widget styles
├── js/
│   └── chatbot-widget.js           ← Widget logic
```

---

## 🔌 INTEGRATION (2 LINES)

```html
<!-- In <head> -->
<link rel="stylesheet" href="css/chatbot-widget.css" />

<!-- Before </body> -->
<script src="js/chatbot-widget.js"></script>
```

---

## 🎨 VISUAL COMPONENTS

```
┌─────────────────────────────────┐
│ 🌾 Farm AI Assistant    [–][⬜][✕] │  ← Header
├─────────────────────────────────┤
│                                 │
│  AI: Hello! 🌾                  │  ← AI Message (left)
│                                 │
│                    User: Hi 👋  │  ← User Message (right)
│                                 │
│  [Typing...]                    │  ← Typing Indicator
│                                 │
├─────────────────────────────────┤
│ [Type message...] [🎤] [➤]      │  ← Input Bar
├─────────────────────────────────┤
│         Powered by AI           │  ← Footer
└─────────────────────────────────┘

[💬] ← Floating Button (bottom-right)
```

---

## 🎯 KEY FUNCTIONS

```javascript
// Initialize (auto-called)
window.initChatbotWidget()

// Manual controls
openChatbot()          // Open popup
closeChatbot()         // Close popup
toggleChatbot()        // Toggle open/close
minimizeChatbot()      // Minimize to header
toggleFullscreen()     // Toggle fullscreen

// Messaging
sendMessage()          // Send text message
startVoiceInput()      // Start voice recording
speakResponse(text, lang) // Auto voice output

// History
getChatHistory()       // Get all messages
saveChatHistory(arr)   // Save messages
addMessageToHistory(role, content) // Add message
```

---

## 🎨 CSS CLASSES

```css
/* Main Components */
.chatbot-float-btn          /* Floating button */
.chatbot-container          /* Main popup */
.chatbot-header             /* Header bar */
.chatbot-body               /* Message area */
.chatbot-input-container    /* Input bar */
.chatbot-footer             /* Footer */

/* States */
.chatbot-container.open         /* Visible */
.chatbot-container.minimized    /* Minimized */
.chatbot-container.fullscreen   /* Fullscreen */

/* Messages */
.chatbot-message            /* Message wrapper */
.user-message               /* User bubble */
.ai-message                 /* AI bubble */
.message-content            /* Message text */
.message-time               /* Timestamp */

/* Typing */
.chatbot-typing             /* Typing container */
.typing-dot                 /* Bouncing dot */
.typing-text                /* "AI is typing..." */

/* Buttons */
.chatbot-control-btn        /* Header controls */
.chatbot-voice-btn          /* Voice input */
.chatbot-send-btn           /* Send button */
.chatbot-voice-btn.listening /* Recording state */
```

---

## 📱 RESPONSIVE SIZES

```css
/* Desktop */
width: 380px
height: 600px
bottom: 20px
right: 20px

/* Mobile (max-width: 768px) */
width: 100vw
height: 100vh
bottom: 0
right: 0

/* Fullscreen */
width: 100vw
height: 100vh
```

---

## 🌐 API INTEGRATION

```javascript
// Endpoint
POST /api/voice

// Request
{
  "message": "User's message",
  "language": "hi" // or en, pa, mr, te, ta, gu, bn, kn, ml, or, as
}

// Response
{
  "success": true,
  "response": "AI's response",
  "intent": "weather",
  "action": "...",
  "page": "..."
}
```

---

## 💾 LOCALSTORAGE

```javascript
// Chat History
localStorage.getItem("farmsaathi_chat_history")
// Format: [{ role, content, timestamp }, ...]

// Language
localStorage.getItem("language")
localStorage.getItem("selectedLanguage")
```

---

## 🎤 VOICE SUPPORT

```javascript
// Languages Supported
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
}

// Voice Input (SpeechRecognition)
const recognition = new SpeechRecognition()
recognition.lang = langMap[language]
recognition.start()

// Voice Output (SpeechSynthesis)
const utterance = new SpeechSynthesisUtterance(text)
utterance.lang = langMap[language]
speechSynthesis.speak(utterance)
```

---

## 🎨 ANIMATIONS

```css
/* Button Pulse */
@keyframes chat-pulse {
  0%, 100% { box-shadow: 0 8px 24px rgba(5,150,105,0.4); }
  50% { box-shadow: 0 8px 24px rgba(5,150,105,0.4), 0 0 0 8px rgba(5,150,105,0.1); }
}

/* Message Slide In */
@keyframes message-slide-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Typing Dots */
@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-8px); opacity: 1; }
}

/* Voice Pulse */
@keyframes voice-pulse {
  0%, 100% { box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
  50% { box-shadow: 0 4px 12px rgba(239,68,68,0.3), 0 0 0 8px rgba(239,68,68,0.2); }
}
```

---

## 🌙 DARK THEME

```css
[data-theme="dark"] .chatbot-container {
  background: #1f2937;
}

[data-theme="dark"] .chatbot-body {
  background: #111827;
}

[data-theme="dark"] .ai-message .message-content {
  background: #1f2937;
  color: #f9fafb;
}
```

---

## 🔧 CUSTOMIZATION

### Change Colors
```css
/* Primary Green */
background: linear-gradient(135deg, #059669, #10b981);

/* Voice Orange */
background: linear-gradient(135deg, #fbbf24, #f59e0b);

/* Listening Red */
background: linear-gradient(135deg, #ef4444, #dc2626);
```

### Change Size
```css
.chatbot-container {
  width: 400px;  /* Change width */
  height: 650px; /* Change height */
}
```

### Change Position
```css
.chatbot-float-btn {
  bottom: 30px;  /* Change bottom */
  right: 30px;   /* Change right */
}
```

---

## 🐛 DEBUGGING

```javascript
// Check if widget initialized
console.log(typeof window.initChatbotWidget) // Should be "function"

// Check chat history
console.log(localStorage.getItem("farmsaathi_chat_history"))

// Check if button exists
console.log(document.getElementById("chatbot-float-btn"))

// Check if container exists
console.log(document.getElementById("chatbot-container"))

// Check voice support
console.log("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
console.log("speechSynthesis" in window)
```

---

## ✅ CHECKLIST

- [ ] CSS file linked in `<head>`
- [ ] JS file loaded before `</body>`
- [ ] User is logged in
- [ ] No console errors
- [ ] Button appears bottom-right
- [ ] Popup opens on click
- [ ] Messages send/receive
- [ ] Voice input works (Chrome/Edge)
- [ ] Voice output works
- [ ] History persists
- [ ] Mobile responsive
- [ ] Dark theme works

---

## 📚 DOCUMENTATION

- **Full Guide**: `CHATBOT_WIDGET_INTEGRATION.md`
- **Summary**: `CHATBOT_WIDGET_SUMMARY.md`
- **Snippet**: `CHATBOT_INTEGRATION_SNIPPET.html`

---

## 🆘 SUPPORT

### Common Issues

**Button not showing**
- Check if user is logged in
- Verify JS file is loaded
- Check `window.isLoggedIn()`

**Voice not working**
- Use Chrome or Edge
- Check microphone permissions
- Test `navigator.mediaDevices.getUserMedia()`

**Messages not sending**
- Check network tab
- Verify `/api/voice` endpoint
- Check JWT token

**History not saving**
- Check localStorage enabled
- Verify not in incognito mode
- Check storage quota

---

## 🎉 DONE!

Widget is ready to use. Just add 2 lines of code to any page!
