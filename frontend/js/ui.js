/**
 * FarmSaathi — global loader, toasts, button busy state.
 */
(function () {
  let loaderCount = 0;

  function ensureLoaderEl() {
    let el = document.getElementById("fs-global-loader");
    if (!el) {
      el = document.createElement("div");
      el.id = "fs-global-loader";
      el.className = "fs-global-loader";
      el.hidden = true;
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.innerHTML =
        "<div class=\"fs-loader-inner\"><span class=\"plant-loader\" aria-hidden=\"true\">🌱</span><span class=\"fs-loader-text\">Loading…</span></div>";
      document.body.appendChild(el);
    }
    return el;
  }

  window.showLoader = function () {
    loaderCount++;
    const el = ensureLoaderEl();
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-visible"));
  };

  window.hideLoader = function () {
    loaderCount = Math.max(0, loaderCount - 1);
    if (loaderCount > 0) return;
    const el = document.getElementById("fs-global-loader");
    if (el) {
      el.classList.remove("is-visible");
      el.hidden = true;
    }
  };

  function ensureToastStack() {
    let s = document.getElementById("fs-toast-stack");
    if (!s) {
      s = document.createElement("div");
      s.id = "fs-toast-stack";
      s.className = "fs-toast-stack";
      document.body.appendChild(s);
    }
    return s;
  }

  let toastId = 0;
  const lastToastAt = new Map();
  window.showToast = function (type, message) {
    const stack = ensureToastStack();
    const div = document.createElement("div");
    div.className = "fs-toast fs-toast--" + String(type || "info");
    div.setAttribute("role", "alert");
    div.textContent = message == null ? "" : String(message);
    stack.appendChild(div);
    requestAnimationFrame(() => div.classList.add("fs-toast--show"));
    const ms = type === "error" ? 5200 : 3600;
    setTimeout(() => {
      div.classList.remove("fs-toast--show");
      setTimeout(() => div.remove(), 280);
    }, ms);
  };

  window.showToastOnce = function (type, message, key, cooldownMs) {
    const k = String(key || type + ":" + message);
    const cooldown = Number(cooldownMs || 1800);
    const now = Date.now();
    const last = Number(lastToastAt.get(k) || 0);
    if (now - last < cooldown) return;
    lastToastAt.set(k, now);
    window.showToast(type, message);
  };

  window.setButtonBusy = function (btn, busy, busyLabel) {
    if (!btn) return;
    if (busy) {
      if (!btn.dataset.fsLabel) btn.dataset.fsLabel = btn.innerHTML;
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.innerHTML =
        "<span class=\"fs-spinner\" aria-hidden=\"true\"></span><span>" +
        (busyLabel || "…") +
        "</span>";
    } else {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      if (btn.dataset.fsLabel != null) {
        btn.innerHTML = btn.dataset.fsLabel;
        delete btn.dataset.fsLabel;
      }
    }
  };
})();
