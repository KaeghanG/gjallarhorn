import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HornLogo } from '../Shell.jsx';

// Cinematic couch-mode intro: letterbox bars, an anamorphic light streak, the horn "sounding" with a shockwave,
// the title slamming in from wide tracking with a shine sweep, and rising embers on a canvas. Plays once per couch open; any key/click skips it.
const NAME = 'GJALLARHORN'.split('');
const SHOW_MS = 4200;

function Embers() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return undefined;
    const g = c.getContext('2d');
    let w = (c.width = innerWidth), h = (c.height = innerHeight), raf;
    const COL = ['255,200,100', '60,242,176', '140,110,255'];
    const mk = (init) => ({ x: Math.random() * w, y: init ? Math.random() * h : h + 10, r: 0.6 + Math.random() * 2.2, v: 0.6 + Math.random() * 2, d: Math.random() * 6, c: COL[(Math.random() * 3) | 0], a: 0.3 + Math.random() * 0.7 });
    const ps = Array.from({ length: 130 }, () => mk(true));
    const tick = (t) => {
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        p.y -= p.v; p.x += Math.sin(t / 700 + p.d) * 0.6;
        if (p.y < -10) Object.assign(p, mk(false));
        const fade = Math.min(1, p.y / (h * 0.25));
        g.beginPath();
        g.fillStyle = `rgba(${p.c},${(p.a * fade).toFixed(2)})`;
        g.shadowColor = `rgba(${p.c},1)`;
        g.shadowBlur = 12;
        g.arc(p.x, p.y, p.r, 0, 6.2832);
        g.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const rs = () => { w = c.width = innerWidth; h = c.height = innerHeight; };
    addEventListener('resize', rs);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', rs); };
  }, []);
  return <canvas ref={ref} className="cs-embers" />;
}

export default function CouchSplash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), SHOW_MS);
    const skip = () => setShow(false);
    const k = setTimeout(() => { addEventListener('keydown', skip); addEventListener('pointerdown', skip); }, 700);
    return () => { clearTimeout(t); clearTimeout(k); removeEventListener('keydown', skip); removeEventListener('pointerdown', skip); };
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="cs" key="cs" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.12, filter: 'blur(6px)' }} transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}>
          <div className="cs-bg" />
          <div className="cs-grid" />
          <Embers />
          <div className="cs-bar top" /><div className="cs-bar bot" />
          <div className="cs-streak" />
          <div className="cs-flash" />
          <div className="cs-stage">
            <div className="cs-horn">
              {[0, 1, 2, 3].map((i) => <span key={i} className="cs-wave" style={{ animationDelay: `${1.05 + i * 0.28}s` }} />)}
              <motion.div initial={{ y: -180, scale: 0.4, opacity: 0, rotate: -25 }} animate={{ y: 0, scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 150, damping: 13, delay: 0.55 }}>
                <HornLogo size={150} />
              </motion.div>
            </div>
            <h1 className="cs-title" aria-label="Gjallarhorn">
              {NAME.map((ch, i) => (
                <motion.span key={i} initial={{ opacity: 0, y: 40, scale: 1.6, filter: 'blur(14px)' }} animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }} transition={{ delay: 1.15 + i * 0.07, duration: 0.55, ease: [0.2, 0.9, 0.2, 1] }}>{ch}</motion.span>
              ))}
            </h1>
            <motion.div className="cs-sub" initial={{ opacity: 0, letterSpacing: '1em' }} animate={{ opacity: 1, letterSpacing: '0.5em' }} transition={{ delay: 2.1, duration: 0.9, ease: 'easeOut' }}>Couch Mode</motion.div>
            <div className="cs-line"><i /></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
