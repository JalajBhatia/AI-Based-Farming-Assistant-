(function () {
  let loginPending = false;
  let registerPending = false;
  let googlePending = false;

  function notify(type, message, key) {
    if (!message) return;
    if (typeof window.showToastOnce === "function") {
      window.showToastOnce(type, message, key || type + ":" + message, 2000);
      return;
    }
    window.showToast?.(type, message);
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function showErr(id, text) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = text || "";
      el.hidden = !text;
    }
  }

  window.initLoginPage = function () {
    const form = document.getElementById("login-form");
    const submitBtn = form?.querySelector('button[type="submit"]');
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (loginPending) return;

      showErr("login-err", "");
      const username_or_email = (document.getElementById("username_or_email")?.value || "").trim();
      const password = document.getElementById("password")?.value || "";

      if (!username_or_email) {
        showErr("login-err", typeof t === "function" ? t("username") + "?" : "Enter username or email");
        return;
      }
      if (!password) {
        showErr("login-err", typeof t === "function" ? t("password") + "?" : "Enter password");
        return;
      }

      try {
        loginPending = true;
        window.setButtonBusy?.(submitBtn, true, typeof t === "function" ? t("loading") : "...");
        window.showLoader?.();

        const res = await window.apiJson("/api/auth/login", {
          method: "POST",
          headers: window.getJsonHeaders?.() || { "Content-Type": "application/json" },
          body: JSON.stringify({ username_or_email, password }),
          timeoutMs: 6500,
        });

        if (!res.ok) {
          const msg = res.error || (typeof t === "function" ? t("api_error") : "Error");
          showErr("login-err", msg);
          notify("error", msg, "login-error");
          return;
        }

        const data = res.data || {};
        window.setAuthToken(data.token);
        notify("success", "Login successful", "login-success");
        await wait(350);

        const red = data.redirect_to === "profile-setup" ? "profile-setup.html" : "dashboard.html";
        window.location.href = red;
      } catch (err) {
        console.error(err);
        const msg = err.message || (typeof t === "function" ? t("api_error") : "Error");
        showErr("login-err", msg);
        notify("error", msg, "login-error");
      } finally {
        loginPending = false;
        window.hideLoader?.();
        window.setButtonBusy?.(submitBtn, false);
      }
    });
  };

  window.initRegisterPage = function () {
    const userField = document.getElementById("reg_username");
    userField?.addEventListener("blur", async () => {
      const u = (userField.value || "").trim();
      if (u.length < 3) return;
      try {
        const res = await window.apiJson("/api/auth/check-username?username=" + encodeURIComponent(u), {
          timeoutMs: 5000,
        });
        const d = res.data;
        if (!res.ok || !d) return;
        const hint = document.getElementById("username-hint");
        if (hint) {
          hint.textContent = d.available ? "OK" : typeof t === "function" ? t("username_taken") : "Taken";
          hint.style.color = d.available ? "green" : "red";
        }
      } catch (e) {
        console.error(e);
      }
    });

    const pw = document.getElementById("reg_password");
    const meter = document.getElementById("pw-meter");
    pw?.addEventListener("input", () => {
      const v = pw.value || "";
      let lvl = 0;
      if (v.length >= 8) lvl++;
      if (/[0-9]/.test(v)) lvl++;
      if (/[A-Z]/i.test(v) && /[0-9]/.test(v)) lvl++;
      if (v.length >= 12) lvl++;
      const labels = ["weak", "fair", "good", "strong"];
      const colors = ["#c0392b", "#e67e22", "#f1c40f", "#27ae60"];
      if (meter) {
        meter.textContent = labels[Math.min(lvl, 3)] || "weak";
        meter.style.color = colors[Math.min(lvl, 3)] || colors[0];
      }
    });

    const form = document.getElementById("register-form");
    const submitBtn = form?.querySelector('button[type="submit"]');
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (registerPending) return;

      showErr("register-err", "");
      const body = {
        username: (document.getElementById("reg_username")?.value || "").trim(),
        email: (document.getElementById("reg_email")?.value || "").trim(),
        password: document.getElementById("reg_password")?.value || "",
        full_name: (document.getElementById("reg_full_name")?.value || "").trim(),
        phone: (document.getElementById("reg_phone")?.value || "").trim(),
      };

      if (body.username.length < 3) {
        showErr("register-err", "Username min 3 characters");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        showErr("register-err", "Valid email required");
        return;
      }
      if ((body.password || "").length < 8) {
        showErr("register-err", "Password min 8 characters");
        return;
      }
      const pw2 = document.getElementById("reg_password2")?.value || "";
      if (body.password !== pw2) {
        const pm = typeof t === "function" ? t("password_mismatch") : "Passwords do not match";
        showErr("register-err", pm);
        notify("error", pm, "register-password-mismatch");
        return;
      }

      try {
        registerPending = true;
        window.setButtonBusy?.(submitBtn, true, typeof t === "function" ? t("loading") : "...");
        window.showLoader?.();

        const res = await window.apiJson("/api/auth/register", {
          method: "POST",
          headers: window.getJsonHeaders?.() || { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          timeoutMs: 6500,
        });

        if (!res.ok) {
          const msg = res.error || "Registration failed";
          showErr("register-err", msg);
          notify("error", msg, "register-error");
          return;
        }

        const data = res.data || {};
        window.setAuthToken(data.token);
        notify("success", "Registration successful", "register-success");
        await wait(400);

        window.location.href =
          data.redirect_to === "profile-setup" ? "profile-setup.html" : "dashboard.html";
      } catch (err) {
        console.error(err);
        const msg = err.message || "Registration failed";
        showErr("register-err", msg);
        notify("error", msg, "register-error");
      } finally {
        registerPending = false;
        window.hideLoader?.();
        window.setButtonBusy?.(submitBtn, false);
      }
    });
  };

  window.googleSignIn = async function (credential) {
    if (googlePending) return;

    try {
      googlePending = true;
      window.showLoader?.();

      const res = await window.apiJson("/api/auth/google", {
        method: "POST",
        headers: window.getJsonHeaders?.() || { "Content-Type": "application/json" },
        body: JSON.stringify({ google_token: credential }),
        timeoutMs: 6500,
      });

      if (!res.ok) {
        notify("error", res.error || "Google login failed", "google-login-error");
        return;
      }

      const data = res.data || {};
      window.setAuthToken(data.token);
      notify("success", "Google login successful", "google-login-success");
      await wait(300);

      window.location.href =
        data.redirect_to === "profile-setup" ? "profile-setup.html" : "dashboard.html";
    } catch (e) {
      console.error(e);
      notify("error", "Google login failed", "google-login-error");
    } finally {
      googlePending = false;
      window.hideLoader?.();
    }
  };
})();
