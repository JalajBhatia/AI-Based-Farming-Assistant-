(function () {
  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderAdviceCard(el, text) {
    if (!el) return;
    el.innerHTML =
      '<div class="card" style="padding:16px; border-radius:18px; background:rgba(255,255,255,0.72)">' +
      '<div style="white-space: pre-wrap; line-height:1.7;">' +
      escapeHtml(text) +
      "</div></div>";
  }

  window.initAiAdvisorPage = function () {
    document.getElementById("btn-reco")?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-reco");
      let prof = {};
      try {
        prof = JSON.parse(localStorage.getItem("farmerProfile") || "{}");
      } catch (e) {}
      const lat = prof.lat != null ? prof.lat : 20.59;
      const lng = prof.lng != null ? prof.lng : 78.96;
      const crop = prof.main_crop || "General farming";
      const state = prof.state || "India";
      const m = new Date().getMonth() + 1;
      const out = document.getElementById("reco-out");
      try {
        window.showLoader?.();
        window.setButtonBusy?.(btn, true, typeof t === "function" ? t("loading") : "...");
        const res = await window.apiJson(
          "/api/advisor/crop-recommendation?lat=" +
            lat +
            "&lng=" +
            lng +
            "&month=" +
            m +
            "&crop=" +
            encodeURIComponent(crop) +
            "&state=" +
            encodeURIComponent(state),
          { timeoutMs: 12000 }
        );
        const d = res.data || {};
        renderAdviceCard(
          out,
          res.ok && d.success ? d.raw || JSON.stringify(d.recommendations, null, 2) : d.error || res.error || "Error"
        );
        if (res.ok && d.success) window.showToast?.("success", typeof t === "function" ? t("save") : "OK");
        else window.showToast?.("error", d.error || res.error || (typeof t === "function" ? t("api_error") : "Error"));
      } catch (e) {
        console.error(e);
        renderAdviceCard(out, typeof t === "function" ? t("api_error") : "Error");
        window.showToast?.("error", typeof t === "function" ? t("api_error") : "Error");
      } finally {
        window.setButtonBusy?.(btn, false);
        window.hideLoader?.();
      }
    });

    document.getElementById("btn-cal")?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-cal");
      const el = document.getElementById("cal-out");
      let prof = {};
      try {
        prof = JSON.parse(localStorage.getItem("farmerProfile") || "{}");
      } catch (e) {}
      const crop = (prof.main_crop || "wheat").toLowerCase();
      const state = prof.state || "";
      try {
        window.setButtonBusy?.(btn, true, typeof t === "function" ? t("loading") : "...");
        const res = await window.apiJson(
          "/api/advisor/crop-calendar?crop=" + encodeURIComponent(crop) + "&state=" + encodeURIComponent(state),
          { timeoutMs: 7000 }
        );
        const d = res.data || {};
        if (!el) return;
        if (!res.ok || !d.success) {
          el.textContent = d.error || res.error || "Error";
          window.showToast?.("error", d.error || res.error || (typeof t === "function" ? t("api_error") : "Error"));
          return;
        }
        el.innerHTML = (d.calendar || [])
          .map(
            (x) =>
              "<div style=\"margin-bottom:8px\"><strong>M" +
              x.month +
              "</strong> " +
              x.activity +
              " - " +
              (x.description_hindi || "") +
              "</div>"
          )
          .join("");
        window.showToast?.("success", typeof t === "function" ? t("save") : "OK");
      } catch (e) {
        console.error(e);
        if (el) el.textContent = typeof t === "function" ? t("api_error") : "Error";
        window.showToast?.("error", typeof t === "function" ? t("api_error") : "Error");
      } finally {
        window.setButtonBusy?.(btn, false);
      }
    });

    document.getElementById("btn-pest")?.addEventListener("click", async () => {
      const btn = document.getElementById("btn-pest");
      const el = document.getElementById("pest-out");
      let prof = {};
      try {
        prof = JSON.parse(localStorage.getItem("farmerProfile") || "{}");
      } catch (e) {}
      const q =
        "?state=" +
        encodeURIComponent(prof.state || "") +
        "&district=" +
        encodeURIComponent(prof.district || "") +
        "&crop=" +
        encodeURIComponent((prof.main_crop || "").toLowerCase());
      try {
        window.setButtonBusy?.(btn, true, typeof t === "function" ? t("loading") : "...");
        const res = await window.apiJson("/api/advisor/pest-alerts" + q, { timeoutMs: 7000 });
        const d = res.data || {};
        if (!el) return;
        if (!res.ok || !d.success) {
          el.textContent = d.error || res.error || "Error";
          window.showToast?.("error", d.error || res.error || (typeof t === "function" ? t("api_error") : "Error"));
          return;
        }
        el.innerHTML =
          (d.summary_hi ? "<p><strong>सारांश:</strong> " + d.summary_hi + "</p>" : "") +
          (d.alerts || [])
            .map(
              (a) =>
                "<div class=\"card\" style=\"padding:10px;margin-bottom:8px\">" +
                (a.title_hi || a.title) +
                "</div>"
            )
            .join("");
        window.showToast?.("success", typeof t === "function" ? t("save") : "OK");
      } catch (e) {
        console.error(e);
        if (el) el.textContent = typeof t === "function" ? t("api_error") : "Error";
        window.showToast?.("error", typeof t === "function" ? t("api_error") : "Error");
      } finally {
        window.setButtonBusy?.(btn, false);
      }
    });
  };
})();
