import React, { useEffect, useRef, useState } from 'react';

// Per-game controller layout for Gjallarhorn's own in-game menu: turn the Back+Start menu off for a game that uses
// those buttons itself, swap A/B (Nintendo style) and tune stick sensitivity. Saves automatically.
export default function LayoutEditor({ gameKey }) {
  const [v, setV] = useState(null);
  const [err, setErr] = useState('');
  const t = useRef(0);
  useEffect(() => { let dead = false; window.gjallar.layoutGet(gameKey).then((l) => !dead && setV(l)).catch((e) => setErr(e.message)); return () => { dead = true; clearTimeout(t.current); }; }, [gameKey]);
  if (!v) return <div className="muted">{err || 'Loading...'}</div>;
  const set = (patch) => {
    const n = { ...v, ...patch };
    setV(n);
    clearTimeout(t.current);
    t.current = setTimeout(() => window.gjallar.layoutSet(gameKey, n).then(() => setErr('')).catch((e) => setErr(e.message)), 350);
  };
  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderTop: '1px solid var(--line)' };
  return (
    <div>
      <p className="muted" style={{ fontSize: 12.5, margin: '0 0 6px' }}>These apply to Gjallarhorn's Back + Start menu while this game runs. The game itself keeps full control of the controller.</p>
      <div style={{ ...row, borderTop: 0 }}>
        <div><b>Back + Start opens the menu</b><div className="muted" style={{ fontSize: 12 }}>Turn off for a game that uses both buttons itself.</div></div>
        <input type="checkbox" checked={v.menu} onChange={(e) => set({ menu: e.target.checked })} />
      </div>
      <div style={row}>
        <div><b>Swap A and B in the menu</b><div className="muted" style={{ fontSize: 12 }}>Nintendo-style confirm / back.</div></div>
        <input type="checkbox" checked={v.swapAB} onChange={(e) => set({ swapAB: e.target.checked })} />
      </div>
      <div style={row}>
        <div><b>Stick sensitivity</b><div className="muted" style={{ fontSize: 12 }}>Left = moves with a light push, right = needs a firm push.</div></div>
        <input type="range" min="0.2" max="0.8" step="0.05" value={v.deadzone} onChange={(e) => set({ deadzone: Number(e.target.value) })} style={{ width: 160 }} />
      </div>
      {err && <div className="err">{err}</div>}
    </div>
  );
}
