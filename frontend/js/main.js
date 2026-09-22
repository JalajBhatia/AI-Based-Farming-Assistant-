/**
 * FarmSaathi - global UI after shell (nav) is ready; notifications badge.
 */
(function () {
  function msg(key, fallback) {
    return typeof t === "function" ? t(key) : fallback;
  }

  function notify(type, text, key) {
    if (typeof window.showToastOnce === "function") {
      window.showToastOnce(type, text, key || type + ":" + text, 2000);
      return;
    }
    window.showToast(type, text);
  }

  function attachNotifButton() {
    const btn = document.getElementById("notif-btn");
    if (!btn || btn.dataset.fsNotifBound) return;
    btn.dataset.fsNotifBound = "1";

    btn.addEventListener("click", async () => {
      if (!window.isLoggedIn || !window.isLoggedIn()) {
        notify("info", msg("login", "Please log in to see alerts"), "notif-login-required");
        return;
      }

      try {
        window.showLoader();
        const res = await window.apiJson("/api/farmer/dashboard", {
          headers: window.getAuthHeaders(),
          timeoutMs: 6500,
        });

        if (!res.ok) {
          notify("error", res.error || msg("api_error", "Something went wrong"), "notif-fetch-error");
          return;
        }

        const d = res.data || {};
        const alerts = d.success && Array.isArray(d.pest_alerts) ? d.pest_alerts : [];
        if (!alerts.length) {
          notify("success", msg("no_alerts", "No alerts right now"), "notif-none");
        } else {
          const lines = alerts.slice(0, 6).map((a) => a.title_hi || a.title || "-");
          notify("info", lines.join(" | "), "notif-lines");
        }
      } catch (e) {
        console.error(e);
        notify("error", msg("api_error", "Something went wrong"), "notif-fetch-error");
      } finally {
        window.hideLoader();
      }
    });
  }

  async function refreshNotifBadge() {
    const badge = document.getElementById("notif-count");
    if (!badge || !window.isLoggedIn || !window.isLoggedIn()) return;

    try {
      const res = await window.apiJson("/api/farmer/dashboard", {
        headers: window.getAuthHeaders(),
        timeoutMs: 6500,
      });
      const d = res.data || {};
      if (res.ok && d.success && Array.isArray(d.pest_alerts)) {
        badge.textContent = String(d.pest_alerts.length);
      }
    } catch (e) {
      console.error(e);
    }
  }

  window.initGlobalUi = function () {
    document.body.classList.add("fs-app");
    attachNotifButton();
    refreshNotifBadge();
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("fs-app");
  });
})();
