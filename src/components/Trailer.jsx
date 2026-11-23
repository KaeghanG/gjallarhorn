import React, { useEffect, useRef, useState } from 'react';
import { steamDetails } from '../api.js';

// Game info + trailer straight from Steam's official store API (appdetails): no AI, no scraping.
// Steam serves trailers as HLS/DASH streams; hls.js (bundled) plays HLS inside Electron.
const cache = new Map();
export async function gameInfo(appid) {
  if (!appid) return null;
  if (!cache.has(appid)) {
    cache.set(appid, steamDetails(appid).then((d) => {
      if (!d) return null;
      const movies = d.movies || [];
      const m = movies.find((x) => x.highlight && x.hls_h264) || movies.find((x) => x.hls_h264) || null;
      return {
        name: d.name,
        bio: String(d.short_description || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
        genres: (d.genres || []).map((g) => g.description),
        developer: d.developers?.[0] || null,
        released: d.release_date?.date || null,
        metacritic: d.metacritic?.score || null,
        trailer: m ? { hls: m.hls_h264, poster: m.thumbnail, name: m.name } : null,
        categories: (d.categories || []).map((c) => c.description), // e.g. "Co-op", "Full controller support"
      };
    }).catch(() => null));
  }
  return cache.get(appid);
}

// Muted, looping trailer that fades in once it actually starts playing (until then the parent's artwork shows).
export function TrailerVideo({ src, poster, delay = 0, className, style, muted = true }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  // React doesn't update the `muted` attribute after mount, so set the property directly.
  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);
  useEffect(() => {
    setReady(false);
    if (!src) return;
    const video = ref.current;
    let hls = null, dead = false;
    const t = setTimeout(async () => {
      // hls.js is ~500 KB: load it only when a trailer actually plays.
      const Hls = (await import('hls.js')).default;
      if (dead) return;
      if (Hls.isSupported()) {
        // Cap quality: previews don't need 4K, and this keeps bandwidth/GPU use low.
        hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 20, startLevel: -1 });
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
      }
      video.play().catch(() => {});
    }, delay);
    return () => { dead = true; clearTimeout(t); try { hls?.destroy(); } catch {} video.removeAttribute('src'); video.load(); };
  }, [src, delay]);
  if (!src) return null;
  return (
    <video ref={ref} className={className} poster={poster} muted loop playsInline autoPlay
      onPlaying={() => setReady(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: ready ? 1 : 0, transition: 'opacity .8s ease', ...style }} />
  );
}

// Bio block: description + facts. Used in the desktop game sheet and couch mode.
export function GameBio({ info, large }) {
  if (!info) return null;
  return (
    <div style={{ maxWidth: large ? 720 : 640 }}>
      {info.bio && <p style={{ margin: '10px 0 10px', fontSize: large ? 17 : 14, lineHeight: 1.6, color: 'var(--ink-2)', textShadow: '0 2px 12px rgba(0,0,0,.8)', display: '-webkit-box', WebkitLineClamp: large ? 2 : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{info.bio}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {info.genres.slice(0, 4).map((g) => <span key={g} className="tag" style={{ background: 'rgba(4,6,13,.6)' }}>{g}</span>)}
        {info.developer && <span className="tag" style={{ background: 'rgba(4,6,13,.6)' }}>{info.developer}</span>}
        {info.released && <span className="tag" style={{ background: 'rgba(4,6,13,.6)' }}>{info.released}</span>}
        {info.metacritic && <span className="tag gold">Metacritic {info.metacritic}</span>}
      </div>
    </div>
  );
}
