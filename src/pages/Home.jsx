import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, Play, ArrowRight, Gift, TrendingDown, Gamepad2, BatteryWarning, Dices } from 'lucide-react';
import { UpdatesFeed } from '../components/NewsPanel.jsx';
import { SectionHead, Skeletons, stagger, useAsync, Img, TiltCard } from '../components/ui.jsx';
import { DealCard, SteamCard, FreeCard, PriceTag } from '../components/Cards.jsx';
import { steamFeatured, epicFree, deals, stores, steamImg } from '../api.js';
import { cheapestPerGame } from './Store.jsx';

function Hero({ items, onOpen }) {
  const [i, setI] = useState(0);
  const n = items.length;
  useEffect(() => {
    if (!n) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 8000);
    return () => clearInterval(t);
  }, [n, i]);
  if (!n) return <div className="hero skeleton" />;
  const it = items[i];
  return (
    <div className="hero">
      <AnimatePresence mode="sync">
        <motion.div key={it.id} className="hero-slide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}>
          <Img className="ken" srcs={[steamImg.hero(it.id), it.large_capsule_image, it.header_image]} alt="" />
        </motion.div>
      </AnimatePresence>
      <div className="hero-shade" />
      <AnimatePresence mode="wait">
        <motion.div key={it.id} className="hero-content"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
          transition={{ type: 'spring', stiffness: 140, damping: 20, delay: 0.15 }}>
          <span className="eyebrow"><Sparkles size={12} style={{ verticalAlign: -1 }} /> Steam special · {it.discount_percent}% off</span>
          <h1 className="h-display">{it.name}</h1>
          <div className="hero-price"><PriceTag sale={it.final_price / 100} normal={it.original_price / 100} size={24} currency={it.currency} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn gold lg" onClick={() => onOpen({ steamAppID: String(it.id), title: it.name })}>Compare prices <ArrowRight size={16} /></button>
            <button className="btn lg" onClick={() => window.gjallar.open(`https://store.steampowered.com/app/${it.id}`)}>View on Steam</button>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="hero-arrows">
        <button className="icon-btn" onClick={() => setI((i - 1 + n) % n)}><ChevronLeft size={18} /></button>
        <button className="icon-btn" onClick={() => setI((i + 1) % n)}><ChevronRight size={18} /></button>
      </div>
      <div className="hero-dots">
        {items.map((x, k) => (
          <button key={x.id} onClick={() => setI(k)}>
            {k === i && <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 8, ease: 'linear' }} />}
            {k < i && <span />}
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ loading, error, children, h = 230 }) {
  if (loading) return <Skeletons n={5} h={h} className="row-scroll" />;
  if (error) return <div className="err">Couldn't load: {error}</div>;
  return <motion.div className="row-scroll" variants={stagger} initial="hidden" animate="show">{children}</motion.div>;
}

// "Today in your realm": one glance at what matters right now.
function DailyBrief({ free, settings, setPage, openRoulette }) {
  const [emu, setEmu] = useState(0);
  const [battery, setBattery] = useState(false);
  useEffect(() => {
    window.gjallar.emuUpdates().then((u) => setEmu(u.length)).catch(() => {});
    window.gjallar.onBattery().then(setBattery).catch(() => {});
  }, []);
  const freeNow = (free || []).filter((g) => g.now);
  const drops = (settings?.wishlist || []).filter((w) => w.addedPrice != null && w.lastPrice != null && w.lastPrice < w.addedPrice);
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Late night in Midgard' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const items = [
    freeNow.length && { icon: Gift, text: `${freeNow.length} free on Epic: ${freeNow.map((g) => g.title).join(', ')}`, go: () => window.gjallar.open(freeNow[0].url) },
    drops.length && { icon: TrendingDown, text: `${drops.length} wishlist price drop${drops.length > 1 ? 's' : ''}: ${drops.map((d) => d.title).slice(0, 3).join(', ')}`, go: () => setPage('wishlist') },
    emu && { icon: Gamepad2, text: `${emu} emulator update${emu > 1 ? 's' : ''} ready`, go: () => setPage('emulators') },
    battery && { icon: BatteryWarning, text: 'Running on battery: plug in for full GPU power before gaming', go: null },
  ].filter(Boolean);
  return (
    <motion.div className="glass" style={{ padding: '18px 22px', marginTop: 18, display: 'flex', alignItems: 'center', gap: 22 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div style={{ minWidth: 190 }}>
        <div className="eyebrow">Daily brief</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{greet}{settings?.profileName ? `, ${settings.profileName}` : ''}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.length ? items.map((it) => (
          <div key={it.text} onClick={it.go || undefined} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: it.go ? 'pointer' : 'default', fontSize: 13.5, color: 'var(--ink-2)' }}>
            <it.icon size={15} color="var(--gold)" />{it.text}
          </div>
        )) : <span className="muted">All quiet in the nine realms. Nothing needs your attention.</span>}
      </div>
      <button className="btn aurora" onClick={openRoulette}><Dices size={15} />What should I play?</button>
    </motion.div>
  );
}

export default function Home({ openGame, library, setPage, settings, openRoulette }) {
  const feat = useAsync(steamFeatured, []);
  const free = useAsync(epicFree, []);
  const top = useAsync(() => Promise.all([deals({ sort: 'Deal Rating', aaa: true }), stores()]), []);

  // Hero = Steam specials with real discounts, deduped.
  const specials = (feat.data?.specials?.items || []).filter((x, k, a) => x.discount_percent > 0 && a.findIndex((y) => y.id === x.id) === k).slice(0, 6);
  const recent = library.games.filter((g) => g.lastPlayed).slice(0, 6);

  return (
    <>
      <Hero items={specials} onOpen={openGame} />
      <DailyBrief free={free.data} settings={settings} setPage={setPage} openRoulette={openRoulette} />

      {recent.length > 0 && (
        <div className="section">
          <SectionHead rune="ᛚ" title="Jump back in">
            <button className="btn ghost sm" onClick={() => setPage('library')}>Library <ArrowRight size={14} /></button>
          </SectionHead>
          <motion.div className="row-scroll" style={{ gridAutoColumns: 340 }} variants={stagger} initial="hidden" animate="show">
            {recent.map((g) => (
              <TiltCard key={g.key} onClick={() => window.gjallar.launchGame(g)}>
                <div className="media"><Img srcs={[g.header, g.hero, g.cover]} alt="" /></div>
                <div className="body">
                  <div className="title">{g.name}</div>
                  <div className="meta"><span className="muted" style={{ fontSize: 12 }}>Last played {new Date(g.lastPlayed).toLocaleDateString()}</span><span className="tag green"><Play size={11} fill="currentColor" />Play</span></div>
                </div>
              </TiltCard>
            ))}
          </motion.div>
        </div>
      )}

      <div className="section">
        <SectionHead rune="ᚾ" title="Updates for your games" />
        <UpdatesFeed />
      </div>

      <div className="section">
        <SectionHead rune="ᚷ" title="Free on Epic" />
        <Row loading={free.loading} error={free.error}>
          {(free.data || []).map((g) => <FreeCard key={g.id} g={g} />)}
        </Row>
      </div>

      <div className="section">
        <SectionHead rune="ᚠ" title="Best deals across every store">
          <button className="btn ghost sm" onClick={() => setPage('store')}>All deals <ArrowRight size={14} /></button>
        </SectionHead>
        <Row loading={top.loading} error={top.error}>
          {cheapestPerGame(top.data?.[0] || []).slice(0, 14).map((d) => <DealCard key={d.dealID} d={d} stores={top.data[1]} onOpen={openGame} />)}
        </Row>
      </div>

      <div className="section">
        <SectionHead rune="ᛏ" title="Top sellers on Steam" />
        <Row loading={feat.loading} error={feat.error}>
          {(feat.data?.top_sellers?.items || []).filter((x, k, a) => a.findIndex((y) => y.id === x.id) === k).map((it) => <SteamCard key={it.id} it={it} onOpen={openGame} />)}
        </Row>
      </div>

      <div className="section">
        <SectionHead rune="ᛞ" title="New & trending" />
        <Row loading={feat.loading} error={feat.error}>
          {(feat.data?.new_releases?.items || []).filter((x, k, a) => a.findIndex((y) => y.id === x.id) === k).map((it) => <SteamCard key={it.id} it={it} onOpen={openGame} />)}
        </Row>
      </div>
    </>
  );
}
