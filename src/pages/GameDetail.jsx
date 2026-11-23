import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Heart, ExternalLink, Trophy, Calendar, Cpu, TrendingDown, Volume2, VolumeX } from 'lucide-react';
import { Img, useToast } from '../components/ui.jsx';
import PriceChart, { cheapestOverTime } from '../components/PriceChart.jsx';
import BuyBadges from '../components/BuyBadges.jsx';
import { TrailerVideo } from '../components/Trailer.jsx';
import { TRUST, trustOf, KEYSHOPS } from '../data/stores.js';
import { gameById, gameBySteam, searchGames, steamDetails, stores, money, dealLink, steamImg, steamUrl, getRegion } from '../api.js';

// Loads everything about a game: Steam details + every store's price from CheapShark.
async function load(game) {
  let appid = game.steamAppID && game.steamAppID !== 'null' ? String(game.steamAppID) : null;
  let gameID = game.gameID || null;
  if (!gameID && appid) gameID = (await gameBySteam(appid).catch(() => null))?.gameID || null;
  if (!gameID && game.title) {
    const r = await searchGames(game.title).catch(() => []);
    const exact = r.find((x) => x.external.toLowerCase() === game.title.toLowerCase()) || r[0];
    gameID = exact?.gameID || null;
    if (!appid && exact?.steamAppID) appid = exact.steamAppID;
  }
  const [cs, steam, st] = await Promise.all([
    gameID ? gameById(gameID).catch(() => null) : null,
    appid ? steamDetails(appid).catch(() => null) : null,
    stores().catch(() => ({})),
  ]);
  if (!appid && cs?.info?.steamAppID) appid = cs.info.steamAppID;
  return { appid, gameID, cs, steam, stores: st };
}

export default function GameDetail({ game, onClose, settings, saveSettings }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const [shot, setShot] = useState(null);

  const [hist, setHist] = useState(null);
  const [wiki, setWiki] = useState(undefined);
  const [ks, setKs] = useState(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    load(game).then((r) => {
      setD(r);
      const cheapest = (r.cs?.deals || []).reduce((m, x) => Math.min(m, Number(x.price)), Infinity);
      if (r.gameID && isFinite(cheapest)) window.gjallar.recordPrice(r.gameID, cheapest, r.cs?.info?.title).catch(() => {});
      if (r.appid) window.gjallar.keyshops(r.appid).then(setKs, (e) => setKs({ error: e.message }));
      else setKs({ found: false, enabled: true });
      window.gjallar.wikiLookup({ name: r.steam?.name || r.cs?.info?.title || game.title }).then((w) => setWiki(w?.features || null), () => setWiki(null));
      window.gjallar.priceHistory({ gameID: r.gameID, appid: r.appid, title: r.steam?.name || r.cs?.info?.title || game.title, country: 'US' })
        .then(setHist, (e) => setHist({ local: [], itad: null, error: e.message }));
    }, (e) => setErr(e.message));
  }, [game]);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && (shot ? setShot(null) : onClose());
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [shot, onClose]);

  const title = d?.steam?.name || d?.cs?.info?.title || game.title;
  const movies = d?.steam?.movies || [];
  const trailer = movies.find((m) => m.highlight && m.hls_h264) || movies.find((m) => m.hls_h264) || null;
  const appid = d?.appid || game.steamAppID;
  const dealsSorted = (d?.cs?.deals || []).slice().sort((a, b) => a.price - b.price);
  const best = dealsSorted[0];
  const maxPrice = Math.max(...dealsSorted.map((x) => Number(x.retailPrice)), 1);
  const wish = settings?.wishlist || [];
  const gid = d?.gameID;
  const wished = gid && wish.some((w) => w.gameID === gid);

  const toggleWish = async () => {
    if (!gid) return;
    const next = wished
      ? wish.filter((w) => w.gameID !== gid)
      : [...wish, { gameID: gid, title, thumb: d.cs?.info?.thumb, steamAppID: appid || null, lastPrice: best ? Number(best.price) : null, addedPrice: best ? Number(best.price) : null, targetPrice: null }];
    await saveSettings({ wishlist: next });
    toast({ kind: 'ok', title: wished ? 'Removed from wishlist' : 'Watching price', body: wished ? title : "You'll get an alert when it drops." });
  };

  return (
    <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="sheet" onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 60, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}>
        <button className="icon-btn close" onClick={onClose}><X size={18} /></button>
        <div className="sheet-hero">
          <Img className="ken" srcs={[appid && steamImg.hero(appid), d?.steam?.background_raw, appid && steamImg.header(appid), game.thumb]} alt="" />
          {trailer && <TrailerVideo src={trailer.hls_h264} delay={600} muted={muted} />}
          {trailer && (
            <button className="icon-btn" style={{ position: 'absolute', top: 18, right: 66, zIndex: 5 }} title={muted ? 'Unmute trailer' : 'Mute'} onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
          )}
          <div className="fade" />
          <div className="head">
            <div>
              <div className="eyebrow">{d?.steam?.genres?.map((g) => g.description).slice(0, 3).join(' · ') || 'Game'}</div>
              <h1 className="h-display">{title}</h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {d?.steam?.metacritic && <span className="tag gold"><Trophy size={11} /> Metacritic {d.steam.metacritic.score}</span>}
                {d?.steam?.release_date?.date && <span className="tag"><Calendar size={11} /> {d.steam.release_date.date}</span>}
                {d?.steam?.developers?.[0] && <span className="tag">{d.steam.developers[0]}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {gid && <motion.button whileTap={{ scale: 0.85 }} className={`btn lg ${wished ? 'gold' : ''}`} onClick={toggleWish}><Heart size={16} fill={wished ? 'currentColor' : 'none'} />{wished ? 'Watching' : 'Wishlist'}</motion.button>}
              {best && <button className="btn aurora lg" onClick={() => window.gjallar.open(dealLink(best.dealID))}>Best price {money(best.price)}</button>}
            </div>
          </div>
        </div>

        <div className="sheet-body">
          <div>
            {!d && !err && <div className="skeleton" style={{ height: 180 }} />}
            {err && <div className="err">{err}</div>}
            {d?.steam ? (
              <>
                <div className="desc" dangerouslySetInnerHTML={{ __html: sanitize(d.steam.short_description) }} />
                <div className="shots">
                  {(d.steam.screenshots || []).slice(0, 10).map((s) => (
                    <img key={s.id} src={s.path_thumbnail} alt="" onClick={() => setShot(s.path_full)} />
                  ))}
                </div>
                {d.steam.pc_requirements?.recommended && (
                  <details className="fix" style={{ marginTop: 16 }}>
                    <summary><Cpu size={15} /> Recommended specs</summary>
                    <pre>{strip(d.steam.pc_requirements.recommended)}</pre>
                  </details>
                )}
              </>
            ) : d && <p className="muted">No Steam page for this game, but prices from other stores are on the right.</p>}
          </div>

          <div>
            {d && (appid || d.steam) && wiki !== undefined && (
              <div style={{ marginBottom: 16 }}><BuyBadges appid={appid} requirements={d.steam?.pc_requirements} features={wiki || undefined} /></div>
            )}
            <div className="panel">
              <h3 style={{ justifyContent: 'space-between' }}>Prices in every store <span className="tag" title="CheapShark compares stores in US dollars">USD</span></h3>
              {d?.steam?.price_overview && getRegion() !== 'US' && (
                <div className="okbox" style={{ marginBottom: 12 }}>
                  <span>Steam in your region ({getRegion()}): <b>{d.steam.price_overview.final_formatted}</b>
                    {d.steam.price_overview.discount_percent > 0 && <> (−{d.steam.price_overview.discount_percent}%)</>}</span>
                </div>
              )}
              {!d && <div className="skeleton" style={{ height: 200 }} />}
              {d && !dealsSorted.length && <p className="muted">No store listings found.</p>}
              {dealsSorted.map((x, i) => {
                const s = d.stores[x.storeID];
                const off = Math.round(Number(x.savings));
                return (
                  <motion.div key={x.dealID} className={`price-row ${i === 0 ? 'best' : ''}`} onClick={() => window.gjallar.open(dealLink(x.dealID))}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                    {s && <img className="store-ico" src={s.icon} alt="" />}
                    <span className="name">{s?.name || `Store ${x.storeID}`}</span>
                    <span className={`tag ${TRUST[trustOf(x.storeID)].cls}`} title={TRUST[trustOf(x.storeID)].desc} style={{ fontSize: 10 }}>{TRUST[trustOf(x.storeID)].label}</span>
                    {off > 0 && <span className="tag green" title={`Regular price ${money(x.retailPrice)}`}>-{off}%</span>}
                    <b style={{ minWidth: 64, textAlign: 'right' }}>{money(x.price)}</b>
                    <motion.div className="bar" initial={{ width: 0 }} animate={{ width: `${(1 - x.price / maxPrice) * 100}%` }} transition={{ delay: 0.3 + i * 0.05, duration: 0.8 }} />
                  </motion.div>
                );
              })}
              {d?.cs?.cheapestPriceEver && (
                <div className="okbox" style={{ marginTop: 14 }}>
                  <TrendingDown size={16} />
                  <span>Lowest price ever: <b>{money(d.cs.cheapestPriceEver.price)}</b> on {new Date(d.cs.cheapestPriceEver.date * 1000).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            {settings?.showKeyshops !== false && (
              <div className="panel" style={{ borderColor: 'rgba(255,181,71,.25)' }}>
                <h3 style={{ justifyContent: 'space-between' }}>Key shops <span className="tag warn" title={TRUST.keyshop.desc}>Grey market</span></h3>
                {ks?.found && ks.keyshops != null ? (
                  <div className="price-row" style={{ cursor: 'pointer' }} onClick={() => window.gjallar.open(ks.url)}>
                    <span className="name">Cheapest key shop (via GG.deals)</span>
                    {ks.retail != null && ks.keyshops < ks.retail && <span className="tag green">-{Math.round((1 - ks.keyshops / ks.retail) * 100)}% vs official</span>}
                    <b>{ks.currency === 'USD' ? money(ks.keyshops) : `${ks.keyshops} ${ks.currency}`}</b>
                  </div>
                ) : (
                  <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
                    {ks?.error ? `GG.deals: ${ks.error}` : ks?.enabled === false ? 'Add a free GG.deals key in Settings to see key-shop prices here.' : ks?.found === false ? 'GG.deals has no key-shop listing for this game.' : 'Checking…'}
                  </p>
                )}
                {KEYSHOPS.map((k) => (
                  <div key={k.id} className="price-row" onClick={() => window.gjallar.open(k.search(title))} title={k.reputation}>
                    <span className="name">{k.name}</span>
                    <span className="tag warn" style={{ fontSize: 10 }}>Key shop</span>
                    <span className="muted" style={{ fontSize: 12 }}>Search <ExternalLink size={11} /></span>
                  </div>
                ))}
                <p className="muted" style={{ fontSize: 11.5, margin: '8px 0 0' }}>Not authorized by publishers: keys can be region-locked, and keys from fraud can be revoked. On G2A, buy from highly rated sellers. Hover a shop to see its reputation.</p>
              </div>
            )}
            <div className="panel">
              <h3 style={{ justifyContent: 'space-between' }}>Price history <span className="tag">USD</span></h3>
              {!hist ? <div className="skeleton" style={{ height: 160 }} /> : (() => {
                const pts = hist.itad?.points?.length ? cheapestOverTime(hist.itad.points) : hist.local;
                const low = d?.cs?.cheapestPriceEver ? Number(d.cs.cheapestPriceEver.price) : null;
                return (
                  <>
                    {pts.length > 1 ? <PriceChart points={pts} low={low} /> : (
                      <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                        {hist.itad ? 'IsThereAnyDeal has no history for this game.' : 'Gjallarhorn records a price each time you open a game, so this graph fills in over time.'}
                      </p>
                    )}
                    {!hist.itad && !hist.error && <p className="muted" style={{ fontSize: 11.5, marginBottom: 0 }}>Add a free IsThereAnyDeal key in Settings for years of history.</p>}
                    {hist.error && <p className="err" style={{ fontSize: 12, marginBottom: 0 }}>{hist.error}</p>}
                  </>
                );
              })()}
            </div>
            {appid && (
              <div className="panel">
                <h3>Links</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn sm" onClick={() => window.gjallar.open(steamUrl(appid))}>Steam <ExternalLink size={12} /></button>
                  <button className="btn sm" onClick={() => window.gjallar.open(`https://www.pcgamingwiki.com/api/appid.php?appid=${appid}`)}>PCGamingWiki <ExternalLink size={12} /></button>
                  <button className="btn sm" onClick={() => window.gjallar.open(`https://www.protondb.com/app/${appid}`)}>ProtonDB <ExternalLink size={12} /></button>
                  <button className="btn sm" onClick={() => window.gjallar.open(`https://howlongtobeat.com/?q=${encodeURIComponent(title)}`)}>HowLongToBeat <ExternalLink size={12} /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {shot && (
          <motion.div className="lightbox" onClick={(e) => { e.stopPropagation(); setShot(null); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.img src={shot} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function strip(html) {
  return String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{2,}/g, '\n').trim();
}
// Steam's short description is HTML; keep only text-level tags.
function sanitize(html) {
  return strip(html).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br/>');
}
