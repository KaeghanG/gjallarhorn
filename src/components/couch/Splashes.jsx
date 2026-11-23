import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HornLogo } from '../Shell.jsx';

// Selectable couch-mode intros. <Splash style="bifrost" /> plays once and removes itself; any key/click skips it.
export const SPLASH_STYLES = [
  { id: 'bifrost', label: 'Bifröst', blurb: 'A rainbow bridge draws itself across the stars' },
  { id: 'forge', label: 'Forge', blurb: 'A hammer strike showers sparks and reveals the name' },
  { id: 'runes', label: 'Runes', blurb: 'Falling runes resolve into the title' },
  { id: 'terminal', label: 'Boot terminal', blurb: 'Retro BIOS boot sequence' },
  { id: 'minimal', label: 'Minimal', blurb: 'Clean horn, thin line, soft fade' },
  { id: 'cinematic', label: 'Cinematic (classic)', blurb: 'The original letterbox intro' },
  { id: 'none', label: 'None', blurb: 'Go straight in' },
];
const NAME = 'GJALLARHORN';

// ---------- 1. Bifröst ----------
const BANDS = ['#ff4d6d', '#ff9248', '#ffd84a', '#5bea8a', '#4dc3ff', '#7a7bff', '#c06bff'];
function Bifrost() {
  const stars = useMemo(() => Array.from({ length: 90 }, (_, i) => ({ i, x: Math.random() * 100, y: Math.random() * 100, s: 1 + Math.random() * 2, d: Math.random() * 3 })), []);
  return (
    <div className="sp sp-bif">
      <div className="sp-stars">{stars.map((s) => <i key={s.i} style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />)}</div>
      <svg className="sp-bridge" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid slice">
        <defs><filter id="spglow"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {BANDS.map((c, i) => (
          <path key={c} d={`M-40 ${420 - i * 4} Q500 ${-90 - i * 6} 1040 ${420 - i * 4}`} pathLength="1" stroke={c} strokeWidth="9" fill="none" strokeLinecap="round" filter="url(#spglow)" style={{ animationDelay: `${i * 0.09}s` }} />
        ))}
      </svg>
      <div className="sp-center">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.5, type: 'spring', stiffness: 120, damping: 12 }}><HornLogo size={86} /></motion.div>
        <motion.h1 className="sp-title" initial={{ opacity: 0, letterSpacing: '1.2em' }} animate={{ opacity: 1, letterSpacing: '0.32em' }} transition={{ delay: 1.9, duration: 1.4, ease: 'easeOut' }}>{NAME}</motion.h1>
        <motion.p className="sp-sub" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 2.9 }}>The bridge is open</motion.p>
      </div>
    </div>
  );
}

// ---------- 2. Forge ----------
function Forge() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; const g = c.getContext('2d');
    let w = (c.width = innerWidth), h = (c.height = innerHeight), raf, t0 = performance.now(), parts = [], struck = false;
    const strike = () => { struck = true; for (let i = 0; i < 260; i++) { const a = Math.random() * 6.283, v = 2 + Math.random() * 11; parts.push({ x: w / 2, y: h / 2 + 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, life: 1, d: 0.006 + Math.random() * 0.012, r: 1 + Math.random() * 2.6 }); } };
    const tick = (now) => {
      const t = (now - t0) / 1000;
      g.fillStyle = 'rgba(8,3,2,0.3)'; g.fillRect(0, 0, w, h);
      if (!struck && t > 0.9) strike();
      g.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.vx *= 0.99; p.life -= p.d;
        if (p.life <= 0) continue;
        g.fillStyle = `rgba(255,${Math.round(120 + 110 * p.life)},${Math.round(30 * p.life)},${p.life})`;
        g.shadowColor = '#ff8a2a'; g.shadowBlur = 10;
        g.beginPath(); g.arc(p.x, p.y, p.r * p.life + 0.4, 0, 6.283); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      parts = parts.filter((p) => p.life > 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="sp sp-forge">
      <canvas ref={ref} className="sp-canvas" />
      <motion.div className="sp-flash" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 0.9, 0] }} transition={{ duration: 1.6, times: [0, 0.55, 0.6, 1] }} />
      <div className="sp-center">
        <motion.h1 className="sp-title sp-molten" initial={{ opacity: 0, scale: 1.4, filter: 'blur(14px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ delay: 1, duration: 1.2, ease: 'easeOut' }}>{NAME}</motion.h1>
        <motion.p className="sp-sub" initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 2.4 }}>Forged for the couch</motion.p>
      </div>
    </div>
  );
}

// ---------- 3. Runes ----------
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
function Scramble({ text, delay = 1.2 }) {
  const [out, setOut] = useState(() => text.replace(/./g, ' '));
  useEffect(() => {
    let raf; const t0 = performance.now() + delay * 1000;
    const tick = (now) => {
      const p = Math.max(0, (now - t0) / 1600);
      setOut(text.split('').map((ch, i) => (p * (text.length + 4) > i + 2 ? ch : p > 0 ? RUNES[Math.floor(Math.random() * RUNES.length)] : ' ')).join(''));
      if (p < 1.2) raf = requestAnimationFrame(tick); else setOut(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay]);
  return <>{out}</>;
}
function Runes() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; const g = c.getContext('2d');
    let w = (c.width = innerWidth), h = (c.height = innerHeight), raf; const colW = 28; const drops = Array.from({ length: Math.ceil(w / colW) }, () => Math.random() * -40);
    const tick = () => {
      g.fillStyle = 'rgba(3,6,14,0.14)'; g.fillRect(0, 0, w, h); g.font = '22px "Segoe UI Historic","Noto Sans Runic",serif';
      drops.forEach((y, i) => { g.fillStyle = Math.random() < 0.04 ? '#fff' : 'rgba(110,220,255,.75)'; g.fillText(RUNES[Math.floor(Math.random() * RUNES.length)], i * colW, y * 26); drops[i] = y * 26 > h && Math.random() > 0.97 ? 0 : y + 0.55; });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="sp sp-runes">
      <canvas ref={ref} className="sp-canvas" />
      <div className="sp-vig" />
      <div className="sp-center"><h1 className="sp-title sp-cyan"><Scramble text={NAME} /></h1><motion.p className="sp-sub" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 3 }}>ᚷᛃᚨᛚᛚᚨᚱᚺᛟᚱᚾ</motion.p></div>
    </div>
  );
}

// ---------- 4. Boot terminal ----------
const BOOT = ['GJALLARHORN BIOS v1.0', 'CPU ........ OK', 'GPU ........ OK', 'Controllers  detected', 'Mounting libraries: Steam · Epic · Emulators', 'Loading couch shell...', 'READY'];
function Terminal() {
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN((x) => Math.min(BOOT.length, x + 1)), 520); return () => clearInterval(t); }, []);
  return (
    <div className="sp sp-term">
      <div className="sp-scan" />
      <div className="sp-termbox">
        {BOOT.slice(0, n).map((l, i) => <div key={i} className={i === BOOT.length - 1 ? 'ok' : ''}>&gt; {l}</div>)}
        <div className="sp-cursor">█</div>
        <div className="sp-pbar"><i style={{ width: `${(n / BOOT.length) * 100}%` }} /></div>
      </div>
    </div>
  );
}

// ---------- 5. Minimal ----------
function Minimal() {
  return (
    <div className="sp sp-min">
      <div className="sp-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}><HornLogo size={72} /></motion.div>
        <motion.div className="sp-line" initial={{ width: 0 }} animate={{ width: 260 }} transition={{ delay: 0.5, duration: 1.1, ease: 'easeInOut' }} />
        <motion.h1 className="sp-title sp-thin" initial={{ opacity: 0, letterSpacing: '0.8em' }} animate={{ opacity: 1, letterSpacing: '0.45em' }} transition={{ delay: 1, duration: 1.4 }}>{NAME}</motion.h1>
      </div>
    </div>
  );
}

const VIEWS = { bifrost: Bifrost, forge: Forge, runes: Runes, terminal: Terminal, minimal: Minimal };
const DURATION = { bifrost: 4600, forge: 4200, runes: 4600, terminal: 4400, minimal: 3200 };

export default function Splash({ style = 'bifrost', onDone }) {
  const View = VIEWS[style];
  const [show, setShow] = useState(!!View);
  useEffect(() => {
    if (!View) { onDone?.(); return undefined; }
    const t = setTimeout(() => setShow(false), DURATION[style] || 4200);
    const skip = () => setShow(false);
    const k = setTimeout(() => { addEventListener('keydown', skip); addEventListener('pointerdown', skip); }, 700);
    return () => { clearTimeout(t); clearTimeout(k); removeEventListener('keydown', skip); removeEventListener('pointerdown', skip); };
  }, [style, View]); // eslint-disable-line
  if (!View) return null;
  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && <motion.div key="sp" className="sp-wrap" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.06 }} transition={{ duration: 0.6 }}><View /></motion.div>}
    </AnimatePresence>
  );
}
