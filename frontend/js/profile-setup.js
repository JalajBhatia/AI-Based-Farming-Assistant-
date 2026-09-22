(function () {
  let step = 1;
  const profile = {
    state: "",
    district: "",
    village: "",
    lat: null,
    lng: null,
    main_crop: "",
    land_acres: 2,
    has_irrigation: true,
    preferred_language: "hi",
    ui_mode: "smart",
  };

  const LANG_SETUP = [
    { code: "hi", label: "हिंदी" },
    { code: "en", label: "English" },
    { code: "pa", label: "ਪੰਜਾਬੀ" },
    { code: "mr", label: "मराठी" },
    { code: "te", label: "తెలుగు" },
    { code: "ta", label: "தமிழ்" },
    { code: "gu", label: "ગુજરાતી" },
    { code: "bn", label: "বাংলা" },
    { code: "kn", label: "ಕನ್ನಡ" },
    { code: "ml", label: "മലയാളം" },
    { code: "or", label: "ଓଡ଼ିଆ" },
    { code: "as", label: "অসমীয়া" },
  ];

  window.initProfileWizard = function () {
    const grid = document.getElementById("lang-setup-grid");
    if (grid) {
      grid.innerHTML = LANG_SETUP.map((o) => "<button type=\"button\" data-lang=\"" + o.code + "\">" + o.label + "</button>").join("");
      grid.querySelectorAll("button").forEach((b) => {
        b.addEventListener("click", () => {
          profile.preferred_language = b.getAttribute("data-lang") || "hi";
          localStorage.setItem("selectedLanguage", profile.preferred_language);
          go(7);
        });
      });
    }

    document.getElementById("btn-gps")?.addEventListener("click", () => {
      const st = document.getElementById("geo-status");
      if (!navigator.geolocation) {
        if (st) st.textContent = "GPS not supported";
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          profile.lat = pos.coords.latitude;
          profile.lng = pos.coords.longitude;
          if (st) st.textContent = "lat: " + profile.lat.toFixed(4) + ", lng: " + profile.lng.toFixed(4);
          try {
            const res = await window.apiJson("/api/farmer/location", {
              method: "POST",
              headers: window.getAuthHeaders(),
              body: JSON.stringify({ lat: profile.lat, lng: profile.lng }),
              timeoutMs: 7000,
            });
            const d = res.data || {};
            if (res.ok && d.success) {
              profile.state = d.state || profile.state;
              profile.district = d.district || profile.district;
              profile.village = d.village || profile.village;
              if (st) st.textContent += " - " + (d.formatted_address || "").slice(0, 80);
            }
          } catch (e) {
            console.error(e);
          }
        },
        () => {
          if (st) st.textContent = "Location permission denied";
        }
      );
    });

    const states = window.REGIONS?.states || [];
    const stateGrid = document.getElementById("state-grid");
    if (stateGrid) {
      const lang = localStorage.getItem("selectedLanguage") || "hi";
      stateGrid.innerHTML = states
        .map((s) => {
          const label = window.getStateLabel ? getStateLabel(s, lang) : s.en;
          return "<button type=\"button\" class=\"state-card\" data-state=\"" + s.en + "\"><span class=\"big\">" + label + "</span><span class=\"small\">" + s.en + "</span></button>";
        })
        .join("");
      stateGrid.querySelectorAll(".state-card").forEach((btn) => {
        btn.addEventListener("click", () => {
          profile.state = btn.getAttribute("data-state") || "";
          const code = states.find((x) => x.en === profile.state)?.code;
          fillDistricts(code);
          go(2);
        });
      });
    }

    document.getElementById("district-select")?.addEventListener("change", (e) => {
      profile.district = e.target.value;
    });

    document.getElementById("btn-next-district")?.addEventListener("click", () => {
      if (!profile.district) return;
      go(3);
    });

    document.querySelectorAll(".crop-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        profile.main_crop = btn.getAttribute("data-crop") || "";
        go(4);
      });
    });

    const landRange = document.getElementById("land-acres");
    landRange?.addEventListener("input", () => {
      profile.land_acres = parseFloat(landRange.value) || 0;
      const out = document.getElementById("land-val");
      if (out) out.textContent = landRange.value;
    });

    document.getElementById("btn-next-land")?.addEventListener("click", () => go(5));

    document.getElementById("irr-yes")?.addEventListener("click", () => {
      profile.has_irrigation = true;
      go(6);
    });
    document.getElementById("irr-no")?.addEventListener("click", () => {
      profile.has_irrigation = false;
      go(6);
    });

    document.getElementById("ui-smart")?.addEventListener("click", () => {
      profile.ui_mode = "smart";
      document.documentElement.setAttribute("data-ui-mode", "smart");
      localStorage.setItem("uiMode", "smart");
      submitProfile();
    });
    document.getElementById("ui-simple")?.addEventListener("click", () => {
      profile.ui_mode = "simple";
      document.documentElement.setAttribute("data-ui-mode", "simple");
      localStorage.setItem("uiMode", "simple");
      submitProfile();
    });

    document.getElementById("btn-back")?.addEventListener("click", () => go(step - 1));

    go(1);
  };

  function fillDistricts(code) {
    const sel = document.getElementById("district-select");
    if (!sel || !code) return;
    const list = window.REGIONS?.districts?.[code];
    const opts = (list && list.length ? list : ["Main district"]).map((d) => "<option value=\"" + d + "\">" + d + "</option>");
    sel.innerHTML = "<option value=\"\">-</option>" + opts.join("");
  }

  function go(s) {
    step = Math.max(1, Math.min(7, s));
    for (let i = 1; i <= 7; i++) {
      const sec = document.getElementById("wizard-" + i);
      if (sec) sec.hidden = i !== step;
    }
  }

  async function submitProfile() {
    const body = {
      state: profile.state,
      district: profile.district,
      village: profile.village || "",
      lat: profile.lat,
      lng: profile.lng,
      main_crop: profile.main_crop,
      land_acres: profile.land_acres,
      has_irrigation: profile.has_irrigation,
      preferred_language: profile.preferred_language,
      ui_mode: profile.ui_mode,
    };
    try {
      const res = await window.apiJson("/api/farmer/profile", {
        method: "PUT",
        headers: window.getAuthHeaders(),
        body: JSON.stringify(body),
        timeoutMs: 7000,
      });
      const data = res.data || {};
      if (!res.ok || !data.success) {
        window.showToast?.("error", data.error || res.error || (typeof t === "function" ? t("api_error") : "Error"));
        return;
      }
      localStorage.setItem("profileComplete", "1");
      localStorage.setItem("farmerProfile", JSON.stringify(body));
      window.setLanguage(profile.preferred_language);
      window.location.href = "dashboard.html";
    } catch (e) {
      console.error(e);
      window.showToast?.("error", typeof t === "function" ? t("api_error") : "Error");
    }
  }
})();
