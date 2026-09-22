(function () {

  const CROPS = ["wheat","rice","potato","onion","maize","tomato","soyabean"];

  function initMandiPrices() {
    setupCropDropdown();
    setupLocationButton();
    setupFetch();
  }

  // ================= DROPDOWN (FIXED 100%) =================
  function setupCropDropdown() {
    const input = document.getElementById("mcrop");
    const box = document.getElementById("crop-suggestions");

    if (!input || !box) {
      console.error("Dropdown elements missing");
      return;
    }

    function show(list) {
      box.innerHTML = "";
      box.style.display = "block";

      list.forEach(c => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.innerText = c;

        div.onclick = (e) => {
          e.stopPropagation();
          input.value = c;
          box.style.display = "none";
        };

        box.appendChild(div);
      });
    }

    function hide() {
      box.style.display = "none";
    }

    // CLICK → SHOW ALL
    input.addEventListener("focus", () => {
      show(CROPS);
    });

    // TYPE → FILTER
    input.addEventListener("input", () => {
      const val = input.value.toLowerCase();
      const filtered = CROPS.filter(c => c.includes(val));
      show(filtered);
    });

    // OUTSIDE CLICK → CLOSE
    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !box.contains(e.target)) {
        hide();
      }
    });
  }

  // ================= LOCATION =================
  function setupLocationButton() {
    const btn = document.getElementById("btn-use-location");

    if (!btn) return;

    btn.addEventListener("click", () => {

      if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
      }

      const original = btn.innerText;
      btn.innerText = "Detecting...";
      btn.disabled = true;

      navigator.geolocation.getCurrentPosition(async (pos) => {

        try {
          const { latitude, longitude } = pos.coords;

          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );

          const data = await res.json();
          const addr = data.address || {};

          document.getElementById("mstate").value = addr.state || "";

          document.getElementById("mdistrict").value =
            addr.city || addr.county || addr.town || "";

        } catch (err) {
          console.error(err);
          alert("Location failed");
        } finally {
          btn.innerText = original;
          btn.disabled = false;
        }

      }, () => {
        alert("Permission denied");
        btn.innerText = original;
        btn.disabled = false;
      });

    });
  }

  // ================= FETCH =================
  function setupFetch() {
    const btn = document.getElementById("btn-mandi");

    if (!btn) return;

    btn.addEventListener("click", fetchMandiData);
  }

  async function fetchMandiData() {
    const crop = document.getElementById("mcrop").value.trim();
    const state = document.getElementById("mstate").value.trim();
    const district = document.getElementById("mdistrict").value.trim();

    const output = document.getElementById("mandi-out");

    if (!crop || !state) {
      alert("Enter crop and state");
      return;
    }

    output.innerHTML = "⏳ Loading...";

    try {
      const url = `http://127.0.0.1:5000/api/mandi?crop=${encodeURIComponent(crop)}&state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;

      const res = await fetch(url);
      const data = await res.json();

      let prices = [];

      if (Array.isArray(data)) prices = data;
      else if (data.data) prices = data.data;
      else if (data.today_prices) prices = data.today_prices;
      else if (data.prices) prices = data.prices;

      if (!prices.length) {
        output.innerHTML = `<div class="card">❌ No data found</div>`;
        return;
      }

      prices.sort((a, b) => (b.modal_price || 0) - (a.modal_price || 0));

      const best = prices[0];

      let html = `
        <div class="card" style="background:#22c55e; color:white;">
          <h3>🏆 Best Market</h3>
          <p>${best.market}</p>
          <p>₹${best.modal_price}</p>
        </div>
      `;

      prices.slice(1).forEach(p => {
        html += `
          <div class="card">
            <h4>${p.market}</h4>
            <p>₹${p.modal_price}</p>
          </div>
        `;
      });

      output.innerHTML = html;

    } catch (err) {
      console.error(err);
      output.innerHTML = "⚠️ Error loading data";
    }
  }

  // INIT
  window.initMandiPrices = initMandiPrices;

})();