import React, { useRef, useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

export const spring = { type: 'spring', stiffness: 260, damping: 26 };

// Staggered container + item for grids.
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
export const rise = {
  hidden: { opacity: 0, y: 24, scale: 0.97, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 220, damping: 24 } },
};

// 3D tilt card with a cursor-following shine. Usage: <TiltCard className="card ..." onClick>...</TiltCard>
export function TiltCard({ children, className = 'card', onClick, max = 8, style, ...rest }) {
  const ref = useRef(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 200, damping: 18 });
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    mx.set(x);
    my.set(y);
    ref.current.style.setProperty('--mx', `${x * 100}%`);
    ref.current.style.setProperty('--my', `${y * 100}%`);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };
  return (
    <motion.div
      ref={ref}
      variants={rise}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      whileHover={{ y: -6, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, ...style }}
      {...rest}
    >
      {children}
      <div className="shine" />
    </motion.div>
  );
}

// Image that falls back through a list of sources, then renders `fallback`.
export function Img({ srcs, alt = '', fallback = null, className, style, ...rest }) {
  const list = (Array.isArray(srcs) ? srcs : [srcs]).filter(Boolean);
  const [i, setI] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState(null);
  useEffect(() => { setI(0); }, [list.join('|')]);
  if (i >= list.length) return fallback;
  const loaded = loadedSrc === list[i];
  return (
    <img
      src={list[i]}
      alt={alt}
      className={className}
      loading="lazy"
      draggable={false}
      onError={() => setI((n) => n + 1)}
      onLoad={(e) => setLoadedSrc(e.currentTarget.getAttribute('src'))}
      style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity .5s ease' }}
      {...rest}
    />
  );
}

export function SectionHead({ rune = 'ᚷ', title, children }) {
  return (
    <div className="section-head">
      <span className="rune">{rune}</span>
      <h2>{title}</h2>
      <div className="line" />
      {children}
    </div>
  );
}

export function PageHead({ eyebrow, title, sub, children }) {
  return (
    <motion.div className="page-head" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="h-title">{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10 }}>{children}</div>}
    </motion.div>
  );
}

export function Skeletons({ n = 8, h = 220, className = 'grid' }) {
  return (
    <div className={className}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: h }} />
      ))}
    </div>
  );
}

export function Empty({ rune = 'ᛟ', title, children }) {
  return (
    <div className="empty">
      <div className="rune-big">{rune}</div>
      <h3 style={{ color: 'var(--ink)', margin: '10px 0 6px' }}>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export function Switch({ on, onChange, disabled }) {
  return (
    <button className={`switch ${on ? 'on' : ''}`} disabled={disabled} onClick={(e) => { e.stopPropagation(); onChange(!on); }} aria-pressed={on}>
      <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 32 }} className="knob" />
    </button>
  );
}

export function Progress({ value }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.round((value || 0) * 100)}%` }} />
    </div>
  );
}

// ---------- Toasts ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, kind: 'info', ...t }]);
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), t.ms || 5000);
  }, []);
  const Icon = { ok: CheckCircle2, bad: CircleAlert, info: Info };
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        <AnimatePresence>
          {items.map((t) => {
            const I = Icon[t.kind] || Info;
            return (
              <motion.div key={t.id} className={`toast ${t.kind}`} layout
                initial={{ opacity: 0, x: 60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: 0.9 }} transition={spring}>
                <I size={18} color={t.kind === 'ok' ? 'var(--ok)' : t.kind === 'bad' ? 'var(--bad)' : 'var(--gold)'} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <b>{t.title}</b>
                  {t.body && <small>{t.body}</small>}
                </div>
                <X size={14} style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// Hook for async loading with error state.
export function useAsync(fn, deps = []) {
  const [state, set] = useState({ loading: true, data: null, error: null });
  const reload = useCallback(() => {
    set((s) => ({ ...s, loading: true, error: null }));
    return fn().then(
      (data) => set({ loading: false, data, error: null }),
      (error) => set({ loading: false, data: null, error: error.message || String(error) })
    );
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}
