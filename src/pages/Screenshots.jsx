import React, { useEffect, useState } from 'react';
import { PageHead } from '../components/ui.jsx';
import { Camera, X, FolderOpen, Copy } from 'lucide-react';

function fmtDate(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleString();
}

export default function Screenshots() {
  const [shots, setShots] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const [a, b] = await Promise.all([window.gjallar.shotsList().catch(() => []), window.gjallar.clipsList().catch(() => [])]);
        const all = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].sort((x, y) => y.mtime - x.mtime);
        if (ok) setShots(all);
      } catch {
        if (ok) setShots([]);
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, []);

  const filters = ['all', 'kind:shot', 'kind:clip'];
  if (shots) {
    const map = new Map();
    for (const s of shots) {
      if (s.appid) map.set(s.appid, true);
    }
    map.forEach((_, key) => filters.push(key));
  }

  const filtered = filter === 'all' ? shots : filter === 'kind:shot' ? shots?.filter((s) => !s.video) || [] : filter === 'kind:clip' ? shots?.filter((s) => s.video) || [] : shots?.filter((s) => s.appid === filter) || [];

  const handleCopy = async (file) => {
    try { await window.gjallar.shotCopy(file); setCopied(file); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };

  const idx = lightbox ? (filtered || []).findIndex((s) => s.file === lightbox.file) : -1;
  // Keyboard: Esc to close lightbox, left/right arrows
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => {
      if (e.key === 'Escape') { setLightbox(null); return; }
      if (e.key === 'ArrowRight' && idx < filtered.length - 1 && idx >= 0) setLightbox(filtered[idx + 1]);
      if (e.key === 'ArrowLeft' && idx > 0) setLightbox(filtered[idx - 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, filtered, idx]);

  const thumbStyle = { aspectRatio: '16/9', objectFit: 'cover', borderRadius: 10, cursor: 'pointer', transition: 'transform 0.2s' };

  return (
    <div className="page">
      <PageHead eyebrow="Captures" title="Screenshots & clips" sub="Everything you captured in games, in one place." />

      {loading ? (
        <div className="muted">Loading screenshots…</div>
      ) : !shots.length ? (
        <div className="muted">Nothing here yet - use the screenshot or clip items in the Back+Start menu, Steam's F12, Game Bar (Win+Alt+R) or NVIDIA Instant Replay.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {filters.map((f) => (
              <button
                key={f}
                className={`btn sm${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
                style={{ background: filter === f ? 'var(--gold)' : undefined, color: filter === f ? '#111' : undefined }}
              >
                {f === 'all' ? 'All' : f === 'kind:shot' ? 'Screenshots' : f === 'kind:clip' ? 'Clips' : `App ${f}`}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12 }}>
            {filtered.map((s) => (
              <div key={s.file} style={{ borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,.04)', padding: 6 }} onClick={() => setLightbox(s)}>
                {s.video ? <div style={{ position: 'relative' }}><video src={`${s.url}#t=1`} preload="metadata" muted style={{ ...thumbStyle, width: '100%', display: 'block' }} /><span style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(0,0,0,.65)', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}>▶ clip</span></div> : <img src={s.url} alt={s.name || ''} style={thumbStyle} loading="lazy" />}
                <small className="muted" style={{ display: 'block', textAlign: 'center', marginTop: 4 }}>{s.game ? `${s.game} · ` : ''}{fmtDate(s.mtime)}</small>
              </div>
            ))}
          </div>
        </>
      )}

      {lightbox && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)' }} onClick={() => setLightbox(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            {lightbox.video ? <video src={lightbox.url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8 }} /> : <img src={lightbox.url} alt={lightbox.name || ''} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />}
            <div style={{ position: 'absolute', top: 6, right: 6 }}>
              <button className="btn sm" onClick={() => setLightbox(null)}><X size={16} /></button>
            </div>
            {idx > 0 && (
              <button className="btn sm" style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)' }} onClick={() => setLightbox(filtered[idx - 1])}>←</button>
            )}
            {idx < filtered.length - 1 && (
              <button className="btn sm" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }} onClick={() => setLightbox(filtered[idx + 1])}>→</button>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn sm" onClick={() => window.gjallar.shotReveal(lightbox.file)}><FolderOpen size={14} />Show in folder</button>
              {!lightbox.video && <button className="btn sm" onClick={() => handleCopy(lightbox.file)}>
                <Copy size={14} />{copied === lightbox.file ? 'Copied!' : 'Copy'}
              </button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
