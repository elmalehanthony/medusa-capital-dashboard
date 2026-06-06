// charts.js — Chart.js wrappers + shared formatters

const Charts = {
  _instances: {},

  destroy(id) {
    if (this._instances[id]) { this._instances[id].destroy(); delete this._instances[id]; }
  },

  portfolioHistory(canvasId, snapshots) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const labels = snapshots.map(s => new Date(s.date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', year: '2-digit' }));
    this._instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Portfolio Value',
            data: snapshots.map(s => s.total_cad),
            borderColor: '#0075BE',
            backgroundColor: 'rgba(0,117,190,0.07)',
            borderWidth: 2.5, fill: true, tension: 0.4,
            pointRadius: 3, pointBackgroundColor: '#0075BE',
          },
          {
            label: 'Net Invested',
            data: snapshots.map(s => s.net_invested_inception),
            borderColor: '#c0c0b8', borderWidth: 1.5, borderDash: [4,4],
            fill: false, tension: 0.4, pointRadius: 0,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: '#555552', boxWidth: 12, font: { size: 11 } } },
          tooltip: { callbacks: { label: c => ' ' + formatCAD(c.parsed.y) } }
        },
        scales: {
          x: { ticks: { color: '#999994', font: { size: 10 } }, grid: { color: '#f0f0ec' } },
          y: { ticks: { color: '#999994', font: { size: 10 }, callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: '#f0f0ec' } }
        }
      }
    });
  },

  heroSparkline(canvasId, snapshots) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this._instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: snapshots.map(s => s.date),
        datasets: [{ data: snapshots.map(s => s.total_cad), borderColor: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: false
      }
    });
  },

  sectorBars(containerId, positions) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const map = {}; let total = 0;
    positions.forEach(p => { const s = p.sector || 'Other'; const v = p.current_value_cad || 0; map[s] = (map[s] || 0) + v; total += v; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const COLORS = ['#0075BE','#1a8a9b','#2563eb','#7c3aed','#00875a','#b45309','#6b7280'];
    container.innerHTML = sorted.map(([name, val], i) => {
      const pct = total > 0 ? val / total * 100 : 0;
      return `<div class="alloc-row">
        <div class="alloc-label">${name}</div>
        <div class="alloc-bar-wrap"><div class="alloc-bar" style="width:${pct.toFixed(1)}%;background:${COLORS[i]}"></div></div>
        <div class="alloc-pct">${pct.toFixed(1)}%</div>
        <div class="alloc-val">${formatCAD(val)}</div>
      </div>`;
    }).join('');
  },

  performanceBar(canvasId, positions, count = 12) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const sorted = [...positions].filter(p => p.return_inception != null)
      .sort((a, b) => b.return_inception - a.return_inception).slice(0, count);
    this._instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(p => p.ticker),
        datasets: [{ data: sorted.map(p => +(p.return_inception * 100).toFixed(1)), backgroundColor: sorted.map(p => p.return_inception >= 0 ? 'rgba(0,135,90,0.75)' : 'rgba(192,57,43,0.75)'), borderRadius: 4, borderSkipped: false }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + c.parsed.x.toFixed(1) + '%' } } },
        scales: {
          x: { ticks: { color: '#999994', font: { size: 10 }, callback: v => v + '%' }, grid: { color: '#f0f0ec' } },
          y: { ticks: { color: '#555552', font: { size: 11 } }, grid: { display: false } }
        }
      }
    });
  },

  drawdownChart(canvasId, series) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this._instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: series.map(s => new Date(s.date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', year: '2-digit' })),
        datasets: [{ data: series.map(s => +(s.drawdown * 100).toFixed(2)), borderColor: '#c0392b', backgroundColor: 'rgba(192,57,43,0.08)', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + c.parsed.y.toFixed(2) + '%' } } },
        scales: {
          x: { ticks: { color: '#999994', font: { size: 10 } }, grid: { color: '#f0f0ec' } },
          y: { ticks: { color: '#999994', font: { size: 10 }, callback: v => v + '%' }, grid: { color: '#f0f0ec' } }
        }
      }
    });
  },

  monthlyReturnBars(canvasId, monthlyReturns) {
    this.destroy(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this._instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyReturns.map(r => r.label),
        datasets: [{ data: monthlyReturns.map(r => +(r.ret * 100).toFixed(2)), backgroundColor: monthlyReturns.map(r => r.ret >= 0 ? 'rgba(0,135,90,0.7)' : 'rgba(192,57,43,0.7)'), borderRadius: 3 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' ' + c.parsed.y.toFixed(2) + '%' } } },
        scales: {
          x: { ticks: { color: '#999994', font: { size: 9 }, maxRotation: 45 }, grid: { display: false } },
          y: { ticks: { color: '#999994', font: { size: 10 }, callback: v => v + '%' }, grid: { color: '#f0f0ec' } }
        }
      }
    });
  }
};

// ── Formatters (global, used by all pages) ─────────────────────────────
function formatCAD(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function formatUSD(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}
function formatPct(n, decimals = 1) {
  if (n == null || isNaN(n)) return '—';
  return (n >= 0 ? '+' : '') + (n * 100).toFixed(decimals) + '%';
}
function formatDate(s) {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatNum(n, decimals = 2) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-CA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
