import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Battery, BatteryCharging, Wifi, Volume2, VolumeX, Cpu, Gauge, MemoryStick } from 'lucide-react';

// Quick access side panel — system info at a glance (battery, wifi, volume, performance).
export default function QuickAccess({ bind, onClose }) {
  const [info, setInfo] = useState(null);
  const [sel, setSel] = useState(0);
  const timerRef = useRef(0);

  useEffect(() => {
    const tick = () => window.gjallar.sysinfo().then(setInfo).catch(() => {});
    tick();
    timerRef.current = setInterval(tick, 2000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Build a flat list of interactive section keys in display order.
  const sections = [];
  if (info?.battery != null) sections.push('battery');
  if (info?.wifi != null) sections.push('wifi');
  sections.push('volume');
  sections.push('performance');

  // Move selection within bounds of the section list.
  const clamp = (v) => Math.max(0, Math.min(sections.length - 1, v));

  bind((btn) => {
    if (btn === 'b') return onClose();
    if (btn === 'up') setSel((s) => clamp(s - 1));
    if (btn === 'down') setSel((s) => clamp(s + 1));
    const key = sections[sel];

    // Volume row — left/right adjusts, A toggles mute.
    if (key === 'volume') {
      if (btn === 'left' && info?.volume != null) window.gjallar.setVolume(Math.max(0, info.volume - 5)).catch(() => {});
      if (btn === 'right' && info?.volume != null) window.gjallar.setVolume(Math.min(100, info.volume + 5)).catch(() => {});
      if (btn === 'a') window.gjallar.setMute(!info?.muted).catch(() => {});
    }
  });


  return (
    <motion.div
      className="qa-panel"
      initial={{ x: 420 }}
      animate={{ x: 0 }}
      exit={{ x: 420 }}
      transition={{ type: 'tween', duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: 400,
        height: '100vh',
        background: 'rgba(8,10,22,.94)',
        backdropFilter: 'blur(18px)',
        padding: 28,
        zIndex: 900,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 className="h-title" style={{ fontSize: 26 }}>Quick Access</h2>
      </div>

      {/* Sections rendered vertically */}
      {sections.map((key, idx) => (
        <SectionRow
          key={key}
          sectionKey={key}
          info={info}
          selected={sel === idx}
          setSel={setSel}
        />
      ))}

      {sections.length === 0 && <div className="muted">No system data available</div>}

      {/* Hint bar */}
      <div className="inst-hint" style={{ marginTop: 24 }}>
        <b className="btn-glyph b">B</b>Close
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Per-section row renderer                                           */
/* ------------------------------------------------------------------ */

function SectionRow({ sectionKey, info, selected, isSelected, setSel }) {
  const ref = useRef(null);

  // Re-scroll when selection lands on this row.
  useEffect(() => {
    if (selected && ref.current) ref.current.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  return (
    <div ref={ref}>
      {sectionKey === 'battery' && <BatteryRow info={info} />}
      {sectionKey === 'wifi' && <WifiRow info={info} />}
      {sectionKey === 'volume' && <VolumeRow info={info} selected={selected} setSel={setSel} />}
      {sectionKey === 'performance' && <PerfRow info={info} />}
    </div>
  );
}

function BatteryRow({ info }) {
  const b = info?.battery;
  if (!b) return null;
  const pct = Math.round(b.percent ?? 0);
  const Icon = b.charging ? BatteryCharging : Battery;
  const color = pct > 60 ? '#4ade80' : pct > 20 ? '#facc15' : '#f87171';
  return (
    <div className="qa-section">
      <SectionHead label="Battery" Icon={Battery} />
      <Row selected={false} style={{ marginBottom: 8 }}>
        <Icon size={18} style={{ color }} />
        <span className="muted" style={{ marginRight: 12 }}>{b.charging ? 'Plugged in' : `${pct}% remaining`}</span>
      </Row>
      <ProgressBar value={Math.max(0, Math.min(100, pct))} color={color} />
    </div>
  );
}

function WifiRow({ info }) {
  const w = info?.wifi;
  if (!w) return null;
  const sig = Math.round(w.signal ?? 0);
  const color = sig > 70 ? '#4ade80' : sig > 40 ? '#facc15' : '#f87171';
  const bars = sig > 70 ? 4 : sig > 40 ? 3 : sig > 20 ? 2 : 1;
  return (
    <div className="qa-section">
      <SectionHead label="Wi-Fi" Icon={Wifi} />
      <Row selected={false} style={{ marginBottom: 8 }}>
        <Wifi size={18} style={{ color }} />
        <span>{w.name}</span>
      </Row>
      <div className="qa-bars">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} style={{
            height: 6 + i * 5, width: 5, borderRadius: 2,
            background: i < bars ? color : 'rgba(255,255,255,.1)',
            transition: 'background .2s',
          }} />
        ))}
      </div>
    </div>
  );
}

function VolumeRow({ info, selected, setSel }) {
  const vol = info?.volume ?? 50;
  const muted = info?.muted ?? false;
  const color = muted ? '#f87171' : '#4ade80';

  // Override up/down to skip over this row.
  useEffect(() => {
    return undefined; // bind is called by the parent on every render; we don't handle nav here.
  }, []);

  return (
    <div className="qa-section">
      <SectionHead label="Volume" Icon={Volume2} />
      <Row selected={selected} style={{ marginBottom: 8 }} onClick={() => {}}>
        {muted ? <VolumeX size={18} style={{ color: '#f87171' }} /> : <Volume2 size={18} style={{ color }} />}
        <span>{muted ? 'Muted' : `${vol}%`}</span>
      </Row>
      <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, margin: '4px 0' }}>
        <div style={{ height: '100%', width: `${Math.max(0, muted ? 0 : vol)}%`, background: color, borderRadius: 3, transition: 'width .15s' }} />
      </div>
    </div>
  );
}

function PerfRow({ info }) {
  return (
    <div className="qa-section">
      <SectionHead label="Performance" Icon={Cpu} />
      <StatBar label="CPU" Icon={Cpu} value={info?.cpu} color="#38bdf8" />
      {info?.gpu != null && (
        <StatBar label="GPU" Icon={Gauge} value={info.gpu} color="#a78bfa" />
      )}
      {info?.ramUsedGb != null && info.ramTotalGb != null && (
        <StatBar label="RAM" Icon={MemoryStick} value={Math.round((info.ramUsedGb / info.ramTotalGb) * 100)} color="#f472b6" unit={`${info.ramUsedGb.toFixed(1)} / ${info.ramTotalGb} GB`} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tiny helpers                                                       */
/* ------------------------------------------------------------------ */

function SectionHead({ label, Icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Icon size={15} className="muted" />
      <span className="eyebrow">{label}</span>
    </div>
  );
}

function Row({ children, selected, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4,
      background: selected ? 'rgba(212,175,55,.15)' : 'transparent',
      cursor: 'pointer', ...style,
    }}>
      {children}
    </div>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, background: color, borderRadius: 3, transition: 'width .2s' }} />
    </div>
  );
}

function StatBar({ label, Icon, value, color, unit }) {
  const pct = Math.round((value ?? 0));
  const display = unit ? unit : `${pct}%`;
  return (
    <Row selected={false} style={{ marginBottom: 6 }}>
      <Icon size={15} style={{ color }} />
      <span className="muted">{label}</span>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: color, borderRadius: 3, transition: 'width .2s' }} />
      </div>
      <span style={{ minWidth: 56, textAlign: 'right', fontSize: 12 }}>{display}</span>
    </Row>
  );
}
