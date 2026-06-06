// analytics.js — portfolio analytics engine
// All metrics computed from snapshot history in portfolio.json

const Analytics = {

  // Compound Annual Growth Rate from first to last snapshot
  cagr(history) {
    if (history.length < 2) return null;
    const first = history[0], last = history[history.length - 1];
    if (!first.total_cad || !last.total_cad) return null;
    const t0 = new Date(first.date), t1 = new Date(last.date);
    const years = (t1 - t0) / (365.25 * 24 * 60 * 60 * 1000);
    if (years <= 0) return null;
    return Math.pow(last.total_cad / first.total_cad, 1 / years) - 1;
  },

  // Monthly returns array [{date, return, value}]
  monthlyReturns(history) {
    const returns = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1], curr = history[i];
      if (!prev.total_cad || !curr.total_cad) continue;
      returns.push({
        date: curr.date,
        label: this._monthLabel(curr.date),
        ret: (curr.total_cad - prev.total_cad) / prev.total_cad,
        value: curr.total_cad,
        change: curr.total_cad - prev.total_cad
      });
    }
    return returns;
  },

  // Annualised volatility of monthly returns
  volatility(history) {
    const rets = this.monthlyReturns(history).map(r => r.ret);
    if (rets.length < 3) return null;
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (rets.length - 1);
    return Math.sqrt(variance * 12); // annualise
  },

  // Max drawdown from peak
  maxDrawdown(history) {
    if (history.length < 2) return null;
    let peak = -Infinity, maxDD = 0;
    for (const s of history) {
      if (!s.total_cad) continue;
      if (s.total_cad > peak) peak = s.total_cad;
      const dd = (s.total_cad - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }
    return maxDD;
  },

  // Drawdown series [{date, drawdown}] for chart
  drawdownSeries(history) {
    let peak = -Infinity;
    return history.filter(s => s.total_cad).map(s => {
      if (s.total_cad > peak) peak = s.total_cad;
      return { date: s.date, drawdown: (s.total_cad - peak) / peak };
    });
  },

  // Sharpe-like ratio (excess return / volatility, rf=0)
  sharpe(history) {
    const rets = this.monthlyReturns(history).map(r => r.ret);
    if (rets.length < 3) return null;
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length * 12;
    const vol = this.volatility(history);
    return vol ? mean / vol : null;
  },

  // Win rate — % of months with positive return
  winRate(history) {
    const rets = this.monthlyReturns(history);
    if (!rets.length) return null;
    return rets.filter(r => r.ret > 0).length / rets.length;
  },

  // Best and worst months
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

  // Monthly return heatmap data — {year: {month: return}}
  heatmapData(history) {
    const rets = this.monthlyReturns(history);
    const map = {};
    for (const r of rets) {
      const [y, m] = r.date.split('-');
      if (!map[y]) map[y] = {};
      map[y][parseInt(m)] = r.ret;
    }
    return map;
  },

  // Annual returns [{year, return, startVal, endVal}]
  annualReturns(history) {
    const byYear = {};
    for (const s of history) {
      if (!s.total_cad) continue;
      const y = s.date.slice(0, 4);
      if (!byYear[y] || s.date < byYear[y].first.date) byYear[y] = { ...byYear[y], first: s };
      if (!byYear[y] || s.date > byYear[y].last.date) byYear[y] = { ...byYear[y], last: s };
    }
    return Object.entries(byYear).map(([year, { first, last }]) => ({
      year,
      ret: first.total_cad ? (last.total_cad - first.total_cad) / first.total_cad : null,
      startVal: first.total_cad,
      endVal: last.total_cad,
      change: last.total_cad - first.total_cad
    })).sort((a, b) => a.year.localeCompare(b.year));
  },

  // Position-level P&L for a given snapshot positions array
  positionPnL(positions, totalCAD) {
    return positions
      .filter(p => p.shares && p.cost_per_share && p.current_value_cad)
      .map(p => {
        const costCAD = p.total_cost
          ? (p.currency === 'USD' && p.total_cost < 50000 ? p.total_cost * (totalCAD / (totalCAD || 1)) : p.total_cost)
          : p.shares * p.cost_per_share;
        const unrealizedGain = p.current_value_cad - costCAD;
        const unrealizedPct = costCAD ? unrealizedGain / costCAD : null;
        const weight = totalCAD ? p.current_value_cad / totalCAD : null;
        return {
          ...p,
          costCAD: p.total_cost || costCAD,
          unrealizedGain,
          unrealizedPct: p.return_inception, // use pre-computed if available
          weight
        };
      })
      .sort((a, b) => b.current_value_cad - a.current_value_cad);
  },

  _monthLabel(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', year: '2-digit' });
  }
};
