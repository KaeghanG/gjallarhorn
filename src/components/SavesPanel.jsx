import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, History, FolderOpen, LoaderCircle, Clock } from 'lucide-react';
import { SectionHead, useToast } from './ui.jsx';
import { bytes } from '../api.js';

export const fmtPlaytime = (ms) => {
  const m = Math.round((ms || 0) / 60000);
  return m < 60 ? `${m} min` : `${(m / 60).toFixed(m < 600 ? 1 : 0)} h`;
};

export default function SavesPanel({ game }) {
  const toast = useToast();
  const [loc, setLoc] = useState(null);
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pt, setPt] = useState(null);

  const refresh = () => window.gjallar.saveList(game).then(setList);
  useEffect(() => {
    window.gjallar.saveLocations(game).then(setLoc, (e) => setLoc({ paths: [], error: e.message }));
    window.gjallar.playtime().then((p) => setPt(p[game.key] || null));
    refresh();
  }, [game.key]);

  const found = loc ? [...new Set(loc.paths.flatMap((p) => p.found))] : [];
  const backup = async () => {
    setBusy(true);
    try { const r = await window.gjallar.saveBackup(game); toast({ kind: 'ok', title: 'Saves backed up', body: r.dir }); refresh(); }
    catch (e) { toast({ kind: 'bad', title: 'Backup failed', body: e.message }); }
    setBusy(false);
  };
  const restore = async (b) => {
    if (!confirm(`Restore the backup from ${new Date(b.at).toLocaleString()}?\nYour current saves are backed up first, so this can be undone.`)) return;
    setBusy(true);
    try { const r = await window.gjallar.saveRestore(game, b.file); toast({ kind: 'ok', title: 'Saves restored', body: r.restoredTo }); refresh(); }
    catch (e) { toast({ kind: 'bad', title: 'Restore failed', body: e.message }); }
    setBusy(false);
  };

  return (
    <div style={{ marginBottom: 30 }}>
      <SectionHead rune="ᛒ" title="Saves & playtime" />
      <div className="opt-grid">
        <div className="panel">
          <h3><Clock size={14} /> Playtime in Gjallarhorn</h3>
          {pt ? (
            <div style={{ display: 'flex', gap: 28 }}>
              <div><div className="h-display" style={{ fontSize: 30 }}>{fmtPlaytime(pt.total)}</div><div className="muted" style={{ fontSize: 12 }}>total</div></div>
              <div><div className="h-display" style={{ fontSize: 30 }}>{pt.sessions}</div><div className="muted" style={{ fontSize: 12 }}>sessions</div></div>
              <div><div style={{ fontWeight: 800, marginTop: 8 }}>{new Date(pt.last).toLocaleDateString()}</div><div className="muted" style={{ fontSize: 12 }}>last played</div></div>
            </div>
          ) : <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Launch it from Gjallarhorn and playtime is tracked automatically.</p>}
          <h3 style={{ marginTop: 18 }}><Save size={14} /> Save location</h3>
          {!loc ? <div className="skeleton" style={{ height: 40 }} /> : found.length ? (
            found.map((f) => <div key={f} className="kv" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <code style={{ flex: 1, fontSize: 12, wordBreak: 'break-all', color: 'var(--ink-2)' }}>{f}</code>
              <button className="btn sm ghost" onClick={() => window.gjallar.showPath(f)}><FolderOpen size={13} /></button>
            </div>)
          ) : (
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
              {loc.paths.length ? `PCGamingWiki lists ${loc.paths[0].path}, but nothing is there yet (play once first, or the game uses cloud saves).` : loc.error || 'No save location known for this game.'}
            </p>
          )}
          <button className="btn gold" style={{ marginTop: 14 }} disabled={busy || !found.length} onClick={backup}>
            {busy ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}Back up now
          </button>
        </div>
        <div className="panel">
          <h3 style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><History size={14} /> Backups</span>
            {list?.dir && <button className="btn sm ghost" onClick={() => window.gjallar.showPath(list.dir)}><FolderOpen size={13} /></button>}
          </h3>
          {!list ? <div className="skeleton" style={{ height: 100 }} /> : !list.backups.length ? (
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>No backups yet. They're also made automatically when you quit a game you launched from here.</p>
          ) : list.backups.map((b, i) => (
            <motion.div key={b.file} className="price-row" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} style={{ cursor: 'default' }}>
              <span className="name" style={{ fontWeight: 600 }}>{new Date(b.at).toLocaleString()}{/before-restore/.test(b.name) && <span className="tag" style={{ marginLeft: 8 }}>before restore</span>}</span>
              <span className="muted" style={{ fontSize: 12 }}>{bytes(b.size)}</span>
              <button className="btn sm" disabled={busy} onClick={() => restore(b)}>Restore</button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
