import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import { Img } from './ui.jsx';
import { HornLogo } from './Shell.jsx';
import { steamImg } from '../api.js';
import { EMULATORS } from '../data/emulators.js';

// Small always-on-top window opened by the global hotkey: type, arrow, Enter.
export default function QuickLauncher() {
  const [games, setGames] = useState([]);
  const [roms, setRoms] = useState([]);
  const [emu, setEmu] = useState({});
  const [pt, setPt] = useState({});
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const input = useRef(null);

  const load = () => {
    window.gjallar.scanLibrary().then(setGames).catch(() => {});
    window.gjallar.playtime().then(setPt).catch(() => {});
    window.gjallar.romScan().then(setRoms).catch(() => {});
    window.gjallar.emuStatus(EMULATORS.map((e) => ({ id: e.id, paths: e.paths }))).then(setEmu).catch(() => {});
  };
  useEffect(() => {
    load();
    window.gjallar.onQuickShown(() => { setQ(''); setSel(0); load(); setTimeout(() => input.current?.focus(), 30); });
    input.current?.focus();
  }, []);

  const results = useMemo(() => {
    const last = (g) => Math.max(g.lastPlayed || 0, pt[g.key]?.last || 0);
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const match = (t) => words.every((w) => t.toLowerCase().includes(w));
    const gs = games.filter((g) => match(g.name)).sort((a, b) => last(b) - last(a)).map((g) => ({ kind: 'game', key: g.key, title: g.name, sub: g.source, img: [g.cover, g.appid && steamImg.cover(g.appid)], g }));
    if (!words.length) return gs.slice(0, 8);
    const rs = roms.filter((r) => match(r.title)).map((r) => ({ kind: 'rom', key: r.id, title: r.title, sub: r.systemName, img: [], r }));
    return [...gs, ...rs].slice(0, 8);
  }, [q, games, roms, pt]);

  const launch = async (it) => {
    if (!it) return;
    try {
      if (it.kind === 'game') await window.gjallar.launchGame(it.g);
      else await window.gjallar.romLaunch(it.r, emu[it.r.emu]?.exe);
      window.gjallar.quickHide();
    } catch (e) {
      alert(e.message);
    }
  };
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === 'Enter') launch(results[sel]);
    if (e.key === 'Escape') window.gjallar.quickHide();
  };

  return (
    <div onKeyDown={key} style={{ height: '100vh', background: 'var(--glass-solid)', border: '1px solid var(--line-hi)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--line)', WebkitAppRegion: 'drag' }}>
        <HornLogo size={24} />
        <Search size={18} color="var(--gold)" />
        <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="Launch a game…"
          style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: 'var(--ink)', fontSize: 20, fontFamily: 'var(--font)', WebkitAppRegion: 'no-drag' }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {!q && <div className="eyebrow" style={{ padding: '6px 10px' }}>Recent</div>}
        {results.map((it, i) => (
          <div key={it.key} onMouseEnter={() => setSel(i)} onClick={() => launch(it)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, cursor: 'pointer',
              background: i === sel ? 'linear-gradient(90deg, rgba(240,200,105,.18), rgba(92,124,255,.06))' : 'transparent', boxShadow: i === sel ? 'inset 0 0 0 1px rgba(240,200,105,.3)' : 'none' }}>
            <div style={{ width: 30, height: 40, borderRadius: 6, overflow: 'hidden', background: '#0b1024', flexShrink: 0 }}>
              <Img srcs={it.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback={<div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #2a3a7a, #0b1024)' }} />} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</div>
              <div className="muted" style={{ fontSize: 11.5, textTransform: 'capitalize' }}>{it.sub}</div>
            </div>
            {i === sel && <CornerDownLeft size={16} color="var(--gold)" />}
          </div>
        ))}
        {!results.length && <div className="muted" style={{ padding: 20, textAlign: 'center' }}>No matches</div>}
      </div>
    </div>
  );
}
