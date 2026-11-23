import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Img } from '../ui.jsx';

const SECTION_CAP = 30;

export default function ActivityFeed({ bind, onClose }) {
  const [friends, setFriends] = useState(null);
  const [sel, setSel] = useState(0);
  const [err, setErr] = useState('');
  const selRef = useRef(sel);
  selRef.current = sel;

  useEffect(() => {
    const poll = () => {
      window.gjallar.chat.friends().then((d) => {
        setFriends(d);
        // clamp selection if the list shrank
        const total = countAll(d);
        if (selRef.current >= total) setSel(Math.max(0, total - 1));
      }).catch((e) => setErr(e.message));
    };
    poll();
    const t = setInterval(poll, 10_000);
    return () => clearInterval(t);
  }, []);

  bind((btn) => {
    if (btn === 'b') return onClose();
    if (!friends || friends.friends.length === 0) return;
    const total = countAll(friends);
    if (btn === 'up') setSel((s) => Math.max(0, s - 1));
    if (btn === 'down') setSel((s) => Math.min(total - 1, s + 1));
    if (btn === 'a') handleA(friends, selRef.current);
  });

  const sections = buildSections(friends);
  const flatRows = flattenRows(sections);
  const row = flatRows[sel] ?? null;

  return (
    <motion.div className="couch-page qa-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
      <div className="couch-page-bg" style={{ background: 'linear-gradient(135deg, #0a0f1a, #0d1326)' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
        <h1 className="h-title" style={{ marginBottom: 4 }}>Activity Feed</h1>
        {friends && friends.friends.length > 0 && (
          <div className="muted" style={{ marginBottom: 24 }}>
            {friends.friends.filter((f) => f.state > 0).length} friends online
          </div>
        )}

        {err && <div className="fr-err">{err}</div>}

        {!friends && !err && <div className="muted">Loading friends…</div>}

        {friends && friends.friends.length === 0 && !err && (
          <div className="muted" style={{ textAlign: 'center', marginTop: 60 }}>
            Connect Steam chat in Settings to see your friends
          </div>
        )}

        {flatRows.length > 0 && sections.map((sec, si) => (
          <Section key={si} name={sec.name} rows={sec.rows}>
            {sec.rows.map((friend, ri) => {
              const flatIdx = flatRows.findIndex((r) => r === friend);
              const isActive = flatIdx === sel;
              return (
                <motion.div
                  key={friend.id}
                  className={`fr-row ${isActive ? 'on' : ''}`}
                  ref={isActive ? (el) => el?.scrollIntoView({ block: 'nearest' }) : null}
                  onClick={() => setSel(flatIdx)}
                >
                  <Img srcs={[friend.avatar]} alt="" style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0 }} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{friend.name}</div>
                    {friend.game ? (
                      <div className="muted">Playing {friend.game}</div>
                    ) : (
                      <div className="muted" style={{ textTransform: 'capitalize' }}>{friend.stateName}</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </Section>
        ))}

        <div className="inst-hint" style={{ marginTop: 24 }}>
          <b className="btn-glyph a">A</b><span style={{ marginLeft: 4 }}>Open chat</span>{'  '}
          <b className="btn-glyph b">B</b><span style={{ marginLeft: 4 }}>Back</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── helpers ─────────────────────────────────────────────── */

function buildSections(friends) {
  if (!friends?.friends) return [];
  const playing = [];
  const online = [];
  const away = [];
  for (const f of friends.friends) {
    if (f.game) playing.push(f);
    else if (f.state === 2 || f.state === 3 || f.state === 4) away.push(f);
    else if (f.state === 1) online.push(f);
  }
  const sections = [];
  if (playing.length) sections.push({ name: 'Playing now', rows: playing.slice(0, SECTION_CAP) });
  if (online.length) sections.push({ name: 'Online', rows: online.slice(0, SECTION_CAP) });
  if (away.length) sections.push({ name: 'Away', rows: away.slice(0, SECTION_CAP) });
  return sections;
}

function flattenRows(sections) {
  const out = [];
  for (const sec of sections) for (const r of sec.rows) out.push(r);
  return out;
}

function countAll(friends) {
  if (!friends?.friends) return 0;
  let c = 0;
  const stateMap = {};
  for (const f of friends.friends) {
    let g = 'other';
    if (f.game) g = 'playing';
    else if (f.state === 2 || f.state === 3 || f.state === 4) g = 'away';
    else if (f.state === 1) g = 'online';
    const cap = 30;
    if (!(g in stateMap) || stateMap[g] < cap) { stateMap[g] = (stateMap[g] || 0) + 1; c++; }
  }
  return c;
}

function handleA(friends, idx) {
  const row = flattenRows(buildSections(friends))[idx];
  if (!row) return;
  window.gjallar.chat.openSteam(row.id).catch(() => {});
}

function Section({ name, rows, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>{name}</div>
      <div>{children}</div>
    </div>
  );
}
