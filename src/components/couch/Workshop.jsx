import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Check, Plus, ExternalLink, Users } from 'lucide-react';
import { Img } from '../ui.jsx';

// Steam Workshop for one game: browse, subscribe/unsubscribe, see what you have. Controller-first.
const SORTS = [['popular', 'Popular'], ['trending', 'Trending'], ['recent', 'Newest'], ['mine', 'Subscribed']];
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString() : '');
const fmtSize = (b) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${Math.round(b / 1e6)} MB` : b ? `${Math.round(b / 1e3)} KB` : '');

export default function Workshop({ game, bind, onClose }) {
  const [sort, setSort] = useState(0);
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const key = SORTS[sort][0];

  const load = useCallback(async (p, replace) => {
    setState('loading'); setErr('');
    try {
      const r = await window.gjallar.workshop.browse({ appid: game.appid, sort: key, page: p });
      setItems((old) => (replace ? r.items : [...old, ...r.items.filter((n) => !old.some((o) => o.id === n.id))]));
      setPage(p);
      setState('ready');
    } catch (e) { setErr(e.message || String(e)); setState('error'); }
  }, [game.appid, key]);
  useEffect(() => { setItems([]); setSel(0); load(1, true); }, [load]);
  useEffect(() => { listRef.current?.querySelector('.ws-row.on')?.scrollIntoView({ block: 'nearest' }); }, [sel, items.length]);
  const flash = (m) => { setNote(m); setTimeout(() => setNote(''), 5000); };

  const cur = items[Math.min(sel, items.length - 1)];
  const toggle = async () => {
    if (!cur || busy) return;
    setBusy(true);
    try {
      const r = await window.gjallar.workshop.subscribe(cur.id, game.appid, !cur.subscribed);
      if (r.via === 'web') setItems((l) => l.map((i) => (i.id === cur.id ? { ...i, subscribed: !cur.subscribed } : i)));
      flash(r.note);
    } catch (e) { flash(e.message || String(e)); }
    setBusy(false);
  };

  bind((btn) => {
    if (btn === 'b') return onClose();
    if (btn === 'lb') return setSort((s) => (s + SORTS.length - 1) % SORTS.length);
    if (btn === 'rb') return setSort((s) => (s + 1) % SORTS.length);
    if (btn === 'up') setSel((s) => Math.max(0, s - 1));
    if (btn === 'down') {
      setSel((s) => Math.min(items.length - 1, s + 1));
      if (sel >= items.length - 4 && state === 'ready' && key !== 'mine' && items.length >= page * 30) load(page + 1, false);
    }
    if (btn === 'a') toggle();
    if (btn === 'x' && cur) window.gjallar.workshop.open(cur.id).catch(() => {});
    if (btn === 'y') window.gjallar.workshop.hub(game.appid).catch(() => {});
  });

  return (
    <motion.div className="couch-page inst-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="couch-page-bg"><Img srcs={game.hero} alt="" className="ken" /></div>
      <div className="couch-page-shade" />
      <div className="ws-wrap">
        <div className="ws-head">
          <h1 className="h-title"><Wrench size={26} style={{ verticalAlign: -4, marginRight: 10 }} />Workshop — {game.title}</h1>
          <div className="ws-tabs">{SORTS.map(([id, label], i) => <span key={id} className={i === sort ? 'on' : ''}>{label}</span>)}</div>
        </div>
        {state === 'error' ? (
          <div className="fr-err" style={{ padding: 24, fontSize: 18 }}>{err}</div>
        ) : (
          <div className="ws-body">
            <div className="ws-list" ref={listRef}>
              {items.map((it, i) => (
                <div key={it.id} className={`ws-row ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>
                  <Img srcs={[it.preview]} alt="" className="ws-thumb" fallback={<span className="ws-thumb ph"><Wrench size={20} /></span>} />
                  <div className="ws-txt"><b>{it.title}</b><small>{it.subsText ? `${it.subsText} subscribers` : ''}{it.size ? ` · ${fmtSize(it.size)}` : ''}</small></div>
                  {it.subscribed && <Check size={18} className="ws-ok" />}
                </div>
              ))}
              {state === 'loading' && <div className="muted" style={{ padding: 16 }}>Loading…</div>}
              {state === 'ready' && !items.length && <div className="muted" style={{ padding: 16 }}>{key === 'mine' ? 'Nothing subscribed for this game yet.' : 'No Workshop items found.'}</div>}
            </div>
            <div className="ws-detail">
              {cur ? (
                <>
                  <Img srcs={[cur.preview]} alt="" className="ws-big" fallback={<div className="ws-big ph"><Wrench size={48} /></div>} />
                  <h2>{cur.title}</h2>
                  <div className="ws-meta"><span><Users size={14} /> {cur.subsText || '—'}</span>{cur.updated ? <span>Updated {fmtDate(cur.updated)}</span> : null}{cur.size ? <span>{fmtSize(cur.size)}</span> : null}</div>
                  <p>{cur.desc || 'No description.'}</p>
                  <div className={`ws-btn ${cur.subscribed ? 'on' : ''}`}>{cur.subscribed ? <><Check size={18} />Subscribed — press A to unsubscribe</> : <><Plus size={18} />Press A to subscribe</>}</div>
                </>
              ) : null}
            </div>
          </div>
        )}
        {note && <div className="ws-note">{note}</div>}
        <div className="inst-hint" style={{ position: 'static', marginTop: 12 }}>
          <b className="btn-glyph a">A</b>Subscribe <b className="btn-glyph x" style={{ marginLeft: 14 }}>X</b>View in Steam <b className="btn-glyph y" style={{ marginLeft: 14 }}>Y</b>Workshop home <b className="btn-glyph lb" style={{ marginLeft: 14 }}>LB</b><b className="btn-glyph rb">RB</b>Sort <b className="btn-glyph b" style={{ marginLeft: 14 }}>B</b>Back
        </div>
      </div>
    </motion.div>
  );
}
