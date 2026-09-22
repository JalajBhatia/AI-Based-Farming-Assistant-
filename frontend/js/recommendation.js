/**
 * Smart Crop Recommendation System
 * AI-powered crop selection with profit prediction
 */
(function () {
  let currentChart = null;

  // Auto-fill from profile
  function autoFillFromProfile() {
    try {
      const profile = JSON.parse(localStorage.getItem("farmerProfile") || "{}");
      
      if (profile.state) {
        document.getElementById("state").value = profile.state;
      }
      
      if (profile.district) {
        document.getElementById("district").value = profile.district;
      }
    } catch (e) {
      console.error("Failed to auto-fill from profile", e);
    }
  }

  // Get recommendation from API
  async function getRecommendation() {
    const soilType = document.getElementById("soil-type").value;
    const season = document.getElementById("season").value;
    const state = document.getElementById("state").value.trim();
    const district = document.getElementById("district").value.trim();
    const waterAvailability = document.getElementById("water-availability").value;

    // Validate inputs
    if (!soilType) {
      window.showToast?.("warning", "Please select soil type");
      return;
    }

    if (!season) {
      window.showToast?.("warning", "Please select season");
      return;
    }

    if (!state) {
      window.showToast?.("warning", "Please enter state");
      return;
    }

    if (!waterAvailability) {
      window.showToast?.("warning", "Please select water availability");
      return;
    }

    const btnRecommend = document.getElementById("btn-recommend");

    try {
      window.setButtonBusy?.(btnRecommend, true, "Analyzing...");

      const res = await window.apiJson("/api/recommend-crop", {
        method: "POST",
        headers: window.getAuthHeaders(),
        body: JSON.stringify({
          soil: soilType,
          season: season,
          state: state,
          district: district,
          water: waterAvailability
        }),
        timeoutMs: 10000
      });

      if (!res.ok || !res.data || !res.data.success) {
        window.showToast?.("error", res.data?.error || res.error || "Failed to get recommendation");
        return;
      }

      const data = res.data;
      renderResults(data);
      window.showToast?.("success", "Recommendation generated successfully!");
    } catch (e) {
      window.showToast?.("error", "Failed to get recommendation. Please try again.");
      console.error(e);
    } finally {
      window.setButtonBusy?.(btnRecommend, false);
    }
  }

  // Render results
  function renderResults(data) {
    const resultsSection = document.getElementById("recommendation-results");
    resultsSection.style.display = "block";

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

    // Render AI advice
    renderAIAdvice(data.ai_advice);

    // Render crop cards
    renderCropCards(data.recommendations);

    // Render chart
    renderProfitChart(data.recommendations);

    // Render comparison table
    renderComparisonTable(data.recommendations);
  }

  // Render AI advice
  function renderAIAdvice(advice) {
    const adviceContent = document.getElementById("ai-advice-content");
    if (adviceContent) {
      adviceContent.textContent = advice;
    }
  }

  // Render crop cards
  function renderCropCards(recommendations) {
    const cropsGrid = document.getElementById("crops-grid");
    if (!cropsGrid) return;

    cropsGrid.innerHTML = recommendations.map((crop, index) => {
      const isBest = index === 0;
      const profitClass = crop.profit > 30000 ? "high-profit" : crop.profit > 15000 ? "medium-profit" : "low-profit";
      
      return `
        <div class="crop-card ${isBest ? "best-crop" : ""} ${profitClass}">
          ${isBest ? '<div class="best-badge">🏆 Best Choice</div>' : ""}
          <div class="crop-rank">${index + 1}</div>
          <div class="crop-header">
            <div class="crop-icon">🌾</div>
            <div class="crop-name">${crop.crop}</div>
          </div>
          
          <div class="crop-stats">
            <div class="stat-item">
              <div class="stat-label">Yield</div>
              <div class="stat-value">${crop.yield_per_acre} q/acre</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Market Price</div>
              <div class="stat-value">₹${crop.market_price}/q</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Revenue</div>
              <div class="stat-value">₹${formatNumber(crop.revenue)}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Cost</div>
              <div class="stat-value">₹${formatNumber(crop.cost)}</div>
            </div>
          </div>

          <div class="crop-profit">
            <div class="profit-label">Expected Profit</div>
            <div class="profit-value">₹${formatNumber(crop.profit)}</div>
            <div class="profit-roi">ROI: ${crop.roi}%</div>
          </div>

          <div class="crop-description">
            ${crop.description}
          </div>

          <div class="suitability-bar">
            <div class="suitability-fill" style="width: ${crop.suitability_score}%"></div>
          </div>
          <div class="suitability-label">Suitability: ${crop.suitability_score}%</div>
        </div>
      `;
    }).join("");
  }

  // Render profit chart
  function renderProfitChart(recommendations) {
    const chartEl = document.getElementById("profit-chart");
    if (!chartEl || !window.Chart) return;

    // Destroy existing chart
    if (currentChart) {
      currentChart.destroy();
      currentChart = null;
    }

    const labels = recommendations.map(r => r.crop);
    const profits = recommendations.map(r => r.profit);
    const colors = recommendations.map((r, i) => {
      if (i === 0) return "#10b981"; // Best crop - green
      if (r.profit > 30000) return "#059669";
      if (r.profit > 15000) return "#fbbf24";
      return "#f59e0b";
    });

    currentChart = new Chart(chartEl, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Expected Profit (₹/acre)",
          data: profits,
          backgroundColor: colors,
          borderRadius: 8,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `Profit: ₹${formatNumber(context.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => `₹${formatNumber(value)}`
            }
          }
        },
        animation: {
          duration: 1000,
          easing: "easeOutQuart"
        }
      }
    });
  }

  // Render comparison table
  function renderComparisonTable(recommendations) {
    const tbody = document.getElementById("comparison-tbody");
    if (!tbody) return;

    tbody.innerHTML = recommendations.map((crop, index) => {
      const isBest = index === 0;
      return `
        <tr class="${isBest ? "best-row" : ""}">
          <td class="crop-name-cell">
            ${isBest ? "🏆 " : ""}${crop.crop}
          </td>
          <td>${crop.yield_per_acre}</td>
          <td>₹${crop.market_price}</td>
          <td>₹${formatNumber(crop.revenue)}</td>
          <td>₹${formatNumber(crop.cost)}</td>
          <td class="profit-cell">₹${formatNumber(crop.profit)}</td>
          <td class="roi-cell">${crop.roi}%</td>
        </tr>
      `;
    }).join("");
  }

  // Format number with commas
  function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // Initialize
  window.initRecommendation = function () {
    autoFillFromProfile();

    // Attach event listeners
    document.getElementById("btn-recommend")?.addEventListener("click", getRecommendation);

    // Enter key support
    const inputs = ["soil-type", "season", "state", "district", "water-availability"];
    inputs.forEach(id => {
      document.getElementById(id)?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") getRecommendation();
      });
    });
  };
})();
