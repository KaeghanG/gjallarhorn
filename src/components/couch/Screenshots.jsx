import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';


// Full-screen controller-friendly screenshot gallery.
export default function Screenshots({ items, onClose, bind }) {
  const [selected, setSelected] = useState(0);
  const [viewing, setViewing] = useState(false);
  const gridRef = useRef(null);

  // Keep the selected thumbnail in view when it changes.
  useEffect(() => {
    if (gridRef.current?.children[selected]) {
      gridRef.current.children[selected].scrollIntoView({ block: 'nearest' });
    }
  }, [selected]);

  // The couch-mode input router calls this for every button press while the gallery is open.
  bind((btn) => {
    const cols = 5;
    if (viewing) {
      if (btn === 'b' || btn === 'a') setViewing(false);
      else if (btn === 'left' || btn === 'l') setSelected((s) => Math.max(0, s - 1));
      else if (btn === 'right') setSelected((s) => Math.min(items.length - 1, s + 1));
      return;
    }
    if (btn === 'b') return onClose();
    if (btn === 'a' && items.length > 0) setViewing(true);
    if (btn === 'left') setSelected((s) => Math.max(0, s - 1));
    if (btn === 'right') setSelected((s) => Math.min(items.length - 1, s + 1));
    if (btn === 'up') setSelected((s) => (s - cols >= 0 ? s - cols : s));
    if (btn === 'down') setSelected((s) => (s + cols < items.length ? s + cols : items.length - 1));
  });

  return (
    <motion.div
      className="couch-gallery"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <style>{`
        .couch-gallery {
          position: fixed; inset: 0; z-index: 999;
          background: #04050c; color: #e8e8f0;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .couch-gallery-header {
          padding: 20px 28px 12px;
          font-size: 18px; font-weight: 600; letter-spacing: 0.5px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .couch-gallery-grid {
          flex: 1; overflow-y: auto; padding: 20px 28px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 14px; align-content: start;
        }
        .couch-gallery-grid::-webkit-scrollbar { width: 6px; }
        .couch-gallery-grid::-webkit-scrollbar-track { background: transparent; }
        .couch-gallery-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        .couch-gallery-thumb {
          aspect-ratio: 16/9; border-radius: 14px; overflow: hidden; cursor: pointer;
          background: #12142a; position: relative;
          transition: box-shadow 0.2s;
        }
        .couch-gallery-thumb.on { outline: 2px solid #3cf2b0; outline-offset: 2px; }
        .couch-gallery-thumb img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .couch-gallery-fullscreen {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(4,5,12,0.97);
          display: flex; align-items: center; justify-content: center; flex-direction: column;
        }
        .couch-gallery-fullscreen img {
          max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 12px;
        }
        .couch-gallery-date {
          margin-top: 14px; color: #9a9ab0; font-size: 14px;
        }
        .couch-gallery-empty {
          flex: 1; display: flex; align-items: center; justify-content: center;
          color: #6a6a80; font-size: 20px;
        }
      `}</style>

      {viewing ? (
        <div className="couch-gallery-fullscreen">
          {items[selected]?.video ? <video src={items[selected].url} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 12 }} /> : <img src={items[selected]?.url} alt={items[selected]?.name || ''} />}
          <div className="couch-gallery-date">
            {items[selected]?.name}{items[selected]?.mtime && ` · ${new Date(items[selected].mtime).toLocaleString()}`}
          </div>
        </div>
      ) : null}

      <div className="couch-gallery-header">Screenshots &amp; clips</div>
      {items.length === 0 ? (
        <div className="couch-gallery-empty">Nothing yet. Use the screenshot or clip item in the Back + Start menu</div>
      ) : (
        <div className="couch-gallery-grid" ref={gridRef}>
          {items.map((item, i) => (
            <div key={`${item.file || item.url}-${i}`} className={`couch-gallery-thumb ${i === selected ? 'on' : ''}`}>
              {item.video ? <video src={`${item.url}#t=1`} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <img src={item.url} alt={item.name || ''} loading="lazy" />}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
