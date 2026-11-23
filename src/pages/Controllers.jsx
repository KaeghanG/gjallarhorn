import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BatteryFull, BatteryMedium, BatteryLow, BatteryWarning, Plug, Gamepad2 } from 'lucide-react';
import { PageHead, SectionHead, Empty } from '../components/ui.jsx';

const LABELS = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', '↑', '↓', '←', '→', 'Guide'];
const LEVEL = { full: [BatteryFull, 'var(--ok)', 'Full'], medium: [BatteryMedium, 'var(--gold)', 'Medium'], low: [BatteryLow, 'var(--warn)', 'Low'], empty: [BatteryWarning, 'var(--bad)', 'Empty'] };

function Stick({ x, y, label }) {
  const drift = Math.hypot(x, y) > 0.12;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 120, height: 120, borderRadius: '50%', border: '2px solid var(--line-hi)', position: 'relative', background: 'radial-gradient(circle, rgba(255,255,255,.04), transparent 70%)' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1, height: '100%', background: 'var(--line)', transform: 'translate(-50%,-50%)' }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', height: 1, width: '100%', background: 'var(--line)', transform: 'translate(-50%,-50%)' }} />
        <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: drift ? 'var(--warn)' : 'var(--gold)', boxShadow: '0 0 14px var(--gold)',
          left: `calc(50% + ${x * 50}px - 9px)`, top: `calc(50% + ${y * 50}px - 9px)` }} />
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{label} · {x.toFixed(2)}, {y.toFixed(2)}</div>
    </div>
  );
}

// Names for the button bits the background watcher reports (Xbox layout; PlayStation pads are mapped onto it).
const NATIVE_NAMES = [[0x1000, 'A / ✕'], [0x2000, 'B / ○'], [0x4000, 'X / □'], [0x8000, 'Y / △'], [0x100, 'LB / L1'], [0x200, 'RB / R1'], [0x20, 'View / Create'], [0x10, 'Menu / Options'],
  [0x40, 'L-stick click'], [0x80, 'R-stick click'], [0x1, 'D-pad ↑'], [0x2, 'D-pad ↓'], [0x4, 'D-pad ←'], [0x8, 'D-pad →']];

export default function Controllers() {
  const [pads, setPads] = useState([]);
  const [bats, setBats] = useState([]);
  const [bg, setBg] = useState({ connected: false, buttons: 0, lx: 0, ly: 0 });
  const raf = useRef();

  useEffect(() => {
    const t = setInterval(() => window.gjallar.padPeek().then(setBg).catch(() => {}), 80);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const loadBats = () => window.gjallar.controllers().then(setBats).catch(() => {});
    loadBats();
    const t = setInterval(loadBats, 10000);
    const tick = () => {
      const list = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
      setPads(list.map((p) => ({ id: p.id, index: p.index, mapping: p.mapping, buttons: p.buttons.map((b) => ({ pressed: b.pressed, value: b.value })), axes: [...p.axes] })));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { clearInterval(t); cancelAnimationFrame(raf.current); };
  }, []);

  const connected = bats.filter((b) => b.connected);
  return (
    <>
      <PageHead eyebrow="Controller hub" title="Controllers" sub="Battery levels for Xbox-style controllers, plus a live tester to check buttons, triggers and stick drift." />

      <SectionHead rune="ᛃ" title="Battery" />
      {!connected.length ? (
        <p className="muted" style={{ marginTop: -6 }}>No Xbox / XInput controller connected. (PlayStation and Switch controllers don't report battery to Windows this way, but they still show up in the tester below.)</p>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {connected.map((b) => {
            const [I, color, label] = b.type === 'wired' ? [Plug, 'var(--aur-teal)', 'Wired'] : LEVEL[b.level] || [BatteryMedium, 'var(--muted)', 'Unknown'];
            return (
              <motion.div key={b.slot} className="glass" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'center' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <I size={34} color={color} />
                <div><b>Controller {b.slot + 1}</b><div className="muted" style={{ fontSize: 12.5 }}>{label}{b.type !== 'wired' ? ` · ${b.type === 'nimh' ? 'rechargeable' : b.type}` : ''}</div></div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="section">
        <SectionHead rune="ᛉ" title="Background input (works when Gjallarhorn isn't focused)" />
        <div className="glass" style={{ padding: 18 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', minHeight: 34 }}>
            <span className={`tag ${bg.connected ? 'green' : 'warn'}`}>{bg.connected ? 'Controller detected' : 'No controller detected'}</span>
            {bg.connected && NATIVE_NAMES.filter(([bit]) => bg.buttons & bit).map(([, n]) => <span key={n} className="tag gold">{n}</span>)}
            {bg.connected && (Math.abs(bg.lx) > 1 || Math.abs(bg.ly) > 1) && <span className="tag blue">Stick {bg.lx}, {bg.ly}</span>}
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
            This is what Couch mode and the controller combo read, even when this window isn't in front: Xbox controllers, PlayStation (DualShock/DualSense) and generic game controllers. Press buttons: if a name lights up, it works. Anything wrong? Tell me which button showed the wrong name.
          </p>
        </div>
      </div>

      <div className="section">
        <SectionHead rune="ᛜ" title="Live tester" />
        {!pads.length ? (
          <Empty rune="ᛃ" title="Press any button on your controller">Windows only shows a controller to apps after you press a button.</Empty>
        ) : pads.map((p) => {
          const restDrift = !p.buttons.some((b) => b.pressed) && [[0, 1], [2, 3]].some(([a, c]) => Math.hypot(p.axes[a] || 0, p.axes[c] || 0) > 0.12);
          return (
            <div key={p.index} className="glass" style={{ padding: 22, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Gamepad2 size={20} color="var(--gold)" />
                <b style={{ flex: 1 }}>{p.id}</b>
                {p.mapping !== 'standard' && <span className="tag warn">non-standard mapping</span>}
                {restDrift && <span className="tag warn">Stick drift detected</span>}
              </div>
              <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
                <Stick x={p.axes[0] || 0} y={p.axes[1] || 0} label="Left stick" />
                <Stick x={p.axes[2] || 0} y={p.axes[3] || 0} label="Right stick" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 46px)', gap: 8, flex: 1 }}>
                  {p.buttons.slice(0, 17).map((b, i) => {
                    const analog = i === 6 || i === 7;
                    return (
                      <div key={i} title={LABELS[i]} style={{ height: 46, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, position: 'relative', overflow: 'hidden',
                        border: '1px solid var(--line-hi)', color: b.pressed ? '#1d1405' : 'var(--ink-2)', background: b.pressed ? 'linear-gradient(180deg, var(--gold-hi), var(--gold))' : 'rgba(255,255,255,.03)',
                        boxShadow: b.pressed ? '0 0 16px rgba(240,200,105,.6)' : 'none', transition: 'all .08s' }}>
                        {analog && <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: `${b.value * 100}%`, background: 'rgba(60,242,176,.35)' }} />}
                        <span style={{ position: 'relative' }}>{analog ? `${LABELS[i]} ${Math.round(b.value * 100)}` : LABELS[i] || i}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
