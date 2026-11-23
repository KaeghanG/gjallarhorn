import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';
import { Img } from './ui.jsx';

// Shared, animated "game is starting" screen used by couch mode and the desktop app.
// Props: hero (urls), logo (url), title, phase 'starting' | 'playing', actions, footer (node).
export function LaunchScreen({ hero, logo, title, phase = 'starting', actions, footer }) {
  const embers = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ i, x: Math.random() * 100, d: 5 + Math.random() * 7, s: 2 + Math.random() * 4, dl: Math.random() * 6 })), []);
  return (
    <motion.div className="ls" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: 0.55 }}>
      {hero?.some?.(Boolean) && <Img srcs={hero} alt="" className="ls-hero" />}
      <div className="ls-aurora" />
      <div className="ls-shade" />
      <div className="ls-vignette" />
      <div className="ls-embers">{embers.map((e) => <i key={e.i} style={{ left: `${e.x}%`, width: e.s, height: e.s, animationDuration: `${e.d}s`, animationDelay: `-${e.dl}s` }} />)}</div>
      <div className="ls-body">
        <motion.div className="ls-card" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.1 }}>
          {logo ? <Img srcs={[logo]} alt="" className="ls-logo" fallback={<h1 className="ls-title">{title}</h1>} /> : <h1 className="ls-title">{title}</h1>}
          <div className="ls-status">
            {phase === 'starting'
              ? <><span className="ls-ring"><i /><i /><i /></span><span>Launching<b className="ls-dots"><u>.</u><u>.</u><u>.</u></b></span></>
              : <><span className="ls-live"><Play size={16} fill="currentColor" /></span><span>Now playing</span></>}
          </div>
          <div className="ls-bar"><i className={phase === 'playing' ? 'done' : ''} /></div>
          {phase === 'playing' && <div className="ls-sub">Gjallarhorn returns when you quit. Hold Back + Start (Share + Options on PlayStation) for the in-game menu.</div>}
          {actions?.length > 0 && <div className="ls-chips">{actions.map((a) => <span key={a}>{a}</span>)}</div>}
          {footer}
        </motion.div>
      </div>
    </motion.div>
  );
}

// Desktop overlay: listens for session events (waiting -> running -> ended) from the main process.
export function DesktopLaunch({ library }) {
  const [s, setS] = useState(null);
  useEffect(() => window.gjallar.onSession((ev) => {
    if (ev.state === 'waiting') {
      const g = (library?.games || []).find((x) => x.key === ev.key);
      const appid = g?.appid || (/^steam-(\d+)$/.exec(ev.key || '') || [])[1];
      const base = appid ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}` : null;
      setS({ key: ev.key, title: ev.name || g?.name || 'Game', hero: [g?.hero, base && `${base}/library_hero.jpg`, g?.header, base && `${base}/header.jpg`], logo: base && `${base}/logo.png`, phase: 'starting' });
    } else if (ev.state === 'running') setS((c) => (c ? { ...c, phase: 'playing', actions: ev.actions } : c));
    else if (ev.state === 'ended' || ev.state === 'gave-up') setS(null);
  }), [library]);
  useEffect(() => {
    if (s?.phase !== 'playing') return undefined;
    const t = setTimeout(() => setS(null), 6000);
    return () => clearTimeout(t);
  }, [s?.phase]);
  return (
    <AnimatePresence>
      {s && <div className="ls-desk" onClick={() => setS(null)}><LaunchScreen {...s} footer={<div className="ls-sub" style={{ opacity: 0.5 }}>Click anywhere to dismiss</div>} /></div>}
    </AnimatePresence>
  );
}
