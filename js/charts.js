// charts.js — Chart.js wrappers

const Charts = {
  _instances: {},

  destroy(id) {
    if (this._instances[id]) {
      this._instances[id].destroy();
      delete this._instances[id];
    }
  },

  portfolioHistory(canvasId, snapshots) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const labels = snapshots.map(s => {
      const d = new Date(s.date + 'T00:00:00');
      return d.toLocaleDateString('en-CA', { month: 'short', year: '2-digit' });
    });
    this._instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Portfolio Value (CAD)',
            data: snapshots.map(s => s.total_cad),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.08)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 4
          },
          {
            label: 'Net Invested',
            data: snapshots.map(s => s.net_invested_inception),
            borderColor: '#10b981',
            borderWidth: 2,
            borderDash: [5,5],
            fill: false,
            tension: 0.3,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#e2e2f0', boxWidth: 12 } },
          tooltip: { callbacks: { label: ctx => ' ' + formatCAD(ctx.parsed.y) } }
        },
        scales: {
          x: { ticks: { color: '#8888aa' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#8888aa', callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(255,255,255,0.04)' } }
        }
      }
    });
  },

  sectorAllocation(canvasId, positions) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const sectorMap = {};
    positions.forEach(p => {
      const s = p.sector || 'Other';
      sectorMap[s] = (sectorMap[s] || 0) + (p.current_value_cad || 0);
    });
    const sorted = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);
    const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16'];
    this._instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: sorted.map(([k]) => k),
        datasets: [{ data: sorted.map(([,v]) => v), backgroundColor: COLORS, borderWidth: 2, borderColor: '#1a1a2e' }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#e2e2f0', boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + formatCAD(ctx.parsed) } }
        }
      }
    });
  },

  performanceBar(canvasId, positions, count = 10) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const sorted = [...positions]
      .filter(p => p.return_inception != null)
      .sort((a, b) => b.return_inception - a.return_inception)
      .slice(0, count);
    this._instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(p => p.ticker),
        datasets: [{
          label: 'Return since inception',
          data: sorted.map(p => +(p.return_inception * 100).toFixed(1)),
          backgroundColor: sorted.map(p => p.return_inception >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'),
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8888aa', callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#e2e2f0' }, grid: { display: false } }
        }
      }
    });
  }
};

// ── Shared formatters ──────────────────────────────────────────────
function formatCAD(n) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(n);
}
function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}
function formatPct(n) {
  if (n == null) return '—';
  return (n >= 0 ? '+' : '') + (n * 100).toFixed(1) + '%';
}
function formatDate(s) {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}
