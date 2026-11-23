import React, { useCallback, useEffect, useState } from 'react';
import { Wrench, Check, Plus, ExternalLink, Search, Users } from 'lucide-react';
import { Img, PageHead } from '../components/ui.jsx';

// Steam Workshop on the desktop: pick a game, browse/search, subscribe or unsubscribe.
const SORTS = [['popular', 'Popular'], ['trending', 'Trending'], ['recent', 'Newest'], ['mine', 'Subscribed']];
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString() : '');

export default function WorkshopPage({ library }) {
  const games = (library?.games || []).filter((g) => g.source === 'steam' && g.appid).sort((a, b) => a.name.localeCompare(b.name));
  const [appid, setAppid] = useState(() => { try { return localStorage.getItem('ws-app') || ''; } catch { return ''; } });
  const [sort, setSort] = useState('popular');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => { if (!appid && games[0]) setAppid(games[0].appid); }, [games.length]); // eslint-disable-line
  const load = useCallback(async (p, replace) => {
    if (!appid) return;
    setState('loading'); setErr('');
    try {
      const r = await window.gjallar.workshop.browse({ appid, sort, search: query, page: p });
      setItems((old) => (replace ? r.items : [...old, ...r.items.filter((n) => !old.some((o) => o.id === n.id))]));
      setPage(p); setState('ready');
    } catch (e) { setErr(e.message || String(e)); setState('error'); }
  }, [appid, sort, query]);
  useEffect(() => { setItems([]); load(1, true); }, [load]);
  useEffect(() => { try { if (appid) localStorage.setItem('ws-app', appid); } catch {} }, [appid]);

  const flash = (m) => { setNote(m); setTimeout(() => setNote(''), 6000); };
  const toggle = async (it) => {
    setBusy(it.id);
    try {
      const r = await window.gjallar.workshop.subscribe(it.id, appid, !it.subscribed);
      if (r.via === 'web') setItems((l) => l.map((x) => (x.id === it.id ? { ...x, subscribed: !it.subscribed } : x)));
      flash(r.note);
    } catch (e) { flash(e.message || String(e)); }
    setBusy('');
  };

  return (
    <div className="page">
      <PageHead eyebrow="Steam" title="Workshop" sub="Browse and subscribe to mods and community content for your games." />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', margin: '16px 0' }}>
        <select className="input" style={{ minWidth: 260 }} value={appid} onChange={(e) => setAppid(e.target.value)}>
          {games.map((g) => <option key={g.appid} value={g.appid}>{g.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          {SORTS.map(([id, label]) => <button key={id} className={`btn sm ${sort === id ? 'gold' : ''}`} onClick={() => setSort(id)}>{label}</button>)}
        </div>
        {sort !== 'mine' && (
          <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }} className="fp-search" style={{ margin: 0, minWidth: 240 }}>
            <Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this Workshop" />
          </form>
        )}
        <button className="btn sm" onClick={() => window.gjallar.workshop.hub(appid)}><ExternalLink size={13} />Open in Steam</button>
      </div>
      {note && <div className="warnbox" style={{ marginBottom: 12 }}>{note}</div>}
      {state === 'error' && <div className="warnbox">{err}</div>}
      <div className="ws-grid">
        {items.map((it) => (
          <div key={it.id} className="ws-card">
            <Img srcs={[it.preview]} alt="" className="ws-card-img" fallback={<div className="ws-card-img ph"><Wrench size={32} /></div>} />
            <div className="ws-card-body">
              <b title={it.title}>{it.title}</b>
              <small><Users size={12} /> {it.subsText || '—'}{it.updated ? ` · ${fmtDate(it.updated)}` : ''}</small>
              <p>{it.desc}</p>
              <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                <button className={`btn sm ${it.subscribed ? '' : 'gold'}`} disabled={busy === it.id} onClick={() => toggle(it)}>{it.subscribed ? <><Check size={13} />Subscribed</> : <><Plus size={13} />Subscribe</>}</button>
                <button className="btn sm" onClick={() => window.gjallar.workshop.open(it.id)}><ExternalLink size={13} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {state === 'loading' && <div className="muted" style={{ padding: 20 }}>Loading…</div>}
      {state === 'ready' && !items.length && <div className="muted" style={{ padding: 20 }}>{sort === 'mine' ? 'Nothing subscribed for this game yet.' : 'No Workshop items found. (Not every game has a Workshop.)'}</div>}
      {state === 'ready' && sort !== 'mine' && items.length >= page * 30 && <button className="btn" style={{ margin: '16px 0' }} onClick={() => load(page + 1, false)}>Load more</button>}
    </div>
  );
}
