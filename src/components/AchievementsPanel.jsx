import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Gem } from 'lucide-react';
import { SectionHead, Progress, useAsync } from './ui.jsx';

const FILTERS = ['All', 'Unlocked', 'Locked', 'Rarest'];

export default function AchievementsPanel({ game }) {
  const { loading, data, error } = useAsync(() => window.gjallar.achievements(game), [game.key]);
  const [filter, setFilter] = useState('All');
  const [showAll, setShowAll] = useState(false);

  const s = data?.steam;
  let items = s?.items || [];
  if (filter === 'Unlocked') items = items.filter((i) => i.achieved).sort((a, b) => (b.unlockTime || 0) - (a.unlockTime || 0));
  if (filter === 'Locked') items = items.filter((i) => !i.achieved);
  if (filter === 'Rarest') items = [...items].sort((a, b) => (a.globalPct ?? 101) - (b.globalPct ?? 101));
  const shown = showAll ? items : items.slice(0, 12);

  return (
    <div style={{ marginBottom: 4 }}>
      <SectionHead rune="ᛉ" title="Achievements" />
      {loading ? <div className="skeleton" style={{ height: 120 }} /> : error ? <p className="err">{error}</p> : !s ? (
        <p className="muted" style={{ fontSize: 13 }}>{data?.error}</p>
      ) : (
        <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <Trophy size={26} color="var(--gold)" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <b>{s.unlocked} / {s.total} unlocked</b>
                <span className="muted">{Math.round((s.unlocked / s.total) * 100)}%</span>
              </div>
              <Progress value={s.unlocked / s.total} />
            </div>
          </div>
          {data.error && <div className="warnbox" style={{ marginBottom: 12 }}>{data.error}</div>}
          <div className="chips" style={{ marginBottom: 12 }}>
            {FILTERS.map((f) => <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => { setFilter(f); setShowAll(false); }}>{f}</button>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
            {shown.map((a, i) => {
              const hiddenLocked = a.hidden && !a.achieved;
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
                  style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, borderRadius: 12, border: '1px solid var(--line)', opacity: a.achieved ? 1 : 0.6,
                    background: a.achieved ? 'linear-gradient(90deg, rgba(240,200,105,.08), transparent)' : 'transparent' }}>
                  {a.icon ? <img src={a.achieved ? a.icon : a.iconGray} alt="" style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0 }} /> : <Lock size={24} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hiddenLocked ? 'Hidden achievement' : a.name}</span>
                      {a.achieved && a.globalPct != null && a.globalPct < 10 && <span className="tag gold"><Gem size={10} />Rare</span>}
                    </div>
                    {!hiddenLocked && a.desc && <div className="muted" style={{ fontSize: 12, lineHeight: 1.35 }}>{a.desc}</div>}
                    <div className="muted" style={{ fontSize: 11 }}>
                      {a.globalPct != null && `${a.globalPct.toFixed(1)}% of players`}
                      {a.achieved && a.unlockTime && ` · unlocked ${new Date(a.unlockTime).toLocaleDateString()}`}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {items.length > 12 && <button className="btn sm ghost" style={{ marginTop: 10 }} onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `Show all ${items.length}`}</button>}
        </div>
      )}
    </div>
  );
}
