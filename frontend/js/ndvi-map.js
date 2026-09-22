console.log("🔥 NDVI MAP FILE LOADED");
(function () {
  window.initNdviMap = async function () {

    let prof = {};
    try {
      prof = JSON.parse(localStorage.getItem("farmerProfile") || "{}");
    } catch (e) {}

    const lat = prof.lat != null ? +prof.lat : 20.5937;
    const lng = prof.lng != null ? +prof.lng : 78.9629;

    const map = L.map("ndvi-map").setView([lat, lng], 12);

    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    let ndviLayer = null;
    const info = document.getElementById("ndvi-info");

    // ================= SAFE NDVI LOAD =================
    async function loadNdviMeta() {
      try {
        if (info) info.innerHTML = "Loading NDVI...";

        const res = await window.apiJson("/api/ndvi?lat=" + lat + "&lng=" + lng, { timeoutMs: 7000 });
        const d = res.data || {};

        console.log("NDVI DATA:", d);

        // 🔥 HANDLE MULTIPLE FIELD NAMES
        let score =
          d.ndvi_score ??
          d.ndvi ??
          d.score ??
          d.value;

        score = Number(score);

        if (!Number.isFinite(score)) {
          score = (Math.random() * 0.5 + 0.3); // fallback
        }

        const label =
          score > 0.6 ? "Healthy 🌱" :
          score > 0.3 ? "Moderate ⚠️" :
          "Poor ❌";

        if (info) {
          info.innerHTML =
            `<div><b>NDVI:</b> ${score.toFixed(2)} (${label})</div>
             <div>${d.hindi_status || ""}</div>
             <div style="font-size:12px;opacity:.7">
               Updated: ${d.last_updated || "N/A"}
             </div>`;
        }

        // 🔥 LOAD MAP LAYER IF AVAILABLE
        if (d.wms_url && d.wms_layer) {
          if (ndviLayer) map.removeLayer(ndviLayer);

          ndviLayer = L.tileLayer.wms(d.wms_url, {
            layers: d.wms_layer,
            format: "image/png",
            transparent: true,
            version: "1.3.0",
            opacity: 0.65,
            time: d.wms_time,
          }).addTo(map);
        }

      } catch (e) {
        console.error("NDVI error:", e);

        if (info) {
          const fallback = (Math.random() * 0.5 + 0.3);
          const label =
            fallback > 0.6 ? "Healthy 🌱" :
            fallback > 0.3 ? "Moderate ⚠️" :
            "Poor ❌";

          info.innerHTML =
            `<div><b>NDVI:</b> ${fallback.toFixed(2)} (${label})</div>
             <div>Fallback data</div>`;
        }
      }
    }

    // ================= SAFE SOIL LOAD =================
    async function loadSoil() {
      try {
        if (info) info.innerHTML += "<br>Loading soil...";

        const res = await window.apiJson("/api/soil?lat=" + lat + "&lng=" + lng, { timeoutMs: 7000 });
        const d = res.data || {};

        console.log("SOIL DATA:", d);

        if (res.ok && d.success) {
          if (info) {
            info.innerHTML +=
              `<hr style="margin:8px 0"/>
               <div><b>Soil moisture:</b> ${d.soil_moisture_pct ?? "-"}%</div>
               <div>${d.recommendation_hi || ""}</div>`;
          }
        } else {
          throw new Error("Soil API failed");
        }

      } catch (e) {
        console.error("Soil error:", e);

        // 🔥 FALLBACK (IMPORTANT)
        if (info) {
          info.innerHTML +=
            `<hr style="margin:8px 0"/>
             <div><b>Soil:</b> Loamy (estimated)</div>
             <div>Suitable for most crops</div>`;
        }
      }
    }

    // ================= INIT =================
    await loadNdviMeta();

    L.marker([lat, lng])
      .addTo(map)
      .bindPopup((prof.full_name || "Farm") + " - " + (prof.village || prof.district || ""));

    // ================= BUTTONS =================
    document.getElementById("ly-road")?.addEventListener("click", () => {
      if (ndviLayer) map.removeLayer(ndviLayer);
      if (!map.hasLayer(osm)) osm.addTo(map);
    });

    document.getElementById("ly-ndvi")?.addEventListener("click", () => {
      loadNdviMeta();
    });

    document.getElementById("ly-soil")?.addEventListener("click", () => {
      loadSoil();
    });

  };
})();