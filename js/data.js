// data.js — load and cache portfolio.json

const Data = {
  _cache: null,

  async load() {
    if (this._cache) return this._cache;
    const res = await fetch('./data/portfolio.json?nocache=' + Date.now());
    if (!res.ok) throw new Error('Failed to load portfolio.json');
    this._cache = await res.json();
    return this._cache;
  },

  async latestSnapshot() {
    const d = await this.load();
    return d.snapshots.sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  },

  async snapshotHistory() {
    const d = await this.load();
    return [...d.snapshots].sort((a, b) => a.date.localeCompare(b.date));
  },

  async positions(date = null) {
    const d = await this.load();
    if (!date) {
      const latest = await this.latestSnapshot();
      date = latest?.date;
    }
    return d.positions.filter(p => p.date === date);
  },

  async transactions() {
    const d = await this.load();
    return [...d.transactions].sort((a, b) => b.date.localeCompare(a.date));
  },

  async income() {
    const d = await this.load();
    return [...d.income].sort((a, b) => b.date.localeCompare(a.date));
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
      const existing = new Set(d.transactions.map(t =>
        `${t.date}|${t.type}|${t.ticker}|${t.amount}`
      ));
      const newTxns = parsed.transactions.filter(t =>
        !existing.has(`${t.date}|${t.type}|${t.ticker}|${t.amount}`)
      );
      d.transactions.push(...newTxns);
    }

    if (parsed.income?.length) {
      const existing = new Set(d.income.map(i =>
        `${i.date}|${i.ticker}|${i.amount}`
      ));
      const newIncome = parsed.income.filter(i =>
        !existing.has(`${i.date}|${i.ticker}|${i.amount}`)
      );
      d.income.push(...newIncome);
    }

    this._cache = d;
    return d;
  }
};
