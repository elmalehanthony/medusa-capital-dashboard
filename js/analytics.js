// analytics.js — portfolio analytics engine
//
// Return methodology note:
// All period returns below are time-weighted (TWR) where possible — they exclude
// the effect of deposits/withdrawals so the numbers reflect investment performance,
// not contribution timing. Two data sources are used, in priority order:
//   1. "twr"   — BMO's own market_change_inception figure (already nets out net
//                deposits/withdrawals at the custodian level). Most accurate.
//   2. "dietz" — Simple Dietz approximation using data/portfolio.json's `cashflows`
//                ledger, for months where BMO's field wasn't captured.
//   3. "raw"   — plain value change, used only when no cash-flow data exists at all
//                for that period (a handful of months from 2022-2023).
// Each monthly return entry carries a `method` field so this is auditable.

const Analytics = {

  // The historical `cashflows` ledger in portfolio.json changes format partway
  // through: entries from 2026-05-31 onward are verified true single-period net
  // flows (cross-checked against actual BMO statement deposits: May $15,000,
  // June $0, July $1,000 — all match exactly). Entries before that date follow
  // an inconsistent/likely YTD-cumulative convention and produce nonsensical
  // results if treated as period flows (verified: they distort 2023-2025 annual
  // returns to implausible -25%/-30%+ figures). Until that older ledger is
  // reconstructed and verified, only the post-2026-05 entries are trusted here.
  _CASHFLOW_LEDGER_RELIABLE_FROM: '2026-05-01',

  _cf(cashflows, date) {
    if (!cashflows || date < this._CASHFLOW_LEDGER_RELIABLE_FROM) return null;
    const v = cashflows[date];
    if (v == null) return 0;
    if (typeof v === 'object') return v.net_cad ?? 0;
    return v;
  },

  _periodReturn(prev, curr, cashflows) {
    if (!prev.total_cad) return { ret: null, method: 'raw' };
    // 1. Custodian-sourced, cash-flow-exact
    if (prev.market_change_inception != null && curr.market_change_inception != null) {
      const marketGain = curr.market_change_inception - prev.market_change_inception;
      return { ret: marketGain / prev.total_cad, method: 'twr' };
    }
    // 2. Simple Dietz using tracked net cash flow for the period, only where
    //    the ledger is verified reliable (see _CASHFLOW_LEDGER_RELIABLE_FROM)
    const cf = this._cf(cashflows, curr.date);
    if (cf != null) {
      const denom = prev.total_cad + 0.5 * cf;
      if (denom) return { ret: (curr.total_cad - prev.total_cad - cf) / denom, method: cf ? 'dietz' : 'raw' };
    }
    // 3. No reliable cash-flow data for this period — fall back to the
    //    unadjusted value change (same behaviour as before this fix).
    return { ret: (curr.total_cad - prev.total_cad) / prev.total_cad, method: 'raw' };
  },

  cagr(history, cashflows) {
    const rets = this.monthlyReturns(history, cashflows).map(r => r.ret).filter(r => r != null);
    if (!rets.length) return null;
    const growth = rets.reduce((g, r) => g * (1 + r), 1);
    const valid = history.filter(s => s.total_cad);
    const years = (new Date(valid[valid.length - 1].date) - new Date(valid[0].date)) / (365.25 * 864e5);
    if (years <= 0) return null;
    return Math.pow(growth, 1 / years) - 1;
  },

  monthlyReturns(history, cashflows) {
    const returns = [];
    const valid = history.filter(s => s.total_cad);
    for (let i = 1; i < valid.length; i++) {
      const prev = valid[i-1], curr = valid[i];
      const { ret, method } = this._periodReturn(prev, curr, cashflows);
      returns.push({
        date: curr.date,
        label: new Date(curr.date + 'T00:00:00').toLocaleDateString('en-CA', {month:'short', year:'2-digit'}),
        ret,
        method,
        value: curr.total_cad,
        change: curr.total_cad - prev.total_cad
      });
    }
    return returns;
  },

  volatility(history, cashflows) {
    const rets = this.monthlyReturns(history, cashflows).map(r => r.ret).filter(r => r != null);
    if (rets.length < 3) return null;
    const mean = rets.reduce((a,b) => a+b, 0) / rets.length;
    const variance = rets.reduce((s,r) => s + Math.pow(r - mean, 2), 0) / (rets.length - 1);
    return Math.sqrt(variance * 12);
  },

  // Time-weighted growth-of-$100 index, chain-linking monthly TWR returns.
  // Used for drawdown so deposits/withdrawals can't masquerade as market moves.
  twrIndexSeries(history, cashflows) {
    const valid = history.filter(s => s.total_cad);
    const monthly = this.monthlyReturns(history, cashflows);
    let idx = 100;
    const series = valid.length ? [{ date: valid[0].date, index: 100 }] : [];
    for (const r of monthly) {
      idx *= (1 + (r.ret ?? 0));
      series.push({ date: r.date, index: idx });
    }
    return series;
  },

  maxDrawdown(history, cashflows) {
    const series = this.twrIndexSeries(history, cashflows);
    if (series.length < 2) return null;
    let peak = -Infinity, maxDD = 0;
    for (const s of series) {
      if (s.index > peak) peak = s.index;
      const dd = (s.index - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }
    return maxDD;
  },

  drawdownSeries(history, cashflows) {
    const series = this.twrIndexSeries(history, cashflows);
    let peak = -Infinity;
    return series.map(s => {
      if (s.index > peak) peak = s.index;
      return { date: s.date, drawdown: (s.index - peak) / peak };
    });
  },

  sharpe(history, cashflows) {
    const rets = this.monthlyReturns(history, cashflows).map(r => r.ret).filter(r => r != null);
    if (rets.length < 3) return null;
    const mean = rets.reduce((a,b) => a+b, 0) / rets.length * 12;
    const vol = this.volatility(history, cashflows);
    return vol ? mean / vol : null;
  },

  winRate(history, cashflows) {
    const rets = this.monthlyReturns(history, cashflows).filter(r => r.ret != null);
    if (!rets.length) return null;
    return rets.filter(r => r.ret > 0).length / rets.length;
  },

  bestMonth(history, cashflows) {
    const rets = this.monthlyReturns(history, cashflows).filter(r => r.ret != null);
    if (!rets.length) return null;
    return rets.reduce((best, r) => r.ret > best.ret ? r : best);
  },

  worstMonth(history, cashflows) {
    const rets = this.monthlyReturns(history, cashflows).filter(r => r.ret != null);
    if (!rets.length) return null;
    return rets.reduce((worst, r) => r.ret < worst.ret ? r : worst);
  },

  heatmapData(history, cashflows) {
    const map = {};
    for (const r of this.monthlyReturns(history, cashflows)) {
      if (r.ret == null) continue;
      const [y, m] = r.date.split('-');
      if (!map[y]) map[y] = {};
      map[y][parseInt(m)] = r.ret;
    }
    return map;
  },

  // Chain-links monthly TWR returns within each calendar year — NOT a raw
  // first-vs-last value comparison, so a deposit in January no longer inflates
  // the whole year's reported return.
  annualReturns(history, cashflows) {
    const valid = history.filter(s => s.total_cad && s.date);
    const monthly = this.monthlyReturns(history, cashflows);
    const byYear = {};
    for (const s of valid) {
      const y = s.date.slice(0, 4);
      if (!byYear[y]) byYear[y] = { first: s, last: s };
      if (s.date < byYear[y].first.date) byYear[y].first = s;
      if (s.date > byYear[y].last.date) byYear[y].last = s;
    }
    return Object.entries(byYear).map(([year, {first, last}]) => {
      const yearMonths = monthly.filter(m => m.date.startsWith(year) && m.ret != null);
      const growth = yearMonths.reduce((g, m) => g * (1 + m.ret), 1);
      return {
        year,
        ret: yearMonths.length ? growth - 1 : null,
        startVal: first.total_cad,
        endVal: last.total_cad,
        change: last.total_cad - first.total_cad
      };
    }).sort((a, b) => a.year.localeCompare(b.year));
  },

  positionPnL(positions, totalCAD) {
    return positions
      .filter(p => p.shares && p.current_value_cad)
      .map(p => {
        // Cost basis (total_cost/cost_per_share) is stored in the position's
        // NATIVE currency, but current_value_cad is already FX-converted.
        // Convert cost to CAD using the same implied FX rate before diffing,
        // so USD holdings don't subtract a USD cost from a CAD value.
        const fx = (p.currency === 'USD' && p.current_value) ? (p.current_value_cad / p.current_value) : 1;
        const costNative = p.total_cost != null ? p.total_cost : p.shares * (p.cost_per_share || 0);
        const costCAD = costNative * fx;
        return {
          ...p,
          unrealizedGain: p.current_value_cad - costCAD,
          // % return is currency-invariant (native value vs native cost), so
          // return_inception is already correct as stored — no FX needed here.
          unrealizedPct: p.return_inception,
          weight: totalCAD ? p.current_value_cad / totalCAD : null
        };
      })
      .sort((a, b) => b.current_value_cad - a.current_value_cad);
  },

  // Backfill return_last_month / return_last_year for a position when the
  // stored value is null. This happens for months not covered by the XLSX
  // import that originally populated these fields (notably: every position
  // has been missing return_last_year for months 2026-06 onward). Falls back
  // to a price-only return (current_price vs the same ticker's price ~1mo /
  // ~12mo earlier), since we have per-month price snapshots for every
  // holding. This ignores intra-window dividends, so it's an approximation —
  // callers should flag estimated cells in the UI (see `_estimated` field).
  fillMissingPositionReturns(latestPositions, allPositions, asOfDate) {
    const byTicker = {};
    for (const p of allPositions) {
      (byTicker[p.ticker] ||= []).push(p);
    }
    for (const arr of Object.values(byTicker)) arr.sort((a, b) => a.date.localeCompare(b.date));

    const findPriceMonthsBack = (ticker, months) => {
      const rows = byTicker[ticker];
      if (!rows) return null;
      const target = new Date(asOfDate + 'T00:00:00');
      target.setMonth(target.getMonth() - months);
      // nearest row with date <= target, else nearest overall (handles month-end drift)
      const candidates = rows.filter(r => new Date(r.date + 'T00:00:00') <= target);
      const row = candidates.length ? candidates[candidates.length - 1] : null;
      return row && row.current_price != null ? row : null;
    };

    return latestPositions.map(p => {
      const out = { ...p };
      if (out.return_last_month == null) {
        const prior = findPriceMonthsBack(p.ticker, 1);
        if (prior && prior.current_price) {
          out.return_last_month = (p.current_price - prior.current_price) / prior.current_price;
          out._estimated_last_month = true;
        }
      }
      if (out.return_last_year == null) {
        const prior = findPriceMonthsBack(p.ticker, 12);
        if (prior && prior.current_price) {
          out.return_last_year = (p.current_price - prior.current_price) / prior.current_price;
          out._estimated_last_year = true;
        }
      }
      return out;
    });
  }
};
