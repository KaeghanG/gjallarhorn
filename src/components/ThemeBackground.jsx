import React, { useEffect, useRef } from 'react';

// Custom animated backgrounds: fire, embers, image/video, colour gradient. 'aurora' (default) is the original Sky, drawn elsewhere.
function useFire(ref, mode, accent, reduce) {
  useEffect(() => {
    if (mode !== 'fire' && mode !== 'embers') return undefined;
    const c = ref.current;
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0, h = 0, raf, parts = [];
    const resize = () => { w = c.width = Math.floor(innerWidth * dpr); h = c.height = Math.floor(innerHeight * dpr); };
    resize(); addEventListener('resize', resize);
    const spawnFire = () => {
      const n = Math.ceil(w / 40);
      for (let i = 0; i < n; i++) {
        const x = Math.random() * w;
        // taller flames in the middle of the screen for a natural shape
        const mid = 1 - Math.abs(x / w - 0.5) * 1.3;
        parts.push({ x, y: h + 10, vx: (Math.random() - 0.5) * 1.2 * dpr, vy: -(2 + Math.random() * 4) * dpr * (0.6 + mid), life: 1, decay: 0.008 + Math.random() * 0.012, r: (14 + Math.random() * 34) * dpr * (0.5 + mid) });
      }
    };
    const spawnEmber = () => {
      if (Math.random() < 0.5) parts.push({ x: Math.random() * w, y: h + 10, vx: (Math.random() - 0.3) * 1.5 * dpr, vy: -(0.6 + Math.random() * 2) * dpr, life: 1, decay: 0.002 + Math.random() * 0.004, r: (1 + Math.random() * 3) * dpr, ember: true });
    };
    const draw = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = mode === 'fire' ? 'rgba(6,2,2,0.34)' : 'rgba(4,5,10,0.22)';
      ctx.fillRect(0, 0, w, h);
      if (mode === 'fire') spawnFire(); else spawnEmber();
      ctx.globalCompositeOperation = 'lighter';
      parts = parts.filter((p) => p.life > 0 && p.y > -50);
      for (const p of parts) {
        p.x += p.vx + Math.sin((p.y + p.x) * 0.01) * 0.6 * dpr; p.y += p.vy; p.life -= p.decay;
        if (p.ember) {
          ctx.fillStyle = `rgba(255,${150 + Math.round(p.life * 90)},60,${p.life})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        } else {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          const l = p.life;
          g.addColorStop(0, `rgba(255,${Math.round(110 + 70 * l)},${Math.round(10 * l)},${0.07 * l})`);
          g.addColorStop(0.5, `rgba(240,${Math.round(60 * l)},10,${0.05 * l})`);
          g.addColorStop(1, 'rgba(120,10,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        }
      }
      if (parts.length > 2600) parts.splice(0, parts.length - 2600);
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }, [ref, mode, accent, reduce]);
}

const isVideo = (u) => /\.(mp4|webm|mkv|mov)(\?|$)/i.test(u || '');
const fileUrl = (p) => (!p ? '' : /^(https?:|file:|data:)/i.test(p) ? p : `file:///${p.replace(/\\/g, '/')}`);

export default function ThemeBackground({ settings }) {
  const mode = settings?.bgMode || 'aurora';
  const ref = useRef(null);
  useFire(ref, mode, settings?.accent, settings?.reduceMotion);
  if (mode === 'aurora') return null;
  const dim = Math.max(0, Math.min(0.85, Number(settings?.bgDim) || 0));
  const url = fileUrl(settings?.bgImage);
  return (
    <div className="theme-bg" style={mode === 'color' ? { background: `linear-gradient(160deg, ${settings?.bgColor1 || '#0b1024'}, ${settings?.bgColor2 || '#04060d'})` } : { background: '#050206' }}>
      {(mode === 'fire' || mode === 'embers') && <canvas ref={ref} />}
      {mode === 'image' && url && (isVideo(url)
        ? <video src={url} autoPlay loop muted playsInline />
        : <img src={url} alt="" />)}
      <div className="theme-dim" style={{ opacity: dim }} />
    </div>
  );
}
