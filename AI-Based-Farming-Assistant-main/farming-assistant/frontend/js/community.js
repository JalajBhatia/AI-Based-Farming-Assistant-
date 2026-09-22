(function () {
  window.initCommunityFeed = async function () {
    const feed = document.getElementById("feed");
    const fab = document.getElementById("fab-post");
    if (window.isLoggedIn && window.isLoggedIn()) fab.hidden = false;

    fab?.addEventListener("click", async () => {
      const title = prompt("Title");
      if (!title) return;
      const content = prompt("Content");
      if (!content) return;
      try {
        const res = await window.apiJson("/api/community/posts", {
          method: "POST",
          headers: window.getAuthHeaders(),
          body: JSON.stringify({ title, content, category: "general" }),
          timeoutMs: 7000,
        });
        const j = res.data || {};
        if (!res.ok || !j.success) {
          window.showToast?.("error", j.error || res.error || (typeof t === "function" ? t("api_error") : "Failed"));
          return;
        }
        window.showToast?.("success", "Posted");
        await loadPosts();
      } catch (e) {
        console.error(e);
        window.showToast?.("error", typeof t === "function" ? t("api_error") : "Failed");
      }
    });

    let category = "";
    document.querySelectorAll("#cat-tabs .tab-btn").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll("#cat-tabs .tab-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        category = b.getAttribute("data-cat") || "";
        loadPosts();
      });
    });

    async function loadPosts() {
      let prof = {};
      try {
        prof = JSON.parse(localStorage.getItem("farmerProfile") || "{}");
      } catch (e) {}
      const q =
        "?limit=15&state=" +
        encodeURIComponent(prof.state || "") +
        (category ? "&category=" + encodeURIComponent(category) : "");
      let d;
      try {
        const res = await window.apiJson("/api/community/posts" + q, { timeoutMs: 7000 });
        d = res.data || {};
        if (!res.ok) throw new Error(res.error || "Request failed");
      } catch (e) {
        if (feed) feed.innerHTML = "<p class=\"err\">" + (typeof t === "function" ? t("api_error") : "Error") + "</p>";
        return;
      }
      if (!d.success || !feed) {
        if (feed && !d.success) feed.innerHTML = "<p class=\"err\">" + (d.error || (typeof t === "function" ? t("api_error") : "Error")) + "</p>";
        return;
      }
      feed.innerHTML = (d.posts || [])
        .map(
          (p) =>
            "<article class=\"card post-card\" style=\"margin-bottom:12px;padding:16px\">" +
            "<header style=\"display:flex;justify-content:space-between;gap:8px\"><strong>" +
            (p.author?.full_name || p.author?.username || "-") +
            "</strong><small>" +
            (p.created_at || "").slice(0, 16) +
            "</small></header>" +
            "<div class=\"badge\">" +
            (p.category || "") +
            "</div>" +
            "<h3 style=\"margin:8px 0\">" +
            escapeHtml(p.title) +
            "</h3>" +
            "<p>" +
            escapeHtml(p.content) +
            "</p>" +
            "<footer style=\"margin-top:8px;display:flex;gap:12px;align-items:center\">" +
            "<button type=\"button\" class=\"like-btn\" data-id=\"" +
            p.id +
            "\"><span>👍</span> Like <span>" +
            (p.likes || 0) +
            "</span></button>" +
            "<span>💬 " +
            (p.comment_count || 0) +
            "</span>" +
            "</footer></article>"
        )
        .join("");

      feed.querySelectorAll(".like-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (!window.isLoggedIn()) {
            window.location.href = "login.html";
            return;
          }
          const id = btn.getAttribute("data-id");
          try {
            const res = await window.apiJson("/api/community/posts/" + id + "/like", {
              method: "POST",
              headers: window.getAuthHeaders(),
              timeoutMs: 7000,
            });
            const j = res.data || {};
            if (res.ok && j.success) {
              const span = btn.querySelector("span:last-child");
              if (span) span.textContent = j.likes;
              window.showToast?.("success", "👍");
            } else {
              window.showToast?.("error", j.error || res.error || (typeof t === "function" ? t("api_error") : "Error"));
            }
          } catch (e) {
            console.error(e);
            window.showToast?.("error", typeof t === "function" ? t("api_error") : "Error");
          }
        });
      });
    }

    function escapeHtml(s) {
      if (!s) return "";
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    loadPosts();
  };
})();
