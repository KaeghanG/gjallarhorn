import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Thermometer, Cpu, Gauge } from 'lucide-react';

// ---------- helpers ----------
const nullDash = (v) => (v == null ? '—' : v);
const fmtMin = (m) => (m == null ? '—' : `${m} min`);
const durMs = (s, e) => {
  if (e && e > s) return e - s;
  const lastSample = s.samples?.[s.samples.length - 1];
  if (lastSample?.t) return lastSample.t - s.start;
  return null;
};

// ---------- chart helpers ----------
const normalise = (samples, key) => {
  const pts = samples.filter((s) => s[key] != null).map((s) => ({ t: s.t, v: s[key] }));
  if (pts.length < 2) return [];
  const lo = Math.min(...pts.map((p) => p.v));
  const hi = Math.max(...pts.map((p) => p.v));
  const range = hi - lo || 1;
  return pts.map((p) => ({ t: p.t, r: (p.v - lo) / range }));
};

const svgPath = (normed, W, H) => {
  if (!normed.length) return '';
  const pad = 4;
  const step = (W - pad * 2) / (normed.length - 1);
  return normed
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * step).toFixed(1)},${(H - pad - p.r * (H - pad * 2)).toFixed(1)}`
    )
    .join(' ');
};

// ---------- component ----------
export default function PlayReports({ bind, onClose }) {
  const [reports, setReports] = useState([]);
  const [sel, setSel] = useState(0);
  const [err, setErr] = useState('');

  const refSel = useRef(null); // for scrolling selected row into view
  const idxRef = useRef(null);  // maps row index → DOM ref element

  useEffect(() => {
    (async () => {
      try {
        const data = await window.gjallar.sessionReports();
        setReports(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message ?? 'Failed to fetch session reports');
      }
    })();
  }, []);

  // Clamp selection so it stays in range when the list shrinks.
  useEffect(() => {
    if (reports.length > 0 && sel >= reports.length) setSel(reports.length - 1);
  }, [reports.length, sel]);

  // Scroll selected row into view on selection change.
  useEffect(() => {
    const el = idxRef.current;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  // Visible rows = all reports (newest first, no grouping needed).
  const visible = reports; // already sorted newest-first from backend

  // Input handling.
  bind((btn) => {
    if (btn === 'b') return onClose();
    if (btn === 'up') setSel((s) => Math.max(0, s - 1));
    if (btn === 'down') setSel((s) => Math.min(visible.length - 1, s + 1));

    const cur = visible[Math.min(sel, visible.length - 1)];
    if (!cur || btn !== 'a') return undefined;
    // A does nothing actionable on play reports (informational page).
    return undefined;
  });

  // ---------- right-panel detail for selected session ----------
  const selReport = visible[Math.min(sel, visible.length - 1)] ?? null;
  const hasDetail = !!selReport && visible.length > 0;

  const tiles = [];
  if (hasDetail) {
    const avgTemp = selReport.summary?.avgTemp;
    tiles.push(
      <div className="couch-stat-tile" key="avgTemp">
        <Thermometer size={18} style={{ color: 'var(--gold)', marginBottom: 4 }} />
        <div className="couch-stat-val">{nullDash(avgTemp)}&deg;C</div>
        <div className="couch-stat-label">Avg GPU Temp</div>
      </div>
    );
    tiles.push(
      <div className="couch-stat-tile" key="maxTemp">
        <Thermometer size={18} style={{ color: 'var(--gold)', marginBottom: 4 }} />
        <div className="couch-stat-val">{nullDash(selReport.summary?.maxTemp)}&deg;C</div>
        <div className="couch-stat-label">Max Temp</div>
      </div>
    );
    tiles.push(
      <div className="couch-stat-tile" key="avgUtil">
        <Cpu size={18} style={{ color: 'var(--gold)', marginBottom: 4 }} />
        <div className="couch-stat-val">{nullDash(selReport.summary?.avgUtil)}%</div>
        <div className="couch-stat-label">Avg GPU Use</div>
      </div>
    );
    tiles.push(
      <div className="couch-stat-tile" key="avgPower">
        <Gauge size={18} style={{ color: 'var(--gold)', marginBottom: 4 }} />
        <div className="couch-stat-val">{nullDash(selReport.summary?.avgPower)} W</div>
        <div className="couch-stat-label">Avg Power</div>
      </div>
    );
    tiles.push(
      <div className="couch-stat-tile" key="peakVram">
        <Activity size={18} style={{ color: 'var(--gold)', marginBottom: 4 }} />
        <div className="couch-stat-val">{nullDash(selReport.summary?.maxVram)} MB</div>
        <div className="couch-stat-label">Peak VRAM</div>
      </div>
    );
  }

  // Generate temp and util SVG chart data.
  const tempChart = hasDetail && selReport.samples?.length >= 3
    ? normalise(selReport.samples, 'temp')
    : null;
  const utilChart = hasDetail && selReport.samples?.length >= 3
    ? normalise(selReport.samples, 'util')
    : null;

  return (
    <motion.div
      className="couch-page inst-page"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="couch-page-bg">
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,22,.7)' }} />
      </div>
      <div className="inst-card">
        <div className="eyebrow">{visible.length > 0 ? `${visible.length} session${visible.length > 1 ? 's' : ''}` : 'Play Reports'}</div>
        <h1 className="h-title">Play Reports</h1>
        {err && <div className="fr-err">{err}</div>}

        {visible.length === 0 ? (
          <div className="muted" style={{ textAlign: 'center', padding: '32px 0' }}>
            No sessions recorded yet
          </div>
        ) : (
          <>
            {/* left column — session list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 240px', minWidth: 180 }}>
              {visible.map((s, i) => (
                <div
                  key={s.id ?? i}
                  ref={i === sel ? (el) => { idxRef.current = el; } : null}
                  className={`inst-lib ${i === sel ? 'on' : ''}`}
                >
                  <Activity size={18} />
                  <div className="grow">
                    <b style={{ display: 'block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </b>
                    <small>{new Date(s.start).toLocaleDateString()}</small>
                  </div>
                  <div className="muted" style={{ textAlign: 'right', minWidth: 50 }}>
                    {fmtMin(s.minutes)}
                  </div>
                </div>
              ))}
            </div>

            {/* right column — detail */}
            <div style={{ flex: '1 1 380px', minWidth: 260, marginLeft: 24 }}>
              {hasDetail ? (
                <>
                  {/* stat tiles */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    {tiles}
                  </div>

                  {/* temp chart */}
                  {tempChart && (
                    <svg viewBox="0 0 320 90" width="100%" height={90} style={{ display: 'block', marginBottom: 12 }}>
                      <text x="4" y="12" fill="var(--muted)" fontSize={10}>GPU Temp (&deg;C)</text>
                      <path d={svgPath(tempChart, 320, 90)} fill="none" stroke="var(--gold)" strokeWidth={1.5} />
                      {/* gradient overlay */}
                      <defs>
                        <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f0c86930" />
                          <stop offset="100%" stopColor="#f0c86905" />
                        </linearGradient>
                      </defs>
                      <path
                        d={svgPath(tempChart, 320, 90) + ` L${320 - 4},${90 - 4} L4,${90 - 4} Z`}
                        fill="url(#tempGrad)"
                      />
                    </svg>
                  )}

                  {/* util chart */}
                  {utilChart && (
                    <svg viewBox="0 0 320 90" width="100%" height={90} style={{ display: 'block' }}>
                      <text x="4" y="12" fill="var(--muted)" fontSize={10}>GPU Use (%)</text>
                      <path d={svgPath(utilChart, 320, 90)} fill="none" stroke="#6cc4ff" strokeWidth={1.5} />
                      <defs>
                        <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6cc4ff30" />
                          <stop offset="100%" stopColor="#6cc4ff05" />
                        </linearGradient>
                      </defs>
                      <path
                        d={svgPath(utilChart, 320, 90) + ` L${320 - 4},${90 - 4} L4,${90 - 4} Z`}
                        fill="url(#utilGrad)"
                      />
                    </svg>
                  )}
                </>
              ) : (
                <div className="muted">Select a session to see details</div>
              )}
            </div>
          </>
        )}

        {/* bottom hint row */}
        {visible.length > 0 ? (
          <div className="inst-hint">
            <b className="btn-glyph up">↑</b> Navigate
            {' · '}
            <b className="btn-glyph down">↓</b> Navigate
          </div>
        ) : null}
        <div className="inst-hint">
          <b className="btn-glyph b" style={{ marginLeft: 16 }}>B</b>Back
        </div>
      </div>
    </motion.div>
  );
}
