import { useState, useEffect, useMemo } from 'react';
import { NAV } from './Shell.jsx';
import { Img } from './ui.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Play, Store, ArrowRight, CornerDownLeft } from 'lucide-react';

const HIGHLIGHT = 'linear-gradient(90deg, rgba(240,200,105,.16), transparent)';

export default function CommandPalette({ open, onClose, games, onNavigate, onOpenStore, onSearchStore }) {
  const [query, setQuery] = useState('');
  const [idx, setIdx] = useState(0);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const gameRows = useMemo(() => {
    return games
      .filter(g => words.every(w => g.name.toLowerCase().includes(w)))
      .slice(0, 6)
      .map((g, i) => ({ type: 'game', game: g, i }));
  }, [games, words]);

  const pageRows = useMemo(() => {
    if (words.length > 0) {
      return NAV.filter(n => n.label.toLowerCase().includes(words[0]))
        .slice(0, 6)
        .map((n, i) => ({ type: 'page', nav: n, i }));
    }
    return NAV.map((n, i) => ({ type: 'page', nav: n, i }));
  }, [words]);

  const storeRow = words.length > 0 ? [{ type: 'store', query }] : [];

  const allRows = [...gameRows, ...pageRows, ...storeRow];
  const totalRows = allRows.length;

  useEffect(() => {
    if (open) { setQuery(''); setIdx(0); }
  }, [open]);

  function run(row) {
    if (row.type === 'game') {
      window.gjallar.launchGame(row.game);
      onClose();
    } else if (row.type === 'page') {
      onNavigate(row.nav.id);
      onClose();
    } else if (row.type === 'store') {
      onSearchStore(row.query);
      onClose();
    }
  }

  function handleKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIdx(prev => (prev + 1) % totalRows);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIdx(prev => (prev - 1 + totalRows) % totalRows);
    } else if (e.key === 'Enter' && idx < totalRows) {
      e.preventDefault();
      run(allRows[idx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="scrim" style={{ alignItems: 'flex-start', paddingTop: '14vh' }} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="glass"
            style={{ width: 640, borderRadius: 20, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                <input
                  autoFocus
                  placeholder="Search games, pages, actions…"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setIdx(0); }}
                  onKeyDown={handleKey}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--ink)', fontSize: 16, fontFamily: 'inherit',
                  }}
                />
                <CornerDownLeft size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              </div>
            </div>

            {totalRows > 0 && (
              <div style={{ padding: '8px 0' }}>
                {gameRows.length > 0 && (
                  <>
                    <div style={{ padding: '6px 20px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Games</div>
                    {gameRows.map((row, i) => (
                      <motion.div
                        key={row.game.key}
                        className="cmd-row"
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', border: 'none', background: idx === i ? HIGHLIGHT : 'transparent',
                          color: 'var(--ink)', fontSize: 14, cursor: 'pointer', transition: 'background .1s',
                        }}
                        onClick={() => run(row)}
                        onHoverStart={() => setIdx(i)}
                      >
                        <Play size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                        <span style={{ flex: 1, textAlign: 'left' }}>Play {row.game.name}</span>
                        <button
                          className="btn sm"
                          style={{ fontSize: 11, padding: '2px 8px', color: 'var(--gold)', background: 'transparent', border: '1px solid var(--line)' }}
                          onClick={e => { e.stopPropagation(); onOpenStore({ steamAppID: row.game.appid, title: row.game.name }); onClose(); }}
                        >
                          Store page
                        </button>
                      </motion.div>
                    ))}
                  </>
                )}

                {pageRows.length > 0 && (
                  <>
                    <div style={{ padding: '6px 20px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Pages</div>
                    {pageRows.map((row, i) => {
                      const globalI = gameRows.length + i;
                      return (
                        <motion.div
                          key={row.nav.id}
                          className="cmd-row"
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', border: 'none', background: idx === globalI ? HIGHLIGHT : 'transparent',
                            color: 'var(--ink)', fontSize: 14, cursor: 'pointer', transition: 'background .1s',
                          }}
                          onClick={() => run(row)}
                          onHoverStart={() => setIdx(globalI)}
                        >
                          {row.nav.icon && <row.nav.icon size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />}
                          <span>{row.nav.label}</span>
                          <ArrowRight size={14} style={{ color: 'var(--muted)', marginLeft: 'auto', flexShrink: 0 }} />
                        </motion.div>
                      );
                    })}
                  </>
                )}

                {storeRow.length > 0 && (
                  <>
                    <div style={{ padding: '6px 20px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Store</div>
                    {storeRow.map((row, i) => {
                      const globalI = gameRows.length + pageRows.length + i;
                      return (
                        <motion.div
                          key="store"
                          className="cmd-row"
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', border: 'none', background: idx === globalI ? HIGHLIGHT : 'transparent',
                            color: 'var(--ink)', fontSize: 14, cursor: 'pointer', transition: 'background .1s',
                          }}
                          onClick={() => run(row)}
                          onHoverStart={() => setIdx(globalI)}
                        >
                          <Store size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                          <span>Search every store for "{row.query}"</span>
                          <ArrowRight size={14} style={{ color: 'var(--muted)', marginLeft: 'auto', flexShrink: 0 }} />
                        </motion.div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            <div style={{ padding: '10px 20px', fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--line)' }}>
              ↑↓ to move · Enter to open · Esc to close · Ctrl+K anytime
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
