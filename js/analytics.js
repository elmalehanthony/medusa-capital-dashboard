// analytics.js — portfolio analytics engine

const Analytics = {

  cagr(history) {
    if (history.length < 2) return null;
    const valid = history.filter(s => s.total_cad);
    if (valid.length < 2) return null;
    const first = valid[0], last = valid[valid.length - 1];
    const years = (new Date(last.date) - new Date(first.date)) / (365.25 * 864e5);
    if (years <= 0) return null;
    return Math.pow(last.total_cad / first.total_cad, 1 / years) - 1;
  },

  monthlyReturns(history) {
    const returns = [];
    const valid = history.filter(s => s.total_cad);
    for (let i = 1; i < valid.length; i++) {
      const prev = valid[i-1], curr = valid[i];
      returns.push({
        date: curr.date,
        label: new Date(curr.date + 'T00:00:00').toLocaleDateString('en-CA', {month:'short', year:'2-digit'}),
        ret: (curr.total_cad - prev.total_cad) / prev.total_cad,
        value: curr.total_cad,
        change: curr.total_cad - prev.total_cad
      });
    }
    return returns;
  },

  volatility(history) {
    const rets = this.monthlyReturns(history).map(r => r.ret);
    if (rets.length < 3) return null;
    const mean = rets.reduce((a,b) => a+b, 0) / rets.length;
    const variance = rets.reduce((s,r) => s + Math.pow(r - mean, 2), 0) / (rets.length - 1);
    return Math.sqrt(variance * 12);
  },

  maxDrawdown(history) {
    const valid = history.filter(s => s.total_cad);
    if (valid.length < 2) return null;
    let peak = -Infinity, maxDD = 0;
    for (const s of valid) {
      if (s.total_cad > peak) peak = s.total_cad;
      const dd = (s.total_cad - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }
    return maxDD;
  },

  drawdownSeries(history) {
    let peak = -Infinity;
    return history.filter(s => s.total_cad).map(s => {
      if (s.total_cad > peak) peak = s.total_cad;
      return { date: s.date, drawdown: (s.total_cad - peak) / peak };
    });
  },

  sharpe(history) {
    const rets = this.monthlyReturns(history).map(r => r.ret);
    if (rets.length < 3) return null;
    const mean = rets.reduce((a,b) => a+b, 0) / rets.length * 12;
    const vol = this.volatility(history);
    return vol ? mean / vol : null;
  },

  winRate(history) {
    const rets = this.monthlyReturns(history);
    if (!rets.length) return null;
    return rets.filter(r => r.ret > 0).length / rets.length;
  },

  bestMonth(history) {
    const rets = this.monthlyReturns(history);
    if (!rets.length) return null;
    return rets.reduce((best, r) => r.ret > best.ret ? r : best);
  },

  worstMonth(history) {
    const rets = this.monthlyReturns(history);
    if (!rets.length) return null;
    return rets.reduce((worst, r) => r.ret < worst.ret ? r : worst);
  },

  heatmapData(history) {
    const map = {};
    for (const r of this.monthlyReturns(history)) {
      const [y, m] = r.date.split('-');
      if (!map[y]) map[y] = {};
      map[y][parseInt(m)] = r.ret;
    }
    return map;
  },

  annualReturns(history) {
    const valid = history.filter(s => s.total_cad && s.date);
    const byYear = {};
    for (const s of valid) {
      const y = s.date.slice(0, 4);
      if (!byYear[y]) byYear[y] = { first: s, last: s };
      if (s.date < byYear[y].first.date) byYear[y].first = s;
      if (s.date > byYear[y].last.date) byYear[y].last = s;
    }
    return Object.entries(byYear).map(([year, {first, last}]) => ({
      year,
      ret: first.total_cad ? (last.total_cad - first.total_cad) / first.total_cad : null,
      startVal: first.total_cad,
      endVal: last.total_cad,
      change: last.total_cad - first.total_cad
    })).sort((a, b) => a.year.localeCompare(b.year));
  },

  positionPnL(positions, totalCAD) {
    return positions
      .filter(p => p.shares && p.current_value_cad)
      .map(p => ({
        ...p,
        unrealizedGain: p.current_value_cad - (p.total_cost || p.shares * (p.cost_per_share || 0)),
        unrealizedPct: p.return_inception,
        weight: totalCAD ? p.current_value_cad / totalCAD : null
      }))
      .sort((a, b) => b.current_value_cad - a.current_value_cad);
  }
};
