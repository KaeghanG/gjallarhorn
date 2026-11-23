import React from 'react';
import { TiltCard, Img } from './ui.jsx';
import { money, moneyIn, steamImg, timeLeft } from '../api.js';
import { Star } from 'lucide-react';

// sale/normal are whole units. With `currency` (Steam regional prices) they're formatted in that currency, else USD.
export function PriceTag({ sale, normal, size, currency }) {
  const off = normal > 0 ? Math.round((1 - sale / normal) * 100) : 0;
  const fmt = (v) => (currency ? moneyIn(v * 100, currency) : money(v));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {off > 0 && <span className="discount">-{off}%</span>}
      {off > 0 && <span className="price-old">{fmt(normal)}</span>}
      <span className={`price-now ${Number(sale) === 0 ? 'free' : ''}`} style={size ? { fontSize: size } : null}>{fmt(sale)}</span>
    </div>
  );
}

// CheapShark deal
export function DealCard({ d, stores, onOpen }) {
  const st = stores?.[d.storeID];
  return (
    <TiltCard onClick={() => onOpen({ steamAppID: d.steamAppID, gameID: d.gameID, title: d.title, thumb: d.thumb })}>
      <div className="media">
        <Img srcs={[d.steamAppID && steamImg.header(d.steamAppID), d.thumb]} alt="" />
        <div className="corner">
          {st && <span className="tag" style={{ background: 'rgba(4,6,13,.75)', backdropFilter: 'blur(8px)' }}><img className="store-ico" src={st.icon} alt="" style={{ width: 14, height: 14 }} />{st.name}</span>}
        </div>
      </div>
      <div className="body">
        <div className="title">{d.title}</div>
        <div className="meta">
          <PriceTag sale={Number(d.salePrice)} normal={Number(d.normalPrice)} />
          {Number(d.steamRatingPercent) > 0 && (
            <span className="tag" title={d.steamRatingText}><Star size={11} fill="currentColor" color="var(--gold)" />{d.steamRatingPercent}%</span>
          )}
        </div>
      </div>
    </TiltCard>
  );
}

// Steam featured item
export function SteamCard({ it, onOpen }) {
  return (
    <TiltCard onClick={() => onOpen({ steamAppID: String(it.id), title: it.name })}>
      <div className="media">
        <Img srcs={[it.header_image, it.large_capsule_image, steamImg.header(it.id)]} alt="" />
        <div className="corner"><span className="tag" style={{ background: 'rgba(4,6,13,.75)' }}>Steam</span></div>
      </div>
      <div className="body">
        <div className="title">{it.name}</div>
        <div className="meta">
          {it.final_price != null ? <PriceTag sale={it.final_price / 100} normal={(it.original_price ?? it.final_price) / 100} currency={it.currency} /> : <span className="muted">Coming soon</span>}
        </div>
      </div>
    </TiltCard>
  );
}

// Epic free game
export function FreeCard({ g }) {
  return (
    <TiltCard className="card free-card" onClick={() => window.gjallar.open(g.url)}>
      <div className="media">
        <Img srcs={[g.image, g.tall]} alt="" />
        <div className="ribbon">{g.now ? <span className="discount">FREE NOW</span> : <span className="tag violet" style={{ background: 'rgba(30,16,60,.8)' }}>Coming soon</span>}</div>
      </div>
      <div className="body">
        <div className="title">{g.title}</div>
        <div className="meta">
          <span className="muted" style={{ fontSize: 12 }}>
            {g.now ? 'Ends in ' : 'Free in '}
            <span className="countdown">{timeLeft(g.now ? g.end : g.start)}</span>
          </span>
          {g.original && g.original !== '0' && <span className="price-old">{g.original}</span>}
        </div>
      </div>
    </TiltCard>
  );
}
