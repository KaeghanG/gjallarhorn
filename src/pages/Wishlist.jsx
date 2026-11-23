import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Target, TrendingDown } from 'lucide-react';
import { PageHead, TiltCard, Img, Empty, stagger } from '../components/ui.jsx';
import { money, steamImg } from '../api.js';
import Friends from '../components/Friends.jsx';

export default function Wishlist({ settings, saveSettings, openGame }) {
  const list = settings?.wishlist || [];
  const hit = (w) => w.targetPrice != null && w.lastPrice != null && w.lastPrice <= w.targetPrice;
  const update = (id, patch) => saveSettings({ wishlist: list.map((w) => (w.gameID === id ? { ...w, ...patch } : w)) });
  const remove = (id) => saveSettings({ wishlist: list.filter((w) => w.gameID !== id) });

  return (
    <>
      <PageHead eyebrow="Wishlist" title="Watched games" sub="Gjallarhorn checks prices across every store each time it starts and sounds the horn when one drops." />
      {!list.length ? (
        <Empty rune="ᚹ" title="Nothing on your wishlist yet">Open any game and press the heart to watch its price.</Empty>
      ) : (
        <>
          <p className="muted" style={{ marginTop: -8 }}>
            {list.length} game{list.length > 1 ? 's' : ''} watched · {list.filter(hit).length} at or below target
          </p>
          <motion.div className="grid" variants={stagger} initial="hidden" animate="show">
            {list.map((w) => (
              <TiltCard key={w.gameID} onClick={() => openGame({ gameID: w.gameID, steamAppID: w.steamAppID, title: w.title, thumb: w.thumb })}>
                <div className="media">
                  <Img srcs={[w.steamAppID && steamImg.header(w.steamAppID), w.thumb]} alt="" />
                  {hit(w) && <div className="corner"><span className="discount"><Target size={11} style={{ verticalAlign: -1 }} /> TARGET HIT</span></div>}
                </div>
                <div className="body">
                  <div className="title">{w.title}</div>
                  <div className="meta">
                    <span className="price-now">{money(w.lastPrice)}</span>
                    {w.addedPrice != null && w.lastPrice < w.addedPrice && (
                      <span className="tag green"><TrendingDown size={11} /> was {money(w.addedPrice)}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <span className="muted" style={{ fontSize: 12 }}>Alert under $</span>
                    <input className="input" style={{ height: 30, width: 84, fontSize: 13, padding: '0 10px' }} type="number" step="0.01" min="0"
                      defaultValue={w.targetPrice ?? ''} placeholder="any"
                      onBlur={(e) => update(w.gameID, { targetPrice: e.target.value === '' ? null : Number(e.target.value) })} />
                    <div style={{ flex: 1 }} />
                    <button className="btn sm danger" title="Stop watching" onClick={() => remove(w.gameID)}><Trash2 size={13} /></button>
                  </div>
                </div>
              </TiltCard>
            ))}
          </motion.div>
        </>
      )}
      <Friends settings={settings} saveSettings={saveSettings} openGame={openGame} />
    </>
  );
}
