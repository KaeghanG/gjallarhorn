import React, { useEffect, useState } from 'react';
import { Activity, Thermometer, Cpu, Gauge, MemoryStick } from 'lucide-react';

// Desktop "Play reports": every tracked game session with GPU temperature, use, power and VRAM.
const num = (v, d = 0, unit = '') => (v == null ? '—' : `${Number(v).toFixed(d)}${unit}`);

function Chart({ samples, k, color, label, unit }) {
  const pts = samples.filter((s) => s[k] != null).map((s) => s[k]);
  if (pts.length < 3) return null;
  const W = 640, H = 110, pad = 6;
  const lo = Math.min(...pts), hi = Math.max(...pts), range = hi - lo || 1;
  const x = (i) => pad + (i * (W - pad * 2)) / (pts.length - 1);
  const y = (v) => H - pad - ((v - lo) / range) * (H - pad * 2);
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <div className="rp-chart">
      <div className="rp-chart-h"><span>{label}</span><span className="muted">{num(lo, 0)}–{num(hi, 0)}{unit}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={`${line} L${x(pts.length - 1)},${H} L${x(0)},${H} Z`} fill={color} opacity=".15" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export default function Reports() {
  const [list, setList] = useState(null);
  const [sel, setSel] = useState(0);
  useEffect(() => { window.gjallar.sessionReports().then((l) => setList(Array.isArray(l) ? l : [])).catch(() => setList([])); }, []);
  const cur = list?.[sel];
  const s = cur?.summary || {};
  return (
    <div className="page">
      <h1 className="h-title"><Activity size={26} style={{ verticalAlign: -4, marginRight: 10 }} />Play reports</h1>
      <p className="muted" style={{ margin: '6px 0 18px' }}>Gjallarhorn records GPU temperature, use, power and video memory while a game it launched is running.</p>
      {list && !list.length && <div className="muted">No sessions recorded yet. Play something from Gjallarhorn.</div>}
      {list?.length > 0 && (
        <div className="rp-grid">
          <div className="rp-list">
            {list.map((r, i) => (
              <div key={r.id} className={`rp-row ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>
                <div><b>{r.name}</b><small>{new Date(r.start).toLocaleString()}</small></div>
                <span className="muted">{r.minutes} min</span>
              </div>
            ))}
          </div>
          <div className="rp-detail">
            <h2>{cur.name}</h2>
            <div className="rp-stats">
              <div><Thermometer size={16} /><b>{num(s.avgTemp, 0, '°C')}</b><small>Avg GPU temp</small></div>
              <div><Thermometer size={16} /><b>{num(s.maxTemp, 0, '°C')}</b><small>Max temp</small></div>
              <div><Cpu size={16} /><b>{num(s.avgUtil, 0, '%')}</b><small>Avg GPU use</small></div>
              <div><Gauge size={16} /><b>{num(s.avgPower, 0, ' W')}</b><small>Avg power</small></div>
              <div><MemoryStick size={16} /><b>{num(s.maxVram, 0, ' MB')}</b><small>Peak VRAM</small></div>
            </div>
            <Chart samples={cur.samples || []} k="temp" color="#ff6f9c" label="GPU temperature (°C)" unit="°" />
            <Chart samples={cur.samples || []} k="util" color="#5c9cff" label="GPU use (%)" unit="%" />
            <Chart samples={cur.samples || []} k="power" color="#f0c869" label="Power (W)" unit=" W" />
            {(cur.samples || []).length < 3 && <div className="muted">Too short for charts (needs a few minutes of play).</div>}
          </div>
        </div>
      )}
    </div>
  );
}
