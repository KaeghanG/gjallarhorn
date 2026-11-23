import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Dices, Play, RotateCw, Clock, X } from 'lucide-react';
import { Img } from './ui.jsx';
import { steamDetails, steamImg } from '../api.js';

const genreCache = new Map(); // appid -> [genre names]
const MOODS = {
  Chill: /casual|simulation|indie|strategy|puzzle/i,
  Action: /action|shooter|fighting/i,
  Story: /rpg|adventure/i,
  Competitive: /massively multiplayer|sports|racing/i,
};
const COMP_NAMES = /deadlock|valorant|counter-strike|cs2|league|apex|overwatch|rocket league|dota|warframe/i;
const TIMES = [['quick', 'Quick (<1h)'], ['evening', 'An evening (1-3h)'], ['night', 'All night']];
const MODES = [['continue', 'Continue'], ['new', 'Something new'], ['any', 'Anything']];

export default function Roulette({ library, onClose }) {
  const [pt, setPt] = useState({});
  const [genres, setGenres] = useState({});
  const [time, setTime] = useState('evening');
  const [mood, setMood] = useState('Any');
  const [mode, setMode] = useState('any');
  const [spinning, setSpinning] = useState(false);
  const [face, setFace] = useState(null);
  const [pick, setPick] = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    window.gjallar.playtime().then(setPt).catch(() => {});
    const steam = library.games.filter((g) => g.appid).slice(0, 40);
    Promise.all(steam.map(async (g) => {
      if (!genreCache.has(g.appid)) {
        const d = await steamDetails(g.appid).catch(() => null);
        genreCache.set(g.appid, (d?.genres || []).map((x) => x.description));
      }
      return [g.appid, genreCache.get(g.appid)];
    })).then((rows) => setGenres(Object.fromEntries(rows)));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const pool = useMemo(() => library.games.filter((g) => {
    if (/wallpaper engine/i.test(g.name)) return false;
    const p = pt[g.key];
    if (mode === 'continue' && !(p || g.lastPlayed)) return false;
    if (mode === 'new' && (p || g.lastPlayed)) return false;
    if (mood !== 'Any') {
      const gs = (genres[g.appid] || []).join(' ');
      const ok = mood === 'Competitive' ? COMP_NAMES.test(g.name) || MOODS.Competitive.test(gs) : MOODS[mood].test(gs);
      if (!ok) return false;
    }
    if (p?.sessions) {
      const avg = p.total / p.sessions / 60000;
      if (time === 'quick' && avg > 75) return false;
      if (time === 'night' && avg < 30) return false;
    }
    return true;
  }), [library.games, pt, genres, time, mood, mode]);

  const spin = () => {
    if (!pool.length) return;
    timers.current.forEach(clearTimeout);
    setPick(null);
    setSpinning(true);
    let delay = 60, acc = 0;
    for (let i = 0; i < 14; i++) {
      acc += delay;
      delay *= 1.22;
      const g = pool[Math.floor(Math.random() * pool.length)];
      timers.current.push(setTimeout(() => setFace(g), acc));
    }
    const final = pool[Math.floor(Math.random() * pool.length)];
    timers.current.push(setTimeout(() => { setFace(final); setPick(final); setSpinning(false); }, acc + delay));
  };

  const chipRow = (list, val, set) => (
    <div className="chips">{list.map(([k, l]) => <button key={k} className={`chip ${val === k ? 'on' : ''}`} onClick={() => set(k)}>{l}</button>)}</div>
  );
  const shown = face || pick;
  const p = pick && pt[pick.key];

  return (
    <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ alignItems: 'center' }}>
      <motion.div className="sheet glass" style={{ width: 760, padding: 32 }} onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
        <button className="icon-btn close" onClick={onClose}><X size={18} /></button>
        <div className="eyebrow">The Norns decide</div>
        <h2 className="h-title" style={{ marginBottom: 18 }}>What should I play tonight?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 230px', gap: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><div className="muted" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>TIME I HAVE</div>{chipRow(TIMES, time, setTime)}</div>
            <div><div className="muted" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>MOOD</div>{chipRow(['Any', ...Object.keys(MOODS)].map((m) => [m, m]), mood, setMood)}</div>
            <div><div className="muted" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>MODE</div>{chipRow(MODES, mode, setMode)}</div>
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>{pool.length} of your games fit. Moods come from Steam genres; time uses your average session length from Gjallarhorn.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 'auto', flexWrap: 'wrap' }}>
              <motion.button className="btn gold lg" whileTap={{ scale: 0.94 }} disabled={!pool.length || spinning} onClick={spin}>
                {pick ? <RotateCw size={17} /> : <Dices size={17} />}{pick ? 'Spin again' : 'Spin'}
              </motion.button>
              {pick && <button className="btn aurora lg" onClick={() => { window.gjallar.launchGame(pick); onClose(); }}><Play size={16} fill="currentColor" />Play</button>}
              {pick && <button className="btn lg" onClick={() => window.gjallar.open(`https://howlongtobeat.com/?q=${encodeURIComponent(pick.name)}`)}><Clock size={15} />How long to beat?</button>}
            </div>
          </div>
          <div style={{ aspectRatio: '2/3', borderRadius: 18, overflow: 'hidden', position: 'relative', background: '#0b1024', border: `2px solid ${pick ? 'var(--gold)' : 'var(--line-hi)'}`, boxShadow: pick ? 'var(--glow-gold)' : 'none' }}>
            <AnimatePresence mode="popLayout">
              {shown ? (
                <motion.div key={shown.key + (pick ? 'p' : '')} style={{ position: 'absolute', inset: 0 }} initial={{ scale: 1.15, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: spinning ? 0.08 : 0.4 }}>
                  <Img srcs={[shown.cover, shown.appid && steamImg.cover(shown.appid)]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} fallback={<div className="cover-fallback">{shown.name}</div>} />
                </motion.div>
              ) : <div className="empty" style={{ padding: 30 }}><div className="rune-big">ᚾ</div></div>}
            </AnimatePresence>
          </div>
        </div>
        {pick && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 18 }}>
            <h3 className="h-display" style={{ fontSize: 28, margin: 0 }}>{pick.name}</h3>
            <div className="muted" style={{ fontSize: 13 }}>{(genres[pick.appid] || []).slice(0, 3).join(' · ')}{p ? ` · ${Math.round(p.total / 3600000 * 10) / 10} h played` : ' · never played in Gjallarhorn'}</div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
