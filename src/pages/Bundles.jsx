import { useState } from "react";
import { motion } from 'framer-motion';
import { Gift, ExternalLink, BookOpen, Code2, Gamepad2, RefreshCw } from 'lucide-react';
import { PageHead, TiltCard, Img, Skeletons, Empty, stagger, useAsync } from '../components/ui.jsx';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: Gift },
  { key: 'games', label: 'Games', icon: Gamepad2 },
  { key: 'books', label: 'Books', icon: BookOpen },
  { key: 'software', label: 'Software', icon: Code2 },
];

export default function Bundles() {
  const { loading, data, error, reload } = useAsync(() => window.gjallar.humbleBundles(), []);
  const [filter, setFilter] = useState("all");
  const shown = (data || []).filter((b) => filter === "all" || b.category === filter);

  const categories = CATEGORIES.map((c) => ({
    ...c,
    count:
      c.key === 'all'
        ? data?.length ?? 0
        : data?.filter((b) => b.category === c.key).length ?? 0,
  }));

  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.key, categories.find((x) => x.key === c.key)?.count ?? 0]));

  return (
    <>
      <PageHead eyebrow="Humble Bundle" title="Bundles" sub="Pay what you want. Support indie devs and charities at the same time.">
        {loading ? null : (
          <button className="btn" onClick={reload} title="Refresh">
            <RefreshCw size={16} />
          </button>
        )}
      </PageHead>

      <div className="chips" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {categories.map((c) => {
          const on = c.key === filter;
          return (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={'chip' + (on ? ' on' : '')}
              style={{ opacity: loading ? 0.4 : 1, pointerEvents: loading ? 'none' : undefined }}
            >
              <c.icon size={14} />
              {c.label}
              <span style={{ marginLeft: 4, opacity: 0.6 }}>
                ({counts[c.key]})
              </span>
            </button>
          );
        })}
      </div>

      {loading && <Skeletons n={9} h={300} className="grid wide" />}
      <motion.div className="grid wide" variants={stagger} initial="hidden" animate="show" key={filter + (loading ? 1 : 0)}>

        {error && !loading && (
          <Empty rune="ᚺ" title="Failed to load bundles">
            {String(error)}
            {' '}
            <button className="btn" onClick={reload}>Retry</button>
          </Empty>
        )}

        {!loading && !error && data?.length === 0 && (
          <Empty rune="ᚺ" title="No bundles found">
            Check back when Humble has new deals.
          </Empty>
        )}

        {shown.map((bundle) => (
          <TiltCard
            key={bundle.id}
            className="card bundle-card"
            onClick={() => window.gjallar.open(bundle.url)}
            style={{ cursor: 'pointer' }}
          >
            <div className="media">
              {bundle.image && <Img srcs={[bundle.image]} alt={bundle.title} />}
            </div>
            <div className="body">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {bundle.pwyw && (
                  <span className="tag gold">Pay what you want</span>
                )}
                {bundle.items && (
                  <span className="tag">{bundle.items} items</span>
                )}
              </div>
              <div className="title">{bundle.title}</div>
              {bundle.blurb && <div className="blurb">{bundle.blurb}</div>}
              <div className="meta">
                {bundle.value && (
                  <>
                    <span className="value">{bundle.value}</span>
                    <small style={{ color: 'var(--muted)', fontSize: 12 }}>value</small>
                  </>
                )}
                <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
              </div>
            </div>
          </TiltCard>
        ))}
      </motion.div>
    </>
  );
}
