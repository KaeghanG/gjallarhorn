import React, { useEffect, useState } from 'react';
import { Switch, useToast } from './ui.jsx';
import { GAME_TIPS, EVIDENCE } from '../data/gameTips.js';

// Per-game performance panel: only things Windows supports and that are safe to undo. Nothing is hardcoded to a specific PC.
export default function PerfPanel({ game }) {
  const toast = useToast();
  const [cpu, setCpu] = useState(null);
  const [st, setSt] = useState(null);
  useEffect(() => {
    let dead = false;
    window.gjallar.perfInfo().then((r) => !dead && setCpu(r.cpu)).catch(() => {});
    window.gjallar.perfGet(game).then((r) => !dead && setSt(r)).catch(() => !dead && setSt({ performanceCores: false, fso: false, hasExe: false }));
    return () => { dead = true; };
  }, [game.key]);
  if (!st) return null;
  const set = async (patch) => {
    try { await window.gjallar.perfSet(game, patch); setSt((s) => ({ ...s, ...patch })); }
    catch (e) { toast({ kind: 'bad', title: 'Could not apply', body: e.message }); }
  };
  const tips = GAME_TIPS[game.appid] || [];
  const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '12px 0', borderTop: '1px solid var(--line)' };
  const sub = { color: 'var(--muted)', fontSize: 12.5, marginTop: 2 };
  const first = { ...row, borderTop: 0 };
  return (
    <div className="panel">
      <p className="muted" style={{ fontSize: 12.5, margin: '0 0 4px' }}>
        Honest note: most online "FPS boost" launch options do nothing. These are the few that Windows really supports. Test one at a time and keep what helps. GPU choice, High priority and the power-throttling opt-out are already applied to every game (Settings, Game Boost).
      </p>
      {cpu?.hybrid ? (
        <div style={first}>
          <div><b>Prefer performance cores</b><div style={sub}>Your CPU has {cpu.performance} performance and {cpu.efficiency} efficiency threads. Some games (Elden Ring, WoW) stutter when Windows puts them on efficiency cores. This is a soft preference, not hard pinning. Evidence: mixed.</div></div>
          <Switch on={!!st.performanceCores} onChange={(v) => set({ performanceCores: v })} />
        </div>
      ) : null}
      <div style={cpu?.hybrid ? row : first}>
        <div><b>Disable fullscreen optimizations</b><div style={sub}>Per-game Windows compatibility flag. Can help exclusive-fullscreen games; skip it if you use overlays or Auto HDR. Evidence: mixed.{!st.hasExe ? ' (Game executable not found yet: launch the game once.)' : ''}</div></div>
        <Switch on={!!st.fso} onChange={(v) => set({ fso: v })} disabled={!st.hasExe} />
      </div>
      {tips.length > 0 && (
        <div style={{ ...row, display: 'block' }}>
          <b>Notes for this game</b>
          {tips.map((t, i) => <div key={i} style={sub}>• {t.text} <i>({EVIDENCE[t.evidence]})</i></div>)}
        </div>
      )}
    </div>
  );
}
