import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HornLogo } from './Shell.jsx';

// Start-up splash: aurora ribbons, a horn that "sounds" (expanding rings), the name spelling in, then a fade to the app.
const NAME = 'GJALLARHORN'.split('');
const SHOW_MS = 2900;

export default function Splash() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), SHOW_MS);
    return () => clearTimeout(t);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="splash" key="splash" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.7, ease: 'easeInOut' }} onClick={() => setShow(false)}>
          <div className="splash-aurora a1" /><div className="splash-aurora a2" /><div className="splash-aurora a3" />
          <div className="splash-stars" />
          <div className="splash-center">
            <div className="splash-horn">
              {[0, 1, 2].map((i) => <span key={i} className="splash-ring" style={{ animationDelay: `${0.9 + i * 0.35}s` }} />)}
              <motion.div initial={{ scale: 0.3, opacity: 0, rotate: -18 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}>
                <HornLogo size={132} />
              </motion.div>
            </div>
            <h1 className="splash-title" aria-label="Gjallarhorn">
              {NAME.map((ch, i) => (
                <motion.span key={i} initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.7 + i * 0.06, duration: 0.5 }}>{ch}</motion.span>
              ))}
            </h1>
            <motion.div className="splash-tag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7, duration: 0.6 }}>Every game. One horn.</motion.div>
            <div className="splash-bar"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: SHOW_MS / 1000 - 0.3, ease: 'easeInOut' }} /></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
