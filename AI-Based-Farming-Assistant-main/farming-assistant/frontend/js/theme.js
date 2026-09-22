(function () {
  function loggedIn() {
    return !!localStorage.getItem("farmsaathi_token");
  }

  window.initTheme = function () {
    const saved = localStorage.getItem("theme") || "light";
    if (saved === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    if (window.updateThemeIcon) window.updateThemeIcon(saved);
  };

  window.toggleTheme = function () {
    const isDark = document.body.classList.toggle("dark");
    const next = isDark ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    if (typeof window.updateThemeIcon === "function") window.updateThemeIcon(next);

    if (loggedIn() && typeof window.getAuthHeaders === "function") {
      window.apiJson("/api/farmer/profile", {
        method: "PUT",
        headers: window.getAuthHeaders(),
        body: JSON.stringify({ theme: next }),
      }).catch(() => {});
    }
  };

  window.updateThemeIcon = function (theme) {
    document.querySelectorAll(".theme-toggle-fab, #theme-toggle").forEach((btn) => {
      btn.textContent = theme === "dark" ? "☀️" : "🌙";
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.initTheme();
    document.body.addEventListener("click", (e) => {
      if (e.target.closest(".theme-toggle-fab") || e.target.closest("#theme-toggle")) {
        window.toggleTheme();
      }
    });
  });
})();
