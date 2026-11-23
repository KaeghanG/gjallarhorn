import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, FolderOpen, Trash2, Clock } from 'lucide-react';
import { PageHead, SectionHead, Empty, useAsync, useToast, Progress } from '../components/ui.jsx';
import { bytes } from '../api.js';

const SRC = { steam: 'blue', epic: '', custom: 'violet', riot: 'red', gog: 'violet', ubisoft: 'blue', battlenet: 'blue', ea: 'red', shortcut: 'violet' };
const SRC_LABEL = { steam: 'Steam', epic: 'Epic', custom: 'Custom', riot: 'Riot', gog: 'GOG', ubisoft: 'Ubisoft', battlenet: 'Battle.net', ea: 'EA', shortcut: 'Steam shortcut' };
const SORT_BY = ['size', 'name', 'lastPlayed'];

function formatRelative(ms) {
  if (!ms || ms === 0) return 'Never';
  const diff = Date.now() - ms;
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'Today';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y${months % 12 ? ` ${months % 12}mo` : ''} ago`;
}

export default function Storage({ library, refreshLibrary }) {
  const toast = useToast();
  const [sort, setSort] = useState('size');
  const { data: storage, loading } = useAsync(() => window.gjallar.storage(), []);
  const drives = storage?.drives || [];
  const games = storage?.games || [];

  const totalSize = useMemo(() => games.reduce((s, g) => s + (g.sizeBytes || 0), 0), [games]);
  const staleGames = useMemo(
    () => games.filter((g) => {
      const lp = g.lastPlayed || 0;
      return lp === 0 ? (g.sizeBytes || 0) > 1_073_741_824 : Date.now() - lp > 180 * 86400000;
    }),
    [games],
  );
  const staleSize = useMemo(() => staleGames.reduce((s, g) => s + (g.sizeBytes || 0), 0), [staleGames]);

  const sorted = useMemo(() => {
    return [...games].sort((a, b) => {
      if (sort === 'size') return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      if (sort === 'name') return a.name.localeCompare(b.name);
      return ((b.lastPlayed || 0) - (a.lastPlayed || 0)) || a.name.localeCompare(b.name);
    });
  }, [games, sort]);

  const handleUninstall = async (g) => {
    const custom = g.source === 'custom';
    if (!confirm(custom ? `"${g.name}" is a custom game: Gjallarhorn will open its folder so you can delete it yourself. Continue?` : `Uninstall "${g.name}"?`)) return;
    toast({ kind: 'info', title: custom ? 'Opening folder' : 'Uninstaller', body: custom ? g.dir : `Opening ${SRC_LABEL[g.source] || 'launcher'} uninstaller…` });
    try { await window.gjallar.uninstallGame(g); } catch (_) {}
    setTimeout(() => refreshLibrary(), 5000);
  };

  return (
    <>
      <PageHead eyebrow="Storage" title="Storage" sub="See what's taking space and clear out games you don't play." />

      {/* Summary */}
      {totalSize > 0 && (
        <div className="glass" style={{ padding: '18px 22px', marginBottom: 24, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted">Total library:</span>
          <b>{bytes(totalSize)}</b>
          {staleGames.length > 0 && (
            <>
              <span style={{ width: 1, height: 24, background: 'var(--line)' }} />
              <span className="tag warn"><Clock size={11} />{staleGames.length} game{staleGames.length > 1 ? 's' : ''} unplayed 6+mo</span>
              <span className="muted">would free up to </span>
              <b style={{ color: 'var(--ok)' }}>{bytes(staleSize)}</b>
            </>
          )}
        </div>
      )}

      {/* Drive cards */}
      {drives.length > 0 && (
        <>
          <SectionHead rune="ᛞ" title="Drives" />
          <div className="grid wide" style={{ marginBottom: 36 }}>
            {drives.map((d) => {
              const usedPct = d.totalBytes ? (d.totalBytes - d.freeBytes) / d.totalBytes : 0;
              const freePct = 1 - usedPct;
              const lowSpace = freePct < 0.1;
              return (
                <motion.div key={d.root} className="glass" style={{ padding: 22 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <HardDrive size={20} color="var(--gold)" />
                    <b style={{ fontSize: 18 }}>{d.root}</b>
                    <span className="muted" style={{ fontSize: 13 }}>{bytes(d.totalBytes)}</span>
                  </div>
                  <Progress value={usedPct} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                    <span className="muted">{bytes(d.freeBytes)} free</span>
                    <span style={{ color: lowSpace ? 'var(--bad)' : 'inherit', fontWeight: lowSpace ? 700 : 400 }}>{Math.round(freePct * 100)}%</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Games table */}
      {games.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <SectionHead rune="ᚷ" title="Games" />
          <div className="toolbar" style={{ marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
            {SORT_BY.map((s) => (
              <button key={s} className={`chip ${sort === s ? 'on' : ''}`} onClick={() => setSort(s)}>
                {s === 'size' ? 'Size' : s === 'name' ? 'Name' : 'Last played'}
              </button>
            ))}
          </div>
          <motion.div className="glass" style={{ padding: 6 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {sorted.map((g, i) => {
              const lp = g.lastPlayed || 0;
              const stale = lp === 0 ? (g.sizeBytes || 0) > 1_073_741_824 : Date.now() - lp > 180 * 86400000;
              return (
                <div key={g.key} className="price-row" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'default' }}>
                  <span className="name" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.name}
                    {stale && <span className="tag warn" style={{ marginLeft: 8 }}><Clock size={10} />Not played in 6+ months</span>}
                  </span>
                  <span className={`tag ${SRC[g.source] || ''}`}>{SRC_LABEL[g.source] || g.source}</span>
                  <span className="muted" style={{ width: 90, textAlign: 'right', fontSize: 13 }}>{bytes(g.sizeBytes)}</span>
                  <span className="muted" style={{ width: 80, textAlign: 'right', fontSize: 12 }}>
                    <Clock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />{formatRelative(lp)}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {g.dir && (
                      <button className="btn sm" title="Open folder" onClick={() => window.gjallar.showPath(g.dir)}>
                        <FolderOpen size={13} />
                      </button>
                    )}
                    <button className="btn sm danger" title="Uninstall" onClick={() => handleUninstall(g)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      )}

      {loading && <div className="skeleton" style={{ height: 200 }} />}
      {!loading && games.length === 0 && (
        <Empty rune="ᛊ" title="No games detected">
          Scan your library first from the Library page.
        </Empty>
      )}
    </>
  );
}
