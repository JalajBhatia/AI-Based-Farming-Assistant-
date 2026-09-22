(function () {
  const DEFAULT_LAT = 28.6139;
  const DEFAULT_LON = 77.2090;

  function iconUrl(code) {
    if (!code) return "";
    return "https://openweathermap.org/img/wn/" + code + "@2x.png";
  }

  function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  }

  async function resolveWeatherQuery(profile) {
    const query =
      typeof window.getWeatherLocationQuery === "function" ? window.getWeatherLocationQuery(profile) : "";
    if (query) {
      return query;
    }

    try {
      const coords = await getCurrentPosition();
      return (
        "lat=" +
        encodeURIComponent(coords.latitude) +
        "&lng=" +
        encodeURIComponent(coords.longitude)
      );
    } catch (e) {
      return "lat=" + encodeURIComponent(DEFAULT_LAT) + "&lng=" + encodeURIComponent(DEFAULT_LON);
    }
  }

  window.loadWeatherWidget = async function (containerId) {
    const el = document.getElementById(containerId || "weather-widget");
    if (!el) return;

    const lang = localStorage.getItem("selectedLanguage") || "hi";
    const profile =
      (typeof window.ensureProfileLocation === "function"
        ? await window.ensureProfileLocation({ force: true })
        : null) ||
      (typeof window.fetchFarmerProfile === "function" ? await window.fetchFarmerProfile() : null) ||
      (typeof window.getStoredFarmerProfile === "function" ? window.getStoredFarmerProfile() : {});
    let data;

    try {
      const query = await resolveWeatherQuery(profile);
      const res = await window.apiJson(
        "/api/weather?" + query + "&lang=" + encodeURIComponent(lang),
        { timeoutMs: 7000 }
      );
      data = res.data || { success: false, error: res.error || "Request failed" };
    } catch (e) {
      data = {
        success: false,
        error: "Unable to load weather",
      };
    }

    render(el, data, lang);
  };

  function render(el, data, lang) {
    if (!data.success) {
      el.innerHTML = "<p class=\"weather-err\">" + (data.error || t("api_error")) + "</p>";
      return;
    }
    const fc = data.forecast || [];
    const today = fc[0];
    const rest = fc.slice(1, 5);
    const tday = data.today || {};
    const advObj = typeof data.farming_advice === "object" && data.farming_advice ? data.farming_advice : {};
    const lvl = advObj.level || data.advice_level || "info";
    const bannerClass =
      lvl === "danger"
        ? "advice-banner-red"
        : lvl === "warning"
          ? "advice-banner-yellow"
          : "advice-banner-green";
    const advLine =
      lang === "en"
        ? advObj.en || advObj.hi || ""
        : advObj.hi || advObj.en || (typeof data.farming_advice === "string" ? data.farming_advice : "");
    const rainPct =
      tday.rain_chance_pct != null
        ? Math.round(tday.rain_chance_pct)
        : today
          ? Math.round(today.rain_chance_pct || 0)
          : 0;
    const hum = tday.humidity != null ? tday.humidity : today?.humidity ?? "-";
    const tempShow =
      tday.temp_min != null && tday.temp_max != null
        ? Math.round(tday.temp_min) + "° / " + Math.round(tday.temp_max) + "°"
        : Math.round(today?.temp_min || 0) + "° / " + Math.round(today?.temp_max || 0) + "°";

    el.innerHTML = `
      <div class="weather-district-label">${t("district_weather")}</div>
      <div class="weather-today card">
        <div class="weather-big">
          <img alt="" src="${iconUrl(today?.icon_code || today?.icon)}" width="96" height="96" />
          <div>
            <div class="temp-range">${tempShow}</div>
            <div class="hum">${t("rain_chance")}: ${rainPct}%</div>
            <div class="hum">${t("humidity_label")}: ${hum}%</div>
          </div>
        </div>
        <div class="advice-banner ${bannerClass}">${advLine}</div>
        ${
          data.severe_alert
            ? `<div class="advice-banner advice-banner-red" style="margin-top:8px">${data.severe_message || ""}</div>`
            : ""
        }
      </div>
      <div class="weather-scroll">${rest
        .map(
          (d) => `
        <div class="weather-mini card">
          <div class="dt">${(d.dt_txt || "").slice(0, 10)}</div>
          <div>${Math.round(d.temp_min)}°-${Math.round(d.temp_max)}°</div>
        </div>`
        )
        .join("")}</div>
    `;
  }
})();
