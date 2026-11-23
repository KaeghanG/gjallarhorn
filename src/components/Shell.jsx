import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { House, Store, Library, Gift, Gamepad2, Settings, Search, Minus, Square, Copy, X, Heart, Joystick, Tv, HardDrive, Gamepad, Users, Wrench, Activity, Download, Camera } from 'lucide-react';

// ---------- Animated night sky: stars + shooting stars on canvas, aurora in CSS ----------
export function Sky({ reduceMotion }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    let w, h, stars, raf, shooting = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = c.width = innerWidth * dpr;
      h = c.height = innerHeight * dpr;
      stars = Array.from({ length: Math.floor((innerWidth * innerHeight) / 5200) }, () => ({
        x: Math.random() * w, y: Math.random() * h * 0.85, r: (Math.random() * 1.2 + 0.2) * dpr,
        a: Math.random(), s: Math.random() * 0.015 + 0.003, hue: Math.random() < 0.15 ? 45 : Math.random() < 0.3 ? 200 : 230,
      }));
    };
    resize();
    addEventListener('resize', resize);
    let tm;
    const draw = () => {
      // Do not burn GPU on a background animation while a game (or anything else) has the focus.
      if (!document.hasFocus()) { tm = setTimeout(() => { raf = requestAnimationFrame(draw); }, 400); return; }
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.a += s.s;
        const tw = 0.35 + Math.abs(Math.sin(s.a)) * 0.65;
        ctx.beginPath();
        ctx.fillStyle = `hsla(${s.hue}, 80%, 88%, ${tw})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduceMotion && Math.random() < 0.004) {
        shooting.push({ x: Math.random() * w * 0.8 + w * 0.2, y: Math.random() * h * 0.3, vx: -(6 + Math.random() * 6) * dpr, vy: (2 + Math.random() * 2) * dpr, life: 1 });
      }
      shooting = shooting.filter((m) => m.life > 0);
      for (const m of shooting) {
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 14, m.y - m.vy * 14);
        g.addColorStop(0, `rgba(255,236,180,${m.life})`);
        g.addColorStop(1, 'rgba(255,236,180,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 14, m.y - m.vy * 14);
        ctx.stroke();
        m.x += m.vx; m.y += m.vy; m.life -= 0.012;
      }
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); clearTimeout(tm); removeEventListener('resize', resize); };
  }, [reduceMotion]);
  return (
    <>
      <div className="sky">
        <canvas ref={ref} />
        <div className="aurora-sky">
          <span className="a1" /><span className="a2" /><span className="a3" /><span className="a4" /><span className="ribbon" />
        </div>
      </div>
      <div className="vignette" />
      <div className="grain" />
    </>
  );
}

// Gjallarhorn logo: a gold horn with a sound wave.
export function HornLogo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe9b0" /><stop offset=".5" stopColor="#f0c869" /><stop offset="1" stopColor="#9c6d1f" />
        </linearGradient>
      </defs>
      {/* war horn: tapered curved body, wide flared bell, metal bands, sound arcs */}
      <path d="M6 52C9 36 26 18 41 11C45 8 49 5 53 4C60 10 61 22 56 31C48 33 38 33 30 40C22 46 14 54 10 57C8 58 5 56 6 52Z" fill="url(#hg)" />
      <path d="M53 4C60 10 61 22 56 31C52 22 52 12 53 4Z" fill="#1a1206" opacity=".75" />
      <path d="M53 4C60 10 61 22 56 31" stroke="#fff1c4" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 32L28 41M42 11L40 33" stroke="#8f611a" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M58 1c3 1 5 3 6 6M62 12c1 3 1 6 0 9" stroke="#3cf2b0" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TitleBar({ onSearch }) {
  const [max, setMax] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => { window.gjallar?.win.onState(setMax); }, []);
  return (
    <div className="titlebar">
      <div className="brand">
        <motion.div initial={{ rotate: -30, scale: 0.6, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.2 }}>
          <HornLogo />
        </motion.div>
        <span className="brand-name">GJALLARHORN</span>
      </div>
      <form className="quick" onSubmit={(e) => { e.preventDefault(); if (q.trim()) onSearch(q.trim()); }}>
        <Search size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search every store for a game…" />
      </form>
      <div className="spacer" />
      <div className="winbtns">
        <button onClick={() => window.gjallar.win.min()} title="Minimize"><Minus size={15} /></button>
        <button onClick={() => window.gjallar.win.max()} title="Maximize">{max ? <Copy size={13} /> : <Square size={13} />}</button>
        <button className="close" onClick={() => window.gjallar.win.close()} title="Close"><X size={16} /></button>
      </div>
    </div>
  );
}

export const NAV = [
  { id: 'home', label: 'Home', icon: House, rune: 'ᚺ' },
  { id: 'store', label: 'Store & Deals', icon: Store, rune: 'ᚠ' },
  { id: 'library', label: 'Library', icon: Library, rune: 'ᛚ' },
  { id: 'storage', label: 'Storage', icon: HardDrive, rune: 'ᛊ' },
  { id: 'bundles', label: 'Bundles', icon: Gift, rune: 'ᚷ' },
  { id: 'emulators', label: 'Emulators', icon: Gamepad2, rune: 'ᛖ' },
  { id: 'retro', label: 'Retro', icon: Joystick, rune: 'ᛗ' },
  { id: 'controllers', label: 'Controllers', icon: Gamepad, rune: 'ᛃ' },
  { id: 'workshop', label: 'Workshop', icon: Wrench, rune: 'ᚦ' },
  { id: 'reports', label: 'Play reports', icon: Activity, rune: 'ᛏ' },
  { id: 'downloads', label: 'Downloads', icon: Download, rune: 'ᛞ' },
  { id: 'screenshots', label: 'Shots & clips', icon: Camera, rune: 'ᛊ' },
  { id: 'friends', label: 'Friends', icon: Users, rune: 'ᛈ' },
  { id: 'wishlist', label: 'Wishlist', icon: Heart, rune: 'ᚹ' },
  { id: 'settings', label: 'Settings', icon: Settings, rune: 'ᛋ' },
  { id: 'couch', label: 'Couch mode', icon: Tv, rune: 'ᛉ' },
];

const GROUPS = [
  ['Play', ['home', 'library', 'store', 'wishlist']],
  ['Captures', ['screenshots', 'reports']],
  ['Social', ['friends', 'workshop']],
  ['Manage', ['downloads', 'storage', 'bundles', 'emulators', 'retro', 'controllers']],
];
export function Sidebar({ page, setPage, counts = {} }) {
  const byId = Object.fromEntries(NAV.map((n) => [n.id, n]));
  let n = 0;
  const item = (id) => {
    const it = byId[id];
    if (!it) return null;
    const I = it.icon;
    const active = page === it.id;
    const idx = n++;
    return (
      <motion.button key={it.id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setPage(it.id)}
        initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + idx * 0.02, type: 'spring', stiffness: 260, damping: 24 }}
        whileTap={{ scale: 0.97 }}>
        {active && <motion.div layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
        <I size={18} />
        <span>{it.label}</span>
        {counts[it.id] ? <span className="nav-badge">{counts[it.id]}</span> : null}
        <span className="rune">{it.rune}</span>
      </motion.button>
    );
  };
  return (
    <nav className="sidebar">
      {GROUPS.map(([label, ids]) => (<React.Fragment key={label}><div className="nav-label">{label}</div>{ids.map(item)}</React.Fragment>))}
      <div className="nav-label">System</div>
      {['settings', 'couch'].map(item)}
      <div className="sidebar-foot">
        <div className="runes">ᚷᛃᚨᛚᛚᚨᚱᚺᛟᚱᚾ</div>
        <small>Heimdall's horn: one call, every realm of your games.</small>
      </div>
    </nav>
  );
}
