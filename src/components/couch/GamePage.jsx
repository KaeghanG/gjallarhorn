import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Star, Bookmark, Save, ShoppingBag, ArrowLeft, Trophy, Wrench, Clock, Newspaper } from 'lucide-react';
import { Img } from '../ui.jsx';
import { TrailerVideo, GameBio, gameInfo } from '../Trailer.jsx';
import { fmtPlaytime } from '../SavesPanel.jsx';

// Full-screen game page for couch mode: trailer, bio, playtime, actions, achievements and patch notes. All controller-navigable.
// Focus model: section 0 = the button row (left/right), sections 1.. = news items (up/down); A activates, B goes back.
export default function GamePage({ tile, pt, fav, bind, onClose, onPlay, onFav, onShelf, onBackup }) {
  const g = tile.game;
  const [info, setInfo] = useState(null);
  const [ach, setAch] = useState(null);
  const [news, setNews] = useState([]);
  const [foc, setFoc] = useState({ sec: 0, idx: 0 });

  useEffect(() => {
    gameInfo(g.appid).then(setInfo);
    if (g.source === 'steam' && g.appid) {
      window.gjallar.achievements(g).then(setAch, () => setAch(null));
      window.gjallar.news(g.appid).then((n) => setNews(n.slice(0, 4)), () => {});
    }
  }, [g.key]);

  const buttons = [
    { id: 'play', label: 'Play', icon: Play, run: onPlay },
    { id: 'fav', label: fav ? 'Unfavorite' : 'Favorite', icon: Star, run: onFav },
    { id: 'shelf', label: 'Add to shelf', icon: Bookmark, run: onShelf },
    { id: 'save', label: 'Back up saves', icon: Save, run: onBackup },
    ...(g.appid ? [{ id: 'store', label: 'Store page', icon: ShoppingBag, run: () => window.gjallar.open(`https://store.steampowered.com/app/${g.appid}`) }] : []),
    { id: 'back', label: 'Back', icon: ArrowLeft, run: onClose },
  ];

  // The couch-mode input router calls this for every button press while the page is open.
  bind((btn) => {
    if (btn === 'b') return onClose();
    if (btn === 'up') setFoc((f) => ({ sec: Math.max(0, f.sec - 1), idx: f.sec - 1 === 0 ? 0 : f.idx }));
    if (btn === 'down') setFoc((f) => ({ sec: Math.min(news.length, f.sec + 1), idx: 0 }));
    if (btn === 'left') setFoc((f) => (f.sec === 0 ? { ...f, idx: Math.max(0, f.idx - 1) } : f));
    if (btn === 'right') setFoc((f) => (f.sec === 0 ? { ...f, idx: Math.min(buttons.length - 1, f.idx + 1) } : f));
    if (btn === 'a') {
      if (foc.sec === 0) buttons[foc.idx]?.run();
      else { const n = news[foc.sec - 1]; if (n) window.gjallar.open(n.url); }
    }
  });

  const played = pt?.[g.key];
  const unlocked = ach?.steam ? ach.steam.unlocked : null;
  const rare = ach?.steam ? ach.steam.items.filter((a) => a.achieved).sort((a, b) => (a.globalPct ?? 101) - (b.globalPct ?? 101)).slice(0, 5) : [];

  return (
    <motion.div className="couch-page" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <div className="couch-page-bg">
        <Img srcs={[g.hero, g.appid && `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${g.appid}/library_hero.jpg`, g.header]} alt="" className="ken" />
        {info?.trailer && <TrailerVideo src={info.trailer.hls} delay={700} muted />}
      </div>
      <div className="couch-page-shade" />
      <div className="couch-page-body">
        <div className="eyebrow">{{ steam: 'Steam', epic: 'Epic Games', custom: 'Custom' }[g.source]}</div>
        {g.appid ? <Img srcs={[`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${g.appid}/logo.png`]} alt={g.name} className="couch-logo" fallback={<h1 className="h-display">{g.name}</h1>} /> : <h1 className="h-display">{g.name}</h1>}
        <div className="couch-meta">
          {played ? <span><Clock size={14} style={{ verticalAlign: -2 }} /> {fmtPlaytime(played.total)} played · {played.sessions} session{played.sessions > 1 ? 's' : ''}</span> : <span>Not played yet</span>}
          {played?.last && <span>Last played {new Date(played.last).toLocaleDateString()}</span>}
        </div>
        <GameBio info={info} large />

        <div className="couch-page-buttons">
          {buttons.map((b, k) => (
            <div key={b.id} className={`couch-pbtn ${foc.sec === 0 && foc.idx === k ? 'on' : ''} ${b.id === 'play' ? 'primary' : ''}`}>
              <b.icon size={20} fill={b.id === 'play' ? 'currentColor' : 'none'} />{b.label}
            </div>
          ))}
        </div>

        <div className="couch-page-cols">
          <div className="couch-pcol">
            <h3><Trophy size={16} /> Achievements</h3>
            {ach?.steam ? (
              <>
                <div className="couch-pbar"><div style={{ width: `${(unlocked / ach.steam.total) * 100}%` }} /></div>
                <div className="muted" style={{ marginBottom: 8 }}>{unlocked} / {ach.steam.total} unlocked</div>
                {rare.map((a) => <div key={a.id} className="couch-ach"><img src={a.icon} alt="" /><span>{a.name}</span>{a.globalPct != null && <small>{a.globalPct.toFixed(1)}%</small>}</div>)}
              </>
            ) : <div className="muted">{ach?.error || (g.source === 'steam' ? 'Loading…' : 'Only available for Steam games.')}</div>}
          </div>
          <div className="couch-pcol">
            <h3><Newspaper size={16} /> News &amp; patches</h3>
            {news.length ? news.map((n, k) => (
              <div key={n.id} className={`couch-news ${foc.sec === k + 1 ? 'on' : ''}`}>
                {n.patch ? <Wrench size={15} /> : <Newspaper size={15} />}<span>{n.title}</span>
                <small>{new Date(n.date).toLocaleDateString()}</small>
              </div>
            )) : <div className="muted">No recent news.</div>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
