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
  { id: 'aurora', label: 'Aurora', blurb: 'Northern lights ripple, then the name glows in' },
  { id: 'embers', label: 'Embers', blurb: 'Fire sparks rise and the title ignites' },
  { id: 'warp', label: 'Warp', blurb: 'Hyperspace streaks resolve into the horn' },
  { id: 'glitch', label: 'Glitch', blurb: 'Neon signal lock with scanlines' },
  { id: 'horn', label: 'Horn call', blurb: 'Shockwave rings spread from the horn, like a call across the realms' },
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

// ---------- 6-10. Aurora, Embers, Warp, Glitch, Horn call (CSS driven) ----------
function Aurora() {
  return (
    <div className="sp sp-aur">
      <i className="sp-ribbon r1" /><i className="sp-ribbon r2" /><i className="sp-ribbon r3" />
      <div className="sp-center">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 1 }}><HornLogo size={78} /></motion.div>
        <motion.h1 className="sp-title sp-aurtitle" initial={{ opacity: 0, filter: 'blur(14px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ delay: 1.3, duration: 1.6 }}>{NAME}</motion.h1>
      </div>
    </div>
  );
}
function Embers() {
  const sparks = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ i, x: Math.random() * 100, s: 2 + Math.random() * 5, d: Math.random() * 3.2, t: 2.4 + Math.random() * 2.4, dx: (Math.random() - 0.5) * 120 })), []);
  return (
    <div className="sp sp-emb">
      {sparks.map((p) => <i key={p.i} className="sp-spark" style={{ left: `${p.x}%`, width: p.s, height: p.s, animationDelay: `${p.d}s`, animationDuration: `${p.t}s`, '--dx': `${p.dx}px` }} />)}
      <div className="sp-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6, duration: 0.9 }}><HornLogo size={84} /></motion.div>
        <motion.h1 className="sp-title sp-molten" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 1.2 }}>{NAME}</motion.h1>
      </div>
    </div>
  );
}
function Warp() {
  const lines = useMemo(() => Array.from({ length: 110 }, (_, i) => ({ i, a: Math.random() * 360, d: Math.random() * 1.6, l: 18 + Math.random() * 40 })), []);
  return (
    <div className="sp sp-warp">
      <div className="sp-warpfield">{lines.map((l) => <i key={l.i} style={{ '--a': `${l.a}deg`, animationDelay: `${l.d}s`, '--len': `${l.l}vmax` }} />)}</div>
      <div className="sp-center">
        <motion.div initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.6, duration: 0.9, ease: 'easeOut' }}><HornLogo size={90} /></motion.div>
        <motion.h1 className="sp-title sp-cyan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2, duration: 0.8 }}>{NAME}</motion.h1>
      </div>
    </div>
  );
}
function Glitch() {
  return (
    <div className="sp sp-glit">
      <div className="sp-scan" />
      <div className="sp-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.2, 1] }} transition={{ delay: 0.4, duration: 0.7 }}><HornLogo size={76} /></motion.div>
        <h1 className="sp-title sp-glitchtitle" data-t={NAME}>{NAME}</h1>
        <motion.p className="sp-sub" initial={{ opacity: 0 }} animate={{ opacity: 0.85 }} transition={{ delay: 2 }}>signal locked</motion.p>
      </div>
    </div>
  );
}
function HornCall() {
  return (
    <div className="sp sp-hc">
      {[0, 1, 2, 3, 4].map((i) => <i key={i} className="sp-wave" style={{ animationDelay: `${0.5 + i * 0.35}s` }} />)}
      <div className="sp-center">
        <motion.div initial={{ scale: 0.4, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 140, damping: 11 }}><HornLogo size={100} /></motion.div>
        <motion.h1 className="sp-title" initial={{ opacity: 0, letterSpacing: '1em' }} animate={{ opacity: 1, letterSpacing: '0.3em' }} transition={{ delay: 1.4, duration: 1.3, ease: 'easeOut' }}>{NAME}</motion.h1>
        <motion.p className="sp-sub" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} transition={{ delay: 2.6 }}>One call, every realm</motion.p>
      </div>
    </div>
  );
}

const VIEWS = { bifrost: Bifrost, forge: Forge, runes: Runes, terminal: Terminal, minimal: Minimal, aurora: Aurora, embers: Embers, warp: Warp, glitch: Glitch, horn: HornCall };
const DURATION = { bifrost: 4600, forge: 4200, runes: 4600, terminal: 4400, minimal: 3200, aurora: 4600, embers: 4400, warp: 4200, glitch: 3800, horn: 4400 };

// When a splash last started playing: the couch-mode intro is skipped if the app-start one just played (one launch screen, not two).
export const splashState = { last: 0 };
export default function Splash({ style = 'bifrost', onDone }) {
  useEffect(() => { splashState.last = Date.now(); }, []);
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
