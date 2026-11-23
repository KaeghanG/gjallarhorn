import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Medal } from 'lucide-react';
import { Img } from '../ui.jsx';

// Format ms epoch to a short date string.
const fmtDate = (ms) => {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Build a single sorted array from the API response and pick one of unlocked / locked per row.
function buildRows(list) {
  if (!list || !Array.isArray(list)) return { rows: [], unlocked: [], locked: [] };
  const unlocked = list.filter((a) => a.unlocked).sort((a, b) => (b.unlockTime || 0) - (a.unlockTime || 0));
  const locked = list.filter((a) => !a.unlocked);
  // Locked: non-hidden first (by name), then hidden at the end.
  const visibleLocked = locked.filter((a) => !a.hidden).sort((a, b) => a.name.localeCompare(b.name));
  const hiddenLocked = locked.filter((a) => a.hidden);
  return { rows: [...unlocked, ...visibleLocked, ...hiddenLocked], unlocked, locked };
}

export default function Achievements({ game, bind, onClose }) {
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(0);
  const [err, setErr] = useState('');
  const selRef = useRef(sel);
  selRef.current = sel;

  useEffect(() => {
    window.gjallar.achievementsPublic(game.appid).then((d) => {
      setData(d);
    }).catch((e) => { setErr(e.message); });
  }, [game.appid]);

  const { rows, unlocked } = buildRows(data?.list || []);
  const total = data?.total ?? 0;
  const unlockedCount = data?.unlocked ?? 0;
  const hasError = !!data?.error || err;
  const empty = !hasError && (!data?.list || data.list.length === 0);

  useEffect(() => {
    // Keep selection in bounds.
    if (rows.length > 0 && selRef.current >= rows.length) setSel(rows.length - 1);
    if (rows.length > 0 && selRef.current < 0) setSel(0);
  }, [rows.length]);

  useEffect(() => {
    // Scroll the selected row into view.
    const node = document.getElementById(`ach-row-${sel}`);
    if (node) node.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  bind((btn) => {
    if (btn === 'b') return onClose();
    if (rows.length === 0 || hasError || empty) return;
    if (btn === 'up') setSel((s) => Math.max(0, s - 1));
    if (btn === 'down') setSel((s) => Math.min(rows.length - 1, s + 1));
    if (btn === 'lb') setSel((s) => Math.max(0, s - 10));
    if (btn === 'rb') setSel((s) => Math.min(rows.length - 1, s + 10));
  });

  const row = rows[sel];
  const pct = total > 0 ? unlockedCount / total : 0;

  return (
    <motion.div
      className="couch-page inst-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="couch-page-bg">
        <Img srcs={game.hero} alt="" className="ken" />
      </div>
      <div className="inst-card" style={{ maxWidth: 640, maxHeight: "88vh" }}>
        <div className="eyebrow">Achievements</div>
        <h1 className="h-title">Achievements — {game.title}</h1>

        {/* Progress summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Medal size={20} style={{ color: 'var(--gold)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 15 }}>{unlockedCount} of {total}</span>
            <div className="inst-bar" style={{ marginTop: 6, height: 8 }}>
              <i style={{ width: `${Math.round(pct * 100)}%`, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* Achievement list */}
        {hasError || empty ? (
          <div className="fr-err" style={{ padding: '16px 0' }}>
            {data?.error || err || 'No achievements available (the profile may be private)'}
          </div>
        ) : rows.length === 0 ? (
          <div className="fr-err">No achievements available (the profile may be private)</div>
        ) : (
          <div className="inst-sec" style={{ marginTop: 8, overflowY: "auto", flex: 1, minHeight: 0 }}>
            {rows.map((a, i) => {
              const isUnlocked = a.unlocked;
              return (
                <div
                  key={a.id}
                  id={`ach-row-${i}`}
                  className={`inst-lib ${i === sel ? 'on' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div style={{ flexShrink: 0 }}>
                    {isUnlocked ? (
                      <Img srcs={[a.icon]} alt="" style={{ width: 48, height: 48, borderRadius: 6 }} />
                    ) : (
                      <Img
                        srcs={[a.icon]}
                        alt=""
                        fallback={
                          <div style={{ width: 48, height: 48, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Medal size={22} style={{ opacity: 0.25 }} />
                          </div>
                        }
                        style={{ width: 48, height: 48, borderRadius: 6, filter: 'grayscale(1) brightness(0.6)' }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: isUnlocked ? 'var(--ink)' : 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.name || 'Hidden achievement'}
                    </div>
                    {a.desc && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.desc}
                      </div>
                    )}
                  </div>
                  <div className="muted" style={{ flexShrink: 0, textAlign: 'right', fontSize: 12, minWidth: 60 }}>
                    {isUnlocked ? (
                      <>
                        <div>{fmtDate(a.unlockTime)}</div>
                      </>
                    ) : a.percent != null ? (
                      <>
                        <div style={{ opacity: 0.7 }}>{a.percent.toFixed(1)}%</div>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Hint bar */}
        {!hasError && !empty && rows.length > 0 && (
          <div className="inst-hint">
            <b className="btn-glyph up">↑</b><b className="btn-glyph down" style={{ marginLeft: 8 }}>↓</b> Navigate{' '}
            <b className="btn-glyph lb" style={{ marginLeft: 8 }}>LB</b><b className="btn-glyph rb">RB</b> Jump 10{' '}
            <b className="btn-glyph b" style={{ marginLeft: 16 }}>B</b>Close
          </div>
        )}
      </div>
    </motion.div>
  );
}
