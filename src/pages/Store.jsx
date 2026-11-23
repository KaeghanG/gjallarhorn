import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Flame, Crown, Percent, Star, Clock3 } from 'lucide-react';
import { PageHead, Skeletons, Empty, stagger, TiltCard, Img, useAsync } from '../components/ui.jsx';
import { DealCard } from '../components/Cards.jsx';
import { deals, searchGames, stores, money, steamImg } from '../api.js';

const SORTS = [
  { id: 'Deal Rating', label: 'Hot', icon: Flame },
  { id: 'Savings', label: 'Biggest discount', icon: Percent },
  { id: 'Metacritic', label: 'Top rated', icon: Star },
  { id: 'Recent', label: 'Newest deals', icon: Clock3 },
];
const STORE_FILTERS = [
  { ids: '1,7,11,15,25,3,23,35', label: 'All big stores' },
  { ids: '1', label: 'Steam' },
  { ids: '25', label: 'Epic' },
  { ids: '7', label: 'GOG' },
  { ids: '11', label: 'Humble' },
  { ids: '15', label: 'Fanatical' },
  { ids: '3', label: 'GreenManGaming' },
];
const PRICES = [60, 30, 15, 5, 0];

// The same game shows up once per store: keep only its cheapest deal, in original order.
export function cheapestPerGame(list) {
  const best = new Map();
  for (const d of list) {
    const cur = best.get(d.gameID);
    if (!cur || Number(d.salePrice) < Number(cur.salePrice)) best.set(d.gameID, d);
  }
  return list.filter((d) => best.get(d.gameID) === d);
}

export default function StorePage({ openGame, query, setQuery }) {
  const [q, setQ] = useState(query || '');
  const [sort, setSort] = useState('Deal Rating');
  const [store, setStore] = useState(STORE_FILTERS[0].ids);
  const [max, setMax] = useState(60);
  const [aaa, setAaa] = useState(false);
  useEffect(() => setQ(query || ''), [query]);

  const st = useAsync(stores, []);
  const results = useAsync(() => (query ? searchGames(query) : Promise.resolve(null)), [query]);
  const list = useAsync(() => deals({ sort, stores: store, max, aaa }), [sort, store, max, aaa]);

  return (
    <>
      <PageHead eyebrow="Every store, one horn" title="Store & Deals" sub="Prices from Steam, Epic, GOG, Humble, Fanatical, GreenManGaming and more, compared live so you always find the cheapest copy." />

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
        <div className="search-big">
          <Search size={20} />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a game: we'll check every store…" />
        </div>
        <button className="btn gold lg" type="submit">Search</button>
        {query && <button className="btn lg ghost" type="button" onClick={() => { setQ(''); setQuery(''); }}>Clear</button>}
      </form>

      {query ? (
        <>
          <div className="section-head"><span className="rune">ᚠ</span><h2>Results for “{query}”</h2><div className="line" /></div>
          {results.loading ? <Skeletons n={8} /> : results.error ? <div className="err">{results.error}</div> : !results.data?.length ? (
            <Empty rune="ᚾ" title="Nothing found">Try a shorter name.</Empty>
          ) : (
            <motion.div className="grid" variants={stagger} initial="hidden" animate="show">
              {results.data.map((g) => (
                <TiltCard key={g.gameID} onClick={() => openGame({ gameID: g.gameID, steamAppID: g.steamAppID, title: g.external, thumb: g.thumb })}>
                  <div className="media"><Img srcs={[g.steamAppID && steamImg.header(g.steamAppID), g.thumb]} alt="" /></div>
                  <div className="body">
                    <div className="title">{g.external}</div>
                    <div className="meta"><span className="muted" style={{ fontSize: 12 }}>Cheapest anywhere</span><span className="price-now">{money(g.cheapest)}</span></div>
                  </div>
                </TiltCard>
              ))}
            </motion.div>
          )}
        </>
      ) : (
        <>
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <div className="chips">
              {SORTS.map((s) => (
                <button key={s.id} className={`chip ${sort === s.id ? 'on' : ''}`} onClick={() => setSort(s.id)}><s.icon size={14} />{s.label}</button>
              ))}
              <button className={`chip ${aaa ? 'on' : ''}`} onClick={() => setAaa(!aaa)}><Crown size={14} />AAA only</button>
            </div>
          </div>
          <div className="toolbar">
            <select className="input" value={store} onChange={(e) => setStore(e.target.value)}>
              {STORE_FILTERS.map((s) => <option key={s.ids} value={s.ids}>{s.label}</option>)}
            </select>
            <select className="input" value={max} onChange={(e) => setMax(Number(e.target.value))}>
              {PRICES.map((p) => <option key={p} value={p}>{p === 0 ? 'Free only' : p === 60 ? 'Any price' : `Under $${p}`}</option>)}
            </select>
          </div>
          {list.loading ? <Skeletons n={12} /> : list.error ? <div className="err">{list.error}</div> : !list.data?.length ? (
            <Empty rune="ᚾ" title="No deals match">Loosen the filters.</Empty>
          ) : (
            <motion.div className="grid" variants={stagger} initial="hidden" animate="show" key={sort + store + max + aaa}>
              {cheapestPerGame(list.data).map((d) => <DealCard key={d.dealID} d={d} stores={st.data} onOpen={openGame} />)}
            </motion.div>
          )}
        </>
      )}
    </>
  );
}
