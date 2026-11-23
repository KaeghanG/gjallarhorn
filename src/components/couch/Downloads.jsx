import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ExternalLink } from 'lucide-react';

// Format bytes as MB or GB with one decimal place.
const fmt = (b) => {
  if (b == null || b <= 0) return '—';
  return b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(1)} MB`;
};

// Format speed: bytes/s → KB/s or MB/s.
const fmtSpeed = (b) => {
  if (b == null || b <= 0) return '—';
  return b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB/s` : `${(b / 1e3).toFixed(1)} KB/s`;
};

const PHASE_ORDER = ['downloading', 'queued', 'paused'];
const DONE = 'done';

export default function Downloads({ bind, onClose }) {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(0);
  const [err, setErr] = useState('');
  const selRef = useRef(null);

  // Poll downloads list every 2 s; reset selection on refresh.
  useEffect(() => {
    const poll = async () => {
      try {
        const list = await window.gjallar.dlMgr.list();
        if (Array.isArray(list)) setItems(list);
      } catch (e) {
        setErr(e.message ?? 'Failed to fetch downloads');
      }
    };
    poll();
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, []);

  // Scroll selected row into view on selection change.
  useEffect(() => {
    if (selRef.current) selRef.current.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  // Group items by phase in the required order.
  const groups = {};
  for (const p of PHASE_ORDER) groups[p] = [];
  groups[DONE] = [];
  for (const it of items) {
    const p = it.phase == null ? DONE : it.phase;
    const key = PHASE_ORDER.includes(p) ? p : DONE;
    groups[key].push(it);
  }

  // Cap done rows at 5.
  if (groups[DONE].length > 5) groups[DONE] = groups[DONE].slice(0, 5);

  // Build visible group sections (skip empty).
  const visible = [];
  for (const p of [...PHASE_ORDER, DONE]) {
    if (groups[p].length === 0) continue;
    visible.push({ label: p.charAt(0).toUpperCase() + p.slice(1), items: groups[p], phase: p });
  }

  // Flatten into rows with index tracking.
  const rows = [];
  for (const g of visible) {
    for (const it of g.items) rows.push({ item: it, section: g.label, phase: g.phase });
  }

  // Summary stats.
  const downloading = items.filter((i) => i.phase === 'downloading').length;
  const queued = items.filter((i) => i.phase === 'queued').length;
  const paused = items.filter((i) => i.phase === 'paused').length;
  let totalSpeed = 0;
  for (const it of items) { if (it.bytesPerSec != null) totalSpeed += it.bytesPerSec; }

  const parts = [];
  if (downloading > 0) parts.push(`${downloading} downloading`);
  if (queued > 0) parts.push(`${queued} queued`);
  if (paused > 0) parts.push(`${paused} paused`);
  const summaryText = items.length === 0
    ? ''
    : `${parts.join(' · ')}${totalSpeed > 0 ? ` · ${fmtSpeed(totalSpeed)} total` : ''}`;

  // Row action handler (open / pause / resume) with error display.
  const runAction = async (item, action) => {
    setErr('');
    try {
      if (action === 'open') await window.gjallar.dlMgr.open(item.appid);
      else if (action === 'pause') await window.gjallar.dlMgr.pause(item.appid);
      else if (action === 'resume') await window.gjallar.dlMgr.resume(item.appid);
    } catch (e) { setErr(e.message ?? `Failed to ${action}`); }
  };

  // Input: bind() is called on every render so the handler always sees the current rows.
  bind((btn) => {
    if (btn === 'b') return onClose();
    if (btn === 'up') setSel((s) => Math.max(0, s - 1));
    if (btn === 'down') setSel((s) => Math.min(Math.max(0, rows.length - 1), s + 1));
    const cur = rows[Math.min(sel, rows.length - 1)]?.item;
    if (!cur) return undefined;
    if (btn === 'a') runAction(cur, 'open');
    if (btn === 'x') runAction(cur, cur.phase === 'paused' ? 'resume' : 'pause');
    return undefined;
  });

  // Phase display icon.
  const phaseIcon = (p) => (p === 'downloading' ? '↓' : p === 'queued' ? '○' : p === 'paused' ? '❚❚' : '✓');

  return (
    <motion.div className="couch-page inst-page" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <div className="couch-page-bg">
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,22,.7)' }} />
      </div>
      <div className="inst-card">
        <div className="eyebrow">{rows.length > 0 ? `${items.length} item${items.length > 1 ? 's' : ''}` : 'Downloads'}</div>
        <h1 className="h-title">Downloads</h1>
        {err && <div className="fr-err">{err}</div>}
        {summaryText && <div className="muted" style={{ marginBottom: 12 }}>{summaryText}</div>}

        {rows.length === 0 ? (
          <div className="muted" style={{ textAlign: 'center', padding: '32px 0' }}>Nothing downloading</div>
        ) : (
          visible.map((g) => (
            <React.Fragment key={g.phase}>
              {rows.length > 1 && g.items.length > 0 && <div className="inst-sec">{g.label}</div>}
              {g.items.map((it) => {
                const isDone = g.phase === DONE;
                // Compute flat row index for this item within visible rows.
                let idx = 0;
                for (const prev of visible) { if (prev === g) break; idx += prev.items.length; }
                idx += g.items.indexOf(it);
                return (
                  <div
                    key={it.appid}
                    ref={idx === sel ? selRef : null}
                    className={`inst-lib ${idx === sel ? 'on' : ''}`}
                    style={isDone ? { opacity: 0.45 } : undefined}
                  >
                    <Download size={18} />
                    <div className="grow">
                      <b style={{ display: 'block', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</b>
                      <small>{it.library || ''}</small>
                    </div>
                    <div className="inst-free">
                      <div className="inst-bar" style={{ width: 100, marginBottom: 4 }}>
                        <i style={it.percent != null ? { width: `${Math.round(it.percent * 100)}%` } : { width: '35%', animation: 'dlslide 1.4s ease-in-out infinite alternate' }} />
                      </div>
                      <small>{fmt(it.downloaded)} of {fmt(it.total)}</small>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 70 }}>
                      <div className={`btn-glyph ${isDone ? '' : it.phase}`} style={{ fontSize: 11, color: isDone ? 'var(--muted)' : 'var(--gold)', marginBottom: 2 }}>
                        {phaseIcon(it.phase)}
                      </div>
                      <small style={{ color: isDone ? 'var(--muted)' : undefined }}>
                        {isDone ? '' : fmtSpeed(it.bytesPerSec)}
                      </small>
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}

        <div className="inst-hint">
          {!rows.length ? '' : (
            <>
              <b className="btn-glyph a">A</b><ExternalLink size={15} /> Open in Steam
              {' · '}
              <b className="btn-glyph x">X</b>Pause / Resume
            </>
          )}
          <b className="btn-glyph b" style={{ marginLeft: 16 }}>B</b>Back
        </div>
      </div>
    </motion.div>
  );
}
