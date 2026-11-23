import React, { useEffect, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';

// Desktop Downloads: Steam games that are downloading, queued or waiting for an update.
const fmt = (b) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${Math.round(b / 1e6)} MB` : `${Math.round((b || 0) / 1e3)} KB`);
const PHASE = { downloading: 'Downloading', queued: 'Queued', paused: 'Paused', done: 'Done' };

export default function DownloadsPage() {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    const tick = () => window.gjallar.dlMgr.list().then((l) => setRows(Array.isArray(l) ? l : [])).catch(() => setRows([]));
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="page">
      <h1 className="h-title"><Download size={26} style={{ verticalAlign: -4, marginRight: 10 }} />Downloads</h1>
      <div style={{ margin: '12px 0 18px' }}><button className="btn sm" onClick={() => window.gjallar.dlMgr.open()}><ExternalLink size={13} />Open Steam's download manager (pause / resume)</button></div>
      {rows && !rows.length && <div className="muted">Nothing is downloading.</div>}
      <div style={{ display: 'grid', gap: 10, maxWidth: 820 }}>
        {(rows || []).map((r) => (
          <div key={r.appid} className="glass" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <b>{r.name}</b>
              <span className="muted">{PHASE[r.phase] || r.phase}{r.bytesPerSec ? ` · ${fmt(r.bytesPerSec)}/s` : ''}</span>
            </div>
            <div className="inst-bar" style={{ marginTop: 8, height: 8 }}><i style={{ width: `${Math.round((r.percent || 0) * 100)}%` }} /></div>
            <small className="muted">{fmt(r.downloaded)} of {fmt(r.total)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
