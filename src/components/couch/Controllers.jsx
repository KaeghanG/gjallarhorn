import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Battery, BatteryMedium, BatteryLow, BatteryWarning, Plug } from 'lucide-react';

// Gjallarhorn controller manager page for couch mode. Polls pads and shows battery + test mode.
const BATTERY_ICON = {
  full: Battery,
  medium: BatteryMedium,
  low: BatteryLow,
  empty: BatteryWarning,
  wired: Plug,
};

const BATTERY_LABEL = {
  full: 'Full',
  medium: 'Medium',
  low: 'Low',
  empty: 'Empty',
  wired: 'Wired',
};

const TYPE_LABEL = {
  xbox: 'Xbox controller',
  playstation: 'PlayStation controller',
  generic: 'Controller',
};

function BatteryIcon({ battery }) {
  const Component = BATTERY_ICON[battery] || Battery;
  return <Component size={18} />;
}

export default function Controllers({ bind, onClose }) {
  const [pads, setPads] = useState([]);
  const [sel, setSel] = useState(0);
  const [testMode, setTestMode] = useState(false);
  const [lastPressed, setLastPressed] = useState([]);
  const selRef = useRef(sel);
  selRef.current = sel;

  // Poll pads every 2 s.
  useEffect(() => {
    const tick = () => {
      window.gjallar.pads().then((d) => {
        if (Array.isArray(d)) setPads(d);
      }).catch(() => {});
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  // Collect last-pressed buttons in test mode.
  const onBtn = (btn) => {
    if (!testMode || btn == null) return;
    setLastPressed((prev) => {
      const name = typeof btn === 'string' ? btn : String(btn);
      const next = prev.filter((b) => b !== name);
      return [...next.slice(-7), name]; // keep last 8 including this one
    });
  };

  bind((btn) => {
    if (btn === 'b') return onClose();
    if (btn === 'x') {
      setTestMode((t) => !t);
      if (!testMode) setLastPressed([]); // reset when entering test mode
      return;
    }
    if (testMode) {
      onBtn(btn);
      return;
    }
    if (pads.length === 0) return;
    if (btn === 'up') setSel((s) => Math.max(0, s - 1));
    if (btn === 'down') setSel((s) => Math.min(pads.length - 1, s + 1));
  });

  const pad = pads[sel];

  return (
    <motion.div
      className="couch-page inst-page"
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="couch-page-bg" style={{ background: 'linear-gradient(135deg,#0a0e1a 0%,#121830 100%)' }} />
      <div className="inst-card" style={{ maxWidth: 560 }}>
        <div className="eyebrow">Controllers</div>
        <h1 className="h-title">Controller Hub</h1>

        {pads.length === 0 && (
          <>
            <div className="muted" style={{ textAlign: 'center', padding: '32px 0' }}>
              No controller connected
            </div>
            <div className="inst-hint"><b className="btn-glyph b">B</b>Back</div>
          </>
        )}

        {pads.length > 0 && (
          <>
            {!testMode ? (
              pads.map((p, i) => {
                const label = BATTERY_LABEL[p.battery] || 'Unknown';
                const Icon = BATTERY_ICON[p.battery] || Battery;
                return (
                  <div
                    key={p.index}
                    className={`inst-lib ${i === sel ? 'on' : ''}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', marginBottom: 6 }}
                  >
                    <span style={{ fontSize: 20 }}>{p.type === 'xbox' ? '🎮' : p.type === 'playstation' ? '🕹️' : '🎛️'}</span>
                    <div className="grow">
                      <b>{TYPE_LABEL[p.type] || 'Controller'}</b>
                      {p.name && <small style={{ display: 'block', color: 'var(--muted, #9aa4b2)' }}>{p.name}</small>}
                    </div>
                    <Icon size={20} />
                    <span className="muted" style={{ minWidth: 56, textAlign: 'right' }}>{label}</span>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '12px 18px' }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Button Test — press buttons to see them light up</div>
                {pad && (
                  <div className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
                    Testing: <b>{TYPE_LABEL[pad.type] || 'Controller'}</b> {pad.name ? `(${pad.name})` : ''}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {lastPressed.length === 0 && (
                    <span className="muted" style={{ fontSize: 14 }}>No buttons pressed yet…</span>
                  )}
                  {lastPressed.map((b, i) => (
                    <span
                      key={i + b}
                      style={{
                        display: 'inline-block',
                        background: 'rgba(255,215,0,.15)',
                        border: '1px solid rgba(255,215,0,.4)',
                        borderRadius: 6,
                        padding: '3px 10px',
                        fontSize: 13,
                        color: 'var(--gold, #ffd700)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="inst-hint">
              {!testMode ? (
                <>
                  <b className="btn-glyph x">X</b>Button test{' '}
                  <b className="btn-glyph b" style={{ marginLeft: 16 }}>B</b>Back
                </>
              ) : (
                <>
                  <b className="btn-glyph x">X</b>Exit test{' '}
                  <b className="btn-glyph b" style={{ marginLeft: 16 }}>B</b>Back
                </>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
