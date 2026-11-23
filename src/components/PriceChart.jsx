import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { money } from '../api.js';

// ITAD history is a list of per-shop price events. Turn it into "cheapest price anywhere" over time.
export function cheapestOverTime(events) {
  const byShop = new Map();
  const out = [];
  for (const e of events) {
    byShop.set(e.shop || 'shop', e.price);
    const min = Math.min(...byShop.values());
    const shop = [...byShop.entries()].find(([, p]) => p === min)?.[0];
    if (out.length && out[out.length - 1].t === e.t) out[out.length - 1] = { t: e.t, price: min, shop };
    else if (!out.length || out[out.length - 1].price !== min) out.push({ t: e.t, price: min, shop });
  }
  return out;
}

const RANGES = [['1Y', 365], ['3Y', 1095], ['All', 0]];
const fmtDate = (t) => new Date(t).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

// Single-series step line + labelled all-time-low reference line, crosshair tooltip, table view.
export default function PriceChart({ points, low }) {
  const [range, setRange] = useState(0);
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const ref = useRef(null);
  const W = 640, H = 200, P = { l: 44, r: 12, t: 14, b: 24 };

  const data = useMemo(() => {
    if (!points.length) return [];
    const days = RANGES[range][1];
    const from = days ? Date.now() - days * 864e5 : -Infinity;
    const inRange = points.filter((p) => p.t >= from);
    const before = points.filter((p) => p.t < from).pop();
    const d = before ? [{ ...before, t: from }, ...inRange] : inRange;
    return d.length ? [...d, { ...d[d.length - 1], t: Date.now(), now: true }] : [];
  }, [points, range]);

  if (!points.length) return null;
  const t0 = data[0]?.t ?? Date.now(), t1 = Date.now();
  const maxP = Math.max(...data.map((d) => d.price), low ?? 0) * 1.1 || 1;
  const x = (t) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r);
  const y = (p) => P.t + (1 - p / maxP) * (H - P.t - P.b);
  let dPath = '';
  data.forEach((d, i) => { dPath += i ? ` H${x(d.t)} V${y(d.price)}` : `M${x(d.t)} ${y(d.price)}`; });
  const area = `${dPath} V${y(0)} H${x(data[0].t)} Z`;
  const ticks = [0, 0.5, 1].map((f) => Math.round(maxP * f / 1.1));

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const tx = t0 + ((((e.clientX - r.left) / r.width) * W - P.l) / (W - P.l - P.r)) * (t1 - t0);
    let pt = data[0];
    for (const d of data) if (d.t <= tx) pt = d;
    setHover({ ...pt, hx: Math.max(P.l, Math.min(W - P.r, ((e.clientX - r.left) / r.width) * W)), tx });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
        {RANGES.map(([l], i) => <button key={l} className={`chip ${range === i ? 'on' : ''}`} style={{ height: 26, fontSize: 11.5 }} onClick={() => setRange(i)}>{l}</button>)}
        <div style={{ flex: 1 }} />
        <button className="btn sm ghost" onClick={() => setTable(!table)}>{table ? 'Chart' : 'Table'}</button>
      </div>
      {table ? (
        <div style={{ maxHeight: 220, overflowY: 'auto', fontSize: 12.5 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr className="muted" style={{ textAlign: 'left' }}><th>Date</th><th>Cheapest</th><th>Store</th></tr></thead>
            <tbody>{[...points].reverse().map((p, i) => <tr key={i} style={{ borderTop: '1px solid var(--line)' }}><td>{fmtDate(p.t)}</td><td><b>{money(p.price)}</b></td><td className="muted">{p.shop}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <svg ref={ref} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            <defs>
              <linearGradient id="pc-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3cf2b0" stopOpacity=".28" /><stop offset="1" stopColor="#3cf2b0" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.06)" />
                <text x={P.l - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">${v}</text>
              </g>
            ))}
            <text x={P.l} y={H - 6} fontSize="10" fill="var(--muted)">{fmtDate(t0)}</text>
            <text x={W - P.r} y={H - 6} fontSize="10" fill="var(--muted)" textAnchor="end">Today</text>
            {low != null && (
              <g>
                <line x1={P.l} x2={W - P.r} y1={y(low)} y2={y(low)} stroke="#f0c869" strokeDasharray="4 4" strokeWidth="1.5" />
                <text x={W - P.r - 4} y={y(low) - 5} textAnchor="end" fontSize="10.5" fill="var(--ink-2)">All-time low {money(low)}</text>
              </g>
            )}
            <motion.path d={area} fill="url(#pc-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} key={'a' + range} />
            <motion.path d={dPath} fill="none" stroke="#3cf2b0" strokeWidth="2" strokeLinejoin="round" key={'l' + range}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeInOut' }} />
            {hover && (
              <g pointerEvents="none">
                <line x1={hover.hx} x2={hover.hx} y1={P.t} y2={H - P.b} stroke="rgba(255,255,255,.25)" />
                <circle cx={hover.hx} cy={y(hover.price)} r="4.5" fill="#3cf2b0" stroke="var(--bg)" strokeWidth="2" />
              </g>
            )}
          </svg>
          {hover && (
            <div className="glass" style={{ position: 'absolute', top: 0, left: `${(hover.hx / W) * 100}%`, transform: `translateX(${hover.hx > W * 0.6 ? '-105%' : '8%'})`, padding: '8px 12px', fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap', borderRadius: 10 }}>
              <div className="muted">{fmtDate(hover.tx)}</div>
              <b style={{ fontSize: 14 }}>{money(hover.price)}</b> <span className="muted">{hover.shop}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
