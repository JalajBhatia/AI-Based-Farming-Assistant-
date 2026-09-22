/**
 * FarmSaathi — API base, auth guard, navbar, language, voice mic.
 */
(function () {
  const TOKEN_KEY = "farmsaathi_token";
  const LEGACY_TOKEN = "farmerToken";

  const DEFAULT_TIMEOUT_MS = 6500;
  const DEFAULT_RETRIES = 1;
  let authRedirectInProgress = false;
  const LOCAL_DEV_PORTS = new Set(["3000", "5173", "5500", "8080"]);
  const host = (window.location.hostname || "").toLowerCase();
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  const isFileProtocol = window.location.protocol === "file:";
  const metaApiBase = document.querySelector('meta[name="api-base"]')?.getAttribute("content") || "";
  const runtimeApiBase = window.__API_BASE__ || "";
  const configuredApiBase = String(runtimeApiBase || metaApiBase).trim();

  function trimTrailingSlash(v) {
    return String(v || "").replace(/\/+$/, "");
  }

  function resolveApiBase() {
    if (configuredApiBase) return trimTrailingSlash(configuredApiBase);
    if (isFileProtocol || isLocalHost || LOCAL_DEV_PORTS.has(window.location.port)) {
      return "http://localhost:5000";
    }
    return "";
  }

  window.API_BASE = resolveApiBase();

  window.buildApiUrl = function (path) {
    const p = String(path || "");
    if (/^https?:\/\//i.test(p)) return p;
    const normalizedPath = p.startsWith("/") ? p : "/" + p;
    return (window.API_BASE || "") + normalizedPath;
  };

  function getStoredFarmerProfile() {
    try {
      return JSON.parse(localStorage.getItem("farmerProfile") || "{}");
    } catch (err) {
      return {};
    }
  }

  window.getStoredFarmerProfile = getStoredFarmerProfile;

  window.fetchFarmerProfile = async function () {
    const res = await window.apiJson("/api/farmer/profile", {
      headers: window.getAuthHeaders(),
      timeoutMs: 6000,
      useLoader: false,
    });
    if (!res.ok || !res.data || res.data.success === false) {
      return null;
    }
    const profile = Object.assign({}, getStoredFarmerProfile(), res.data);
    localStorage.setItem("farmerProfile", JSON.stringify(profile));
    return profile;
  };

  let locationSyncPromise = null;

  function getCurrentPosition(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function canRequestGeolocation() {
    if (!navigator.geolocation) return false;
    if (!navigator.permissions || !navigator.permissions.query) return true;
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state !== "denied";
    } catch (err) {
      return true;
    }
  }

  window.ensureProfileLocation = async function (options) {
    const opts = options || {};
    if (!window.isLoggedIn || !window.isLoggedIn()) return getStoredFarmerProfile();
    if (locationSyncPromise) return locationSyncPromise;

    const existingProfile = getStoredFarmerProfile();
    const hasCoords =
      existingProfile.lat != null &&
      existingProfile.lng != null &&
      existingProfile.lat !== "" &&
      existingProfile.lng !== "";

    if (!opts.force && hasCoords) {
      return existingProfile;
    }

    locationSyncPromise = (async () => {
      const allowed = await canRequestGeolocation();
      if (!allowed) {
        return (await window.fetchFarmerProfile()) || existingProfile;
      }

      try {
        const pos = await getCurrentPosition({
          timeout: 10000,
          enableHighAccuracy: false,
          maximumAge: 300000,
        });
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const res = await window.apiJson("/api/farmer/location", {
          method: "POST",
          headers: window.getAuthHeaders(),
          body: JSON.stringify({ lat, lng }),
          timeoutMs: 7000,
          useLoader: false,
        });
        if (!res.ok || !res.data || res.data.success === false) {
          return (await window.fetchFarmerProfile()) || existingProfile;
        }
        const syncedProfile = Object.assign({}, existingProfile, {
          lat: res.data.lat,
          lng: res.data.lng,
          state: res.data.state || existingProfile.state || "",
          district: res.data.district || existingProfile.district || "",
          village: res.data.village || existingProfile.village || "",
        });
        localStorage.setItem("farmerProfile", JSON.stringify(syncedProfile));
        return syncedProfile;
      } catch (err) {
        return (await window.fetchFarmerProfile()) || existingProfile;
      }
    })();

    try {
      return await locationSyncPromise;
    } finally {
      locationSyncPromise = null;
    }
  };

  window.getWeatherLocationQuery = function (profile) {
    const prof = profile || getStoredFarmerProfile();
    if (prof.lat != null && prof.lng != null && prof.lat !== "" && prof.lng !== "") {
      return "lat=" + encodeURIComponent(prof.lat) + "&lng=" + encodeURIComponent(prof.lng);
    }
    const district = String(prof.district || "").trim();
    const state = String(prof.state || "").trim();
    if (district && state) {
      return "district=" + encodeURIComponent(district) + "&state=" + encodeURIComponent(state);
    }
    return "";
  };

  function mergeHeaders(base, extra) {
    return Object.assign({}, base || {}, extra || {});
  }

  function normalizeApiError(err) {
    if (err && err.name === "AbortError") return "Request timed out. Please try again.";
    if (err instanceof TypeError) return "Network error. Server not running or unreachable.";
    return (err && err.message) || "Request failed";
  }

  function isIdempotent(method) {
    const m = String(method || "GET").toUpperCase();
    return m === "GET" || m === "HEAD" || m === "OPTIONS";
  }

  function shouldRetryStatus(status, method) {
    return status >= 500 && isIdempotent(method);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isPublicPath(pathname) {
    const p = String(pathname || "").split("/").pop() || "";
    return (
      p === "login.html" ||
      p === "register.html" ||
      p === "forgot-password.html" ||
      p === "language-select.html"
    );
  }

  function handleUnauthorized() {
    if (authRedirectInProgress || isPublicPath(window.location.pathname)) return;
    authRedirectInProgress = true;
    window.setAuthToken(null);
    localStorage.removeItem("profileComplete");
    localStorage.removeItem("farmerProfile");
    if (typeof window.showToastOnce === "function") {
      window.showToastOnce("error", "Session expired. Please log in again.", "session-expired", 2500);
    } else {
      window.showToast?.("error", "Session expired. Please log in again.");
    }
    setTimeout(() => {
      window.location.href = "login.html";
    }, 150);
  }

  window.handleApiError = function (result, context) {
    if (!result || result.ok) return;
    if (result.status === 401 && !(context && context.skipAuthRedirect)) {
      handleUnauthorized();
    }
  };

  window.apiRequest = async function (path, options) {
    const opts = options || {};
    const timeoutMs = Number(opts.timeoutMs || DEFAULT_TIMEOUT_MS);
    const retries = Math.max(0, Number(opts.retries == null ? DEFAULT_RETRIES : opts.retries));
    const method = String(opts.method || "GET").toUpperCase();
    const useLoader = opts.useLoader !== false;
    const parentSignal = opts.signal || null;
    const requestOpts = Object.assign({}, opts);
    delete requestOpts.timeoutMs;
    delete requestOpts.retries;
    delete requestOpts.useLoader;
    if (useLoader) window.showLoader?.();
    try {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        if (parentSignal) {
          if (parentSignal.aborted) controller.abort();
          else parentSignal.addEventListener("abort", () => controller.abort(), { once: true });
        }
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const r = await fetch(window.buildApiUrl(path), Object.assign({}, requestOpts, { signal: controller.signal }));
          if (attempt < retries && shouldRetryStatus(r.status, method)) {
            await sleep(220);
            continue;
          }
          return r;
        } catch (err) {
          const shouldRetry = attempt < retries && (err?.name === "AbortError" || err instanceof TypeError);
          if (shouldRetry) {
            await sleep(220);
            continue;
          }
          throw err;
        } finally {
          clearTimeout(timeoutId);
        }
      }
      throw new Error("Request failed");
    } finally {
      if (useLoader) window.hideLoader?.();
    }
  };

  window.apiJson = async function (path, options) {
    const opts = options || {};
    try {
      const r = await window.apiRequest(path, opts);
      let data = null;
      try {
        data = await r.json();
      } catch (parseErr) {
        data = null;
      }
      if (!r.ok) {
        const error =
          (data && data.error) || (r.status >= 500 ? "Server not running or unavailable" : "Request failed");
        const result = { ok: false, status: r.status, data, error };
        window.handleApiError?.(result, opts);
        return result;
      }
      if (data && data.success === false) {
        const result = { ok: false, status: r.status, data, error: data.error || "Request failed" };
        window.handleApiError?.(result, opts);
        return result;
      }
      return { ok: true, status: r.status, data, error: null };
    } catch (err) {
      console.error(err);
      const result = {
        ok: false,
        status: 0,
        data: null,
        error: normalizeApiError(err),
      };
      window.handleApiError?.(result, opts);
      return result;
    }
  };

  function getToken() {
    let t = localStorage.getItem(TOKEN_KEY);
    if (!t && localStorage.getItem(LEGACY_TOKEN)) {
      t = localStorage.getItem(LEGACY_TOKEN);
      localStorage.setItem(TOKEN_KEY, t);
    }
    return t;
  }

  window.getAuthHeaders = function () {
    const token = getToken();
    const h = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = "Bearer " + token;
    return h;
  };

  window.getJsonHeaders = function (extra) {
    return mergeHeaders({ "Content-Type": "application/json" }, extra);
  };

  window.isLoggedIn = function () {
    return !!getToken();
  };

  window.setAuthToken = function (token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN);
  };

  const PUBLIC_PAGES = new Set([
    "login.html",
    "register.html",
    "community.html",
    "forgot-password.html",
  ]);

  window.guardRoutes = async function () {
    const path = (window.location.pathname || "").split("/").pop() || "";

    if (!localStorage.getItem("selectedLanguage")) {
      localStorage.setItem("selectedLanguage", "hi");
    }

    const token = getToken();
    if (!token && !PUBLIC_PAGES.has(path)) {
      window.location.href = "login.html";
      return false;
    }

    if (path === "login.html" || path === "register.html") {
      if (token) {
        const ok = await verifySession();
        if (ok) {
          window.location.href = "dashboard.html";
          return false;
        }
      }
      return true;
    }

    if (!token) return true;

    const user = await verifySession();
    if (!user) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN);
      localStorage.removeItem("profileComplete");
      if (!PUBLIC_PAGES.has(path)) {
        window.location.href = "login.html";
        return false;
      }
      return true;
    }

    const complete = user.state && String(user.state).trim() && user.district && String(user.district).trim();
    if (!complete && path !== "profile-setup.html") {
      window.location.href = "profile-setup.html";
      return false;
    }
    if (complete && path === "profile-setup.html") {
      window.location.href = "dashboard.html";
      return false;
    }

    if (user.theme) {
      document.documentElement.setAttribute("data-theme", user.theme);
      localStorage.setItem("theme", user.theme);
    }
    if (user.ui_mode) {
      document.documentElement.setAttribute("data-ui-mode", user.ui_mode);
      localStorage.setItem("uiMode", user.ui_mode);
    }
    if (user.preferred_language) {
      localStorage.setItem("selectedLanguage", user.preferred_language);
    }

    localStorage.setItem("profileComplete", complete ? "1" : "0");
    localStorage.setItem("farmerProfile", JSON.stringify(user));
    return true;
  };

  async function verifySession() {
    const res = await window.apiJson("/api/auth/me", { headers: window.getAuthHeaders(), timeoutMs: 6000 });
    if (!res.ok || !res.data || !res.data.user) return null;
    return res.data.user;
  }

  window.verifySession = verifySession;

  const LANG_OPTS = [
    { code: "hi", label: "हिंदी", flag: "🇮🇳" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "pa", label: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
    { code: "mr", label: "मराठी", flag: "🇮🇳" },
    { code: "te", label: "తెలుగు", flag: "🇮🇳" },
    { code: "ta", label: "தமிழ்", flag: "🇮🇳" },
    { code: "gu", label: "ગુજરાતી", flag: "🇮🇳" },
    { code: "bn", label: "বাংলা", flag: "🇮🇳" },
    { code: "kn", label: "ಕನ್ನಡ", flag: "🇮🇳" },
    { code: "ml", label: "മലയാളം", flag: "🇮🇳" },
    { code: "or", label: "ଓଡ଼ିଆ", flag: "🇮🇳" },
    { code: "as", label: "অসমীয়া", flag: "🇮🇳" },
  ];

  function injectLangDropdown(nav) {
    const wrap = document.createElement("div");
    wrap.className = "nav-lang-wrap";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-text-btn lang-btn";
    btn.id = "lang-toggle";
    const code = localStorage.getItem("selectedLanguage") || "hi";
    const cur = LANG_OPTS.find((x) => x.code === code) || LANG_OPTS[0];
    btn.innerHTML =
      "<span class=\"lang-flag\">" +
      cur.flag +
      "</span> <span class=\"lang-name\">" +
      cur.label +
      "</span> <span aria-hidden=\"true\">▾</span>";
    const dd = document.createElement("div");
    dd.className = "lang-dropdown";
    dd.id = "lang-dropdown";
    dd.hidden = true;
    LANG_OPTS.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lang-opt";
      b.innerHTML = "<span>" + o.flag + "</span> " + o.label;
      b.addEventListener("click", () => {
        window.setLanguage(o.code);
        dd.hidden = true;
        btn.querySelector(".lang-flag").textContent = o.flag;
        btn.querySelector(".lang-name").textContent = o.label;
      });
      dd.appendChild(b);
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      dd.hidden = !dd.hidden;
    });
    document.addEventListener("click", () => {
      dd.hidden = true;
    });
    wrap.appendChild(btn);
    wrap.appendChild(dd);
    nav.querySelector(".nav-actions")?.appendChild(wrap);
  }

  window.injectMainNav = function () {
    const path = (window.location.pathname || "").split("/").pop() || "";
    if (
      path === "login.html" ||
      path === "register.html" ||
      path === "forgot-password.html" ||
      path === "language-select.html" ||
      document.getElementById("main-nav")
    )
      return;

    const authed = !!getToken();
    const nav = document.createElement("nav");
    nav.className = "farmsaathi-nav";
    nav.id = "main-nav";
    const profileOrLogin = authed
      ? `<a href="profile.html" class="nav-text-btn nav-avatar" id="nav-avatar" title="Profile">
          <span>👤</span>
          <span data-i18n="profile">Profile</span>
        </a>`
      : `<a href="login.html" class="nav-text-btn" id="nav-login">
          <span>🔑</span>
          <span data-i18n="login">Login</span>
        </a>`;
    nav.innerHTML = `
      <div class="nav-brand">
        <a href="${authed ? "dashboard.html" : "community.html"}" class="nav-brand-link">
          <img src="assets/logo.svg" alt="" width="32" height="32" />
          <span>FarmSaathi</span>
        </a>
      </div>
      <div class="nav-center" id="weather-mini"></div>
      <div class="nav-actions">
        <button type="button" class="nav-text-btn" id="theme-toggle" title="Theme">
          <span class="theme-ico">🌙</span>
          <span class="theme-label">Dark</span>
        </button>
        <button type="button" class="nav-text-btn" id="notif-btn" title="Alerts">
          <span>🔔</span>
          <span>Alerts</span>
          <span class="notif-badge" id="notif-count">0</span>
        </button>
        ${profileOrLogin}
      </div>
    `;
    document.body.insertBefore(nav, document.body.firstChild);

    injectLangDropdown(nav);
    if (typeof window.initTheme === "function") window.initTheme();
    if (typeof window.updateThemeIcon === "function") {
      window.updateThemeIcon(document.documentElement.getAttribute("data-theme") || "light");
    }
    document.getElementById("theme-toggle")?.addEventListener("click", () => window.toggleTheme());

    if (authed) {
      loadNavWeatherMini();
    } else {
      const w = document.getElementById("weather-mini");
      if (w) w.innerHTML = "<span class=\"weather-mini-city\">FarmSaathi</span>";
    }
  };

  async function loadNavWeatherMini() {
    const el = document.getElementById("weather-mini");
    if (!el) return;
    const prof = (await window.fetchFarmerProfile?.()) || getStoredFarmerProfile();
    const q = window.getWeatherLocationQuery(prof);
    if (!q) {
      el.textContent = "";
      return;
    }
    try {
      const res = await window.apiJson("/api/weather?" + q, { timeoutMs: 6000 });
      const d = res.data;
      if (res.ok && d && d.success && d.today) {
        el.innerHTML =
          "<span class=\"weather-mini-ico\">🌤️</span> <span class=\"weather-mini-temp\">" +
          (d.today.temp_max != null ? Math.round(d.today.temp_max) + "°C" : "") +
          "</span> <span class=\"weather-mini-city\">" +
          (d.city || prof.district || "") +
          "</span>";
      }
    } catch (e) {
      el.textContent = "";
    }
  }

  window.setLanguage = function (code) {
    localStorage.setItem("selectedLanguage", code);
    document.documentElement.lang = code === "en" ? "en" : code;
    if (typeof applyTranslations === "function") applyTranslations(document);
    window.dispatchEvent(new CustomEvent("languagechange", { detail: { code } }));
    if (window.isLoggedIn()) {
      window.apiJson("/api/farmer/profile", {
        method: "PUT",
        headers: window.getAuthHeaders(),
        body: JSON.stringify({ preferred_language: code }),
      }).catch(() => {});
    }
  };

  window.attachLangButton = function () {
    document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("lang-toggle")?.click();
      });
    });
  };

  window.attachVoiceFloating = function () {
    // Disabled - replaced by chatbot widget
    return;
  };

  document.addEventListener("DOMContentLoaded", async () => {
    document.documentElement.setAttribute(
      "data-ui-mode",
      localStorage.getItem("uiMode") || document.documentElement.getAttribute("data-ui-mode") || "smart"
    );
    const path = (window.location.pathname || "").split("/").pop() || "";
    const skipGuard =
      PUBLIC_PAGES.has(path) ||
      path === "language-select.html" ||
      path === "" ||
      path === "index.html";
    if (!skipGuard) {
      await window.guardRoutes();
    }
    if (window.isLoggedIn && window.isLoggedIn()) {
      const shouldForceLocation = path === "dashboard.html";
      window.ensureProfileLocation({ force: shouldForceLocation }).catch(() => {});
    }
    if (typeof applyTranslations === "function") applyTranslations(document);
    window.injectMainNav();
    window.attachLangButton();
    if (typeof window.initVoiceAssistant === "function") window.initVoiceAssistant();
    // Replaced by chatbot widget
    // window.attachVoiceFloating();
    if (typeof window.initChatbotWidget === "function") window.initChatbotWidget();
    if (typeof window.initGlobalUi === "function") window.initGlobalUi();
  });
})();
