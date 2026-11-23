import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Compass, Sparkles } from 'lucide-react';
import { Skeletons, Empty, stagger, TiltCard, Img } from './ui.jsx';

// "Find me a game": pick genres + mood/feature tags (e.g. RPG + Souls-like), Gjallarhorn asks Steam's own tag search for matches.
export default function GameFinder({ openGame, ownedAppids = [] }) {
  const [tags, setTags] = useState(null); // { genres, moods } from the main process
  const [picked, setPicked] = useState([]); // selected tag ids
  const [results, setResults] = useState(null); // null = not searched yet
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { window.gjallar.finderTags().then(setTags).catch(() => setTags({ genres: [], moods: [] })); }, []);

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const search = async () => {
    if (!picked.length) return;
    setLoading(true); setErr(''); setResults(null);
    try {
      const r = await window.gjallar.finderSearch(picked, ownedAppids);
      setResults(r);
    } catch (e) { setErr(e.message || String(e)); } finally { setLoading(false); }
  };

  const pickedLabels = useMemo(() => {
    const all = [...(tags?.genres || []), ...(tags?.moods || [])];
    return picked.map((id) => all.find((t) => t.id === id)?.label).filter(Boolean);
  }, [picked, tags]);

  if (!tags) return <Skeletons n={1} h={120} />;

  return (
    <>
      <div className="glass" style={{ padding: 20, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Compass size={18} />
          <h2 style={{ margin: 0, fontSize: 18 }}>Find me a game</h2>
        </div>
        <p className="muted" style={{ marginTop: 0, marginBottom: 14, fontSize: 13 }}>
          Pick a genre and any moods or features you're after &mdash; love Souls games? Pick RPG + Souls-like. Results come straight from Steam's own tags, so they're the real thing, not a guess.
        </p>

        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--muted)' }}>Genre</div>
        <div className="chips" style={{ marginBottom: 14 }}>
          {tags.genres.map((t) => (
            <button key={t.id} className={`chip ${picked.includes(t.id) ? 'on' : ''}`} onClick={() => toggle(t.id)}>{t.label}</button>
          ))}
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--muted)' }}>Mood &amp; features</div>
        <div className="chips" style={{ marginBottom: 16, maxHeight: 180, overflowY: 'auto' }}>
          {tags.moods.map((t) => (
            <button key={t.id} className={`chip ${picked.includes(t.id) ? 'on' : ''}`} onClick={() => toggle(t.id)}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn gold lg" disabled={!picked.length || loading} onClick={search}>
            <Sparkles size={16} />{loading ? 'Searching…' : 'Find games'}
          </button>
          {pickedLabels.length > 0 && <span className="muted" style={{ fontSize: 12.5 }}>{pickedLabels.join(' + ')}</span>}
          {picked.length > 0 && <button className="btn ghost" onClick={() => { setPicked([]); setResults(null); }}>Clear</button>}
        </div>
        {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
      </div>

      {loading && <Skeletons n={8} />}
      {!loading && results && (
        results.length === 0 ? (
          <Empty rune="ᚾ" title="No matches">Try fewer or different tags &mdash; very specific combinations can come up empty.</Empty>
        ) : (
          <motion.div className="grid" variants={stagger} initial="hidden" animate="show" key={picked.join(',')}>
            {results.map((g) => (
              <TiltCard key={g.appid || g.name} onClick={() => openGame({ steamAppID: g.appid, title: g.name, thumb: g.image })}>
                <div className="media"><Img srcs={[g.image]} alt="" /></div>
                <div className="body"><div className="title">{g.name}</div></div>
              </TiltCard>
            ))}
          </motion.div>
        )
      )}
    </>
  );
}
