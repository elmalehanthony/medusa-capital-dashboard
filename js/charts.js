// charts.js — Chart.js wrappers + global formatters

const Charts = {
  _i: {},
  destroy(id){ if(this._i[id]){this._i[id].destroy();delete this._i[id];} },

  _theme(){
    return {
      gridColor: 'rgba(0,0,0,0.05)',
      textColor: '#9A9A9A',
      tooltipBg: '#1A1A1A',
    };
  },

  portfolioHistory(canvasId, snapshots){
    this.destroy(canvasId);
    const ctx=document.getElementById(canvasId); if(!ctx)return;
    const t=this._theme();
    const labels=snapshots.map(s=>new Date(s.date+'T00:00:00').toLocaleDateString('en-CA',{month:'short',year:'2-digit'}));
    this._i[canvasId]=new Chart(ctx,{
      type:'line',
      data:{
        labels,
        datasets:[
          {label:'Portfolio',data:snapshots.map(s=>s.total_cad),borderColor:'#0066CC',backgroundColor:'rgba(0,102,204,0.06)',borderWidth:2,fill:true,tension:0.4,pointRadius:0,pointHoverRadius:4,pointHoverBackgroundColor:'#0066CC'},
          {label:'Net Invested',data:snapshots.map(s=>s.net_invested_inception),borderColor:'#C4C4C4',borderWidth:1.5,borderDash:[4,4],fill:false,tension:0.4,pointRadius:0}
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{position:'top',labels:{color:t.textColor,boxWidth:10,font:{size:11},padding:16}},
          tooltip:{backgroundColor:t.tooltipBg,titleColor:'#fff',bodyColor:'rgba(255,255,255,0.75)',padding:10,cornerRadius:6,callbacks:{label:c=>' '+formatCAD(c.parsed.y)}}
        },
        scales:{
          x:{ticks:{color:t.textColor,font:{size:10}},grid:{color:t.gridColor},border:{display:false}},
          y:{ticks:{color:t.textColor,font:{size:10},callback:v=>'$'+(v/1000).toFixed(0)+'k'},grid:{color:t.gridColor},border:{display:false}}
        }
      }
    });
  },

  heroSparkline(canvasId, snapshots){
    this.destroy(canvasId);
    const ctx=document.getElementById(canvasId); if(!ctx)return;
    this._i[canvasId]=new Chart(ctx,{
      type:'line',
      data:{
        labels:snapshots.map(s=>s.date),
        datasets:[{data:snapshots.map(s=>s.total_cad),borderColor:'rgba(255,255,255,0.5)',backgroundColor:'rgba(255,255,255,0.05)',borderWidth:1.5,fill:true,tension:0.4,pointRadius:0}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{enabled:false}},
        scales:{x:{display:false},y:{display:false}},
        animation:false
      }
    });
  },

  sectorBars(containerId, positions){
    const el=document.getElementById(containerId); if(!el)return;
    const map={};let total=0;
    positions.forEach(p=>{const s=p.sector||'Other';const v=p.current_value_cad||0;map[s]=(map[s]||0)+v;total+=v;});
    const sorted=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,7);
    const COLORS=['#0066CC','#00A86B','#6644DD','#C07A00','#E03131','#0088AA','#888780'];
    el.innerHTML=sorted.map(([name,val],i)=>{
      const pct=total>0?val/total*100:0;
      return `<div class="alloc-row">
        <div class="alloc-label">${name}</div>
        <div class="alloc-bar-wrap"><div class="alloc-bar" style="width:${pct.toFixed(1)}%;background:${COLORS[i]}"></div></div>
        <div class="alloc-pct">${pct.toFixed(1)}%</div>
        <div class="alloc-val">${formatCAD(val)}</div>
      </div>`;
    }).join('');
  },

  performanceBar(canvasId, positions, count=12){
    this.destroy(canvasId);
    const ctx=document.getElementById(canvasId); if(!ctx)return;
    const t=this._theme();
    const sorted=[...positions].filter(p=>p.return_inception!=null).sort((a,b)=>b.return_inception-a.return_inception).slice(0,count);
    this._i[canvasId]=new Chart(ctx,{
      type:'bar',
      data:{
        labels:sorted.map(p=>p.ticker),
        datasets:[{data:sorted.map(p=>+(p.return_inception*100).toFixed(1)),backgroundColor:sorted.map(p=>p.return_inception>=0?'rgba(0,168,107,0.8)':'rgba(224,49,49,0.8)'),borderRadius:4,borderSkipped:false}]
      },
      options:{
        indexAxis:'y',responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{backgroundColor:t.tooltipBg,titleColor:'#fff',bodyColor:'rgba(255,255,255,0.75)',callbacks:{label:c=>' '+c.parsed.x.toFixed(1)+'%'}}},
        scales:{
          x:{ticks:{color:t.textColor,font:{size:10},callback:v=>v+'%'},grid:{color:t.gridColor},border:{display:false}},
          y:{ticks:{color:'#3A3A3A',font:{size:11}},grid:{display:false},border:{display:false}}
        }
      }
    });
  },

  drawdownChart(canvasId, series){
    this.destroy(canvasId);
    const ctx=document.getElementById(canvasId); if(!ctx)return;
    const t=this._theme();
    this._i[canvasId]=new Chart(ctx,{
      type:'line',
      data:{
        labels:series.map(s=>new Date(s.date+'T00:00:00').toLocaleDateString('en-CA',{month:'short',year:'2-digit'})),
        datasets:[{data:series.map(s=>+(s.drawdown*100).toFixed(2)),borderColor:'#E03131',backgroundColor:'rgba(224,49,49,0.07)',borderWidth:1.5,fill:true,tension:0.3,pointRadius:0}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{backgroundColor:t.tooltipBg,titleColor:'#fff',bodyColor:'rgba(255,255,255,0.75)',callbacks:{label:c=>' '+c.parsed.y.toFixed(2)+'%'}}},
        scales:{
          x:{ticks:{color:t.textColor,font:{size:10}},grid:{color:t.gridColor},border:{display:false}},
          y:{ticks:{color:t.textColor,font:{size:10},callback:v=>v+'%'},grid:{color:t.gridColor},border:{display:false}}
        }
      }
    });
  },

  monthlyReturnBars(canvasId, monthlyReturns){
    this.destroy(canvasId);
    const ctx=document.getElementById(canvasId); if(!ctx)return;
    const t=this._theme();
    this._i[canvasId]=new Chart(ctx,{
      type:'bar',
      data:{
        labels:monthlyReturns.map(r=>r.label),
        datasets:[{data:monthlyReturns.map(r=>+(r.ret*100).toFixed(2)),backgroundColor:monthlyReturns.map(r=>r.ret>=0?'rgba(0,168,107,0.75)':'rgba(224,49,49,0.75)'),borderRadius:3}]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{backgroundColor:t.tooltipBg,titleColor:'#fff',bodyColor:'rgba(255,255,255,0.75)',callbacks:{label:c=>' '+c.parsed.y.toFixed(2)+'%'}}},
        scales:{
          x:{ticks:{color:t.textColor,font:{size:9},maxRotation:45},grid:{display:false},border:{display:false}},
          y:{ticks:{color:t.textColor,font:{size:10},callback:v=>v+'%'},grid:{color:t.gridColor},border:{display:false}}
        }
      }
    });
  }
};

// ── Global formatters ─────────────────────────────────────────────
function formatCAD(n){
  if(n==null||isNaN(n))return '—';
  return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',minimumFractionDigits:0,maximumFractionDigits:0}).format(n);
}
function formatUSD(n){
  if(n==null||isNaN(n))return '—';
  return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:0}).format(n);
}
function formatPct(n,d=1){
  if(n==null||isNaN(n))return '—';
  return (n>=0?'+':'')+(n*100).toFixed(d)+'%';
}
function formatDate(s){
  if(!s)return '—';
  return new Date(s+'T00:00:00').toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'});
}
function formatNum(n,d=2){
  if(n==null||isNaN(n))return '—';
  return n.toLocaleString('en-CA',{minimumFractionDigits:d,maximumFractionDigits:d});
}
