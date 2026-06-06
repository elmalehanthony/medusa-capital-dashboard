// data.js — load, cache, and query portfolio.json

const Data = {
  _cache: null,

  async load() {
    if (this._cache) return this._cache;
    const res = await fetch('./data/portfolio.json?v=' + Date.now());
    if (!res.ok) throw new Error('portfolio.json not found (' + res.status + '). Has the file been uploaded to the repo?');
    this._cache = await res.json();
    return this._cache;
  },

  async latestSnapshot() {
    const d = await this.load();
    if (!d.snapshots || !d.snapshots.length) return null;
    return [...d.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
  },

  async snapshotHistory() {
    const d = await this.load();
    return [...(d.snapshots || [])].sort((a, b) => a.date.localeCompare(b.date));
  },

  // Returns positions for a given date, or latest date if omitted.
  // Robust: tries exact match, then year-month prefix match as fallback.
  async positions(date = null) {
    const d = await this.load();
    if (!d.positions || !d.positions.length) return [];

    let targetDate = date;
    if (!targetDate) {
      const latest = await this.latestSnapshot();
      targetDate = latest?.date;
    }
    if (!targetDate) return [];

    // Exact match first
    let result = d.positions.filter(p => p.date === targetDate);
    if (result.length) return result;

    // Fallback: find the closest date in positions data
    const allDates = [...new Set(d.positions.map(p => p.date))].sort();
    // Pick the latest date that is <= targetDate
    const closest = allDates.filter(dd => dd <= targetDate).pop()
      || allDates[allDates.length - 1];
    return d.positions.filter(p => p.date === closest);
  },

  async allPositionDates() {
    const d = await this.load();
    return [...new Set((d.positions || []).map(p => p.date))].sort();
  },

  async transactions() {
    const d = await this.load();
    return [...(d.transactions || [])].sort((a, b) => b.date.localeCompare(a.date));
  },

  async income() {
    const d = await this.load();
    return [...(d.income || [])].sort((a, b) => b.date.localeCompare(a.date));
  },

  async merge(parsed) {
    const d = await this.load();

    if (parsed.snapshot) {
      const idx = d.snapshots.findIndex(s => s.date === parsed.snapshot.date);
      if (idx >= 0) d.snapshots[idx] = parsed.snapshot;
      else d.snapshots.push(parsed.snapshot);
    }

    if (parsed.positions?.length) {
      const date = parsed.snapshot?.date || parsed.positions[0].date;
      d.positions = d.positions.filter(p => p.date !== date);
      d.positions.push(...parsed.positions);
    }

    if (parsed.transactions?.length) {
      const existing = new Set(d.transactions.map(t => `${t.date}|${t.type}|${t.ticker}|${t.amount}`));
      d.transactions.push(...parsed.transactions.filter(t => !existing.has(`${t.date}|${t.type}|${t.ticker}|${t.amount}`)));
    }

    if (parsed.income?.length) {
      const existing = new Set(d.income.map(i => `${i.date}|${i.ticker}|${i.amount}`));
      d.income.push(...parsed.income.filter(i => !existing.has(`${i.date}|${i.ticker}|${i.amount}`)));
    }

    this._cache = d;
    return d;
  }
};
