import { motion } from 'framer-motion';
import React from 'react';

const fmtMin = (ms) => {
  const m = Math.round(ms / 60000);
  return m < 1 ? '< 1 min' : `${m} min`;
};

const fmtDate = (ms) => new Date(ms).toLocaleString();

function buildPath(samples, fn, w, h) {
  const n = samples.length;
  if (n < 2) return '';
  const xStep = w / (n - 1);
  return samples.map((s, i) =>
    `${i === 0 ? 'M' : 'L'}${(i * xStep).toFixed(1)},${(h - (fn(s) / 100) * h).toFixed(1)}`
  ).join(' ');
}

function lineSvg({ title, samples, strokeColor, yMin = 0 }) {
  const n = samples.length;
  if (n < 2) return null;
  const W = 600, H = 140;
  const vals = samples.map((s) => s[strokeColor === '#ff9a5c' ? 'temp' : 'util']);
  yMin = Math.min(yMin, Math.floor(Math.min(...vals) / 10) * 10);
  const yMax = Math.max(...vals, yMin + 10);
  const pad = 28;
  const gridLines = [];
  const step = Math.ceil(yMax / 4) || 1;
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    const y = pad + ((yMax - v) / (yMax - yMin || 1)) * (H - pad * 2);
    gridLines.push(<line key={v} x1={pad} y1={y} x2={W - pad} y2={y} stroke="var(--muted)" strokeWidth="0.5" opacity="0.3" />);
  }
  const axisLabels = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    const y = pad + ((yMax - v) / (yMax - yMin || 1)) * (H - pad * 2);
    axisLabels.push(<text key={`l${v}`} x={pad - 4} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="10">{Math.round(v)}</text>);
  }
  const pathD = samples.map((s, i) => {
    const t = strokeColor === '#ff9a5c' ? s.temp : s.util;
    const x = pad + (i / (n - 1)) * (W - pad * 2);
    const y = pad + ((yMax - t) / (yMax - yMin || 1)) * (H - pad * 2);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <div style={{ marginTop: 20 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{title}</div>
      <svg viewBox={`0 ${pad - 8} ${W} ${H - pad + 8}`} style={{ width: '100%', height: 130, display: 'block' }}>
        {gridLines}
        {axisLabels}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function SessionReport({ report, onClose }) {
  if (!report) return null;
  const s = report.summary || {};
  const samples = report.samples || [];
  const enough = samples.length >= 2;
  const maxT = s.maxTemp || 0;

  return (
    <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="sheet glass"
        style={{ width: 760, padding: 32, maxWidth: '90vw' }}
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-head" style={{ marginTop: 0 }}>
          <span className="rune">ᛊ</span>
          <h2>Session report</h2>
          <div className="line" />
        </div>

        <p style={{ margin: '8px 0 16px', color: 'var(--muted)' }}>
          <b>{report.name}</b> &middot; {fmtDate(report.start)} &middot; {fmtMin(report.minutes * 60000)}
        </p>

        {enough ? (
          <>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 8 }}>
              <div className="glass stat">
                <div className="n">{s.avgTemp?.toFixed(1) ?? '--'}</div>
                <div className="l">avg temp &deg;C</div>
              </div>
              <div className="glass stat">
                <div className="n">{maxT.toFixed(1)}</div>
                <div className="l">max temp &deg;C</div>
              </div>
              <div className="glass stat">
                <div className="n">{s.avgUtil?.toFixed(1) ?? '--'}</div>
                <div className="l">avg GPU load %</div>
              </div>
              <div className="glass stat">
                <div className="n">{s.avgPower?.toFixed(1) ?? '--'}</div>
                <div className="l">avg power W</div>
              </div>
            </div>

            {lineSvg({ title: 'GPU temperature °C', samples, strokeColor: '#ff9a5c', yMin: 40 })}
            {lineSvg({ title: 'GPU load %', samples, strokeColor: '#3cf2b0' })}

            <p style={{ marginTop: 20, color: 'var(--muted)', fontStyle: 'italic' }}>
              {maxT >= 87
                ? 'Your GPU ran hot this session (87 °C or more). An FPS cap (see the Optimizer) or better airflow, or a cooling pad on a laptop, will help.'
                : 'Temps looked healthy — no thermal concerns.'}
            </p>
          </>
        ) : (
          <p style={{ color: 'var(--muted)', fontStyle: 'italic', marginTop: 12 }}>Not enough data (the game ran under a minute).</p>
        )}
      </motion.div>
    </motion.div>
  );
}
