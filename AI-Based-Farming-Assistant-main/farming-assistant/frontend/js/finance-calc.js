(function () {
  window.calcProfit = function (inputs) {
    const land = Math.max(0.1, inputs.landAcres || 1);
    const totalCost =
      (inputs.seed || 0) +
      (inputs.fert || 0) +
      (inputs.labour || 0) +
      (inputs.water || 0);
    const revenue = (inputs.yieldQPerAcre || 0) * land * (inputs.pricePerQ || 0);
    const profit = revenue - totalCost;
    const perAcre = profit / land;
    const breakEvenQ =
      inputs.yieldQPerAcre > 0 ? totalCost / (inputs.yieldQPerAcre * land) : 0;
    return { totalCost, revenue, profit, perAcre, breakEvenQ };
  };

  window.calcEMI = function (principal, annualRate, months) {
    const r = annualRate / 100 / 12;
    const n = months;
    if (r === 0) return { emi: principal / n, total: principal, interest: 0 };
    const emi =
      (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    return { emi, total, interest: total - principal };
  };
})();
