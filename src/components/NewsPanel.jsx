import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ExternalLink, Wrench } from 'lucide-react';
import { SectionHead, useAsync } from './ui.jsx';

const ago = (t) => {
  const d = Math.floor((Date.now() - t) / 864e5);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? `${d} days ago` : new Date(t).toLocaleDateString();
};

// Steam news + patch notes for one game.
export default function NewsPanel({ game }) {
  const { loading, data, error } = useAsync(() => (game.appid ? window.gjallar.news(game.appid) : Promise.resolve([])), [game.key]);
  const [open, setOpen] = useState(null);
  if (!game.appid) return null;
  return (
    <div style={{ marginBottom: 26 }}>
      <SectionHead rune="ᚾ" title="News & patch notes" />
      {loading ? <div className="skeleton" style={{ height: 90 }} /> : error ? <p className="err">{error}</p> : !data.length ? <p className="muted">No recent news.</p> : (
        <div className="panel" style={{ padding: 8 }}>
          {data.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div className="price-row" onClick={() => setOpen(open === n.id ? null : n.id)}>
                {n.patch ? <Wrench size={15} color="var(--aur-green)" /> : <Newspaper size={15} color="var(--muted)" />}
                <span className="name" style={{ fontWeight: 700 }}>{n.title}</span>
                {n.patch && <span className="tag green" style={{ fontSize: 10 }}>Patch</span>}
                <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{ago(n.date)}</span>
              </div>
              {open === n.id && (
                <div style={{ padding: '4px 14px 14px 40px' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font)', color: 'var(--ink-2)', fontSize: 12.5, lineHeight: 1.6, margin: 0, userSelect: 'text' }}>{n.body || 'No preview.'}</pre>
                  <button className="btn sm ghost" style={{ marginTop: 8 }} onClick={() => window.gjallar.open(n.url)}>Read full post <ExternalLink size={12} /></button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Home feed: recent patches across installed games.
export function UpdatesFeed({ onOpen }) {
  const { loading, data } = useAsync(() => window.gjallar.newsFeed(), []);
  if (loading) return <div className="skeleton" style={{ height: 120 }} />;
  if (!data?.length) return <p className="muted">No patches for your games in the last 3 weeks.</p>;
  return (
    <div className="glass" style={{ padding: 8 }}>
      {data.slice(0, 8).map((n) => (
        <div key={n.id} className="price-row" onClick={() => window.gjallar.open(n.url)}>
          <Wrench size={15} color="var(--aur-green)" />
          <b style={{ minWidth: 150, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.game}</b>
          <span className="name" style={{ fontWeight: 500, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
          <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{ago(n.date)}</span>
        </div>
      ))}
    </div>
  );
}
