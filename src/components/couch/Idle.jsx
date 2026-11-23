import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Img } from '../ui.jsx';

// Ambient screensaver for couch mode: a slow slideshow of the player's game art with a big clock. Any input wakes it.
export default function Idle({ images }) {
  const [i, setI] = useState(0);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const a = setInterval(() => setI((x) => x + 1), 9000);
    const b = setInterval(() => setNow(new Date()), 15000);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);
  const src = images.length ? images[i % images.length] : null;
  return (
    <motion.div className="couch-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
      <AnimatePresence mode="sync">
        <motion.div key={src || 'none'} className="couch-idle-slide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2 }}>
          {src && <Img srcs={src} alt="" className="ken" />}
        </motion.div>
      </AnimatePresence>
      <div className="couch-idle-shade" />
      <div className="couch-idle-clock">
        <div className="h-display">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
        <div className="muted">{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · press any button</div>
      </div>
    </motion.div>
  );
}
