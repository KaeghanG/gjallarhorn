import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, RotateCcw, Power, LogOut, X, AlertTriangle } from 'lucide-react';

// Power menu: sleep / restart / shut down (with a confirm step), exit couch mode, cancel.
const OPTIONS = [
  { key: 'sleep', label: 'Sleep', icon: Moon, ask: 'Put the PC to sleep?' },
  { key: 'restart', label: 'Restart', icon: RotateCcw, ask: 'Restart the PC?' },
  { key: 'shutdown', label: 'Shut down', icon: Power, ask: 'Shut down the PC?' },
  { key: 'exit', label: 'Exit couch mode', icon: LogOut },
  { key: 'cancel', label: 'Cancel', icon: X },
];

export default function PowerMenu({ bind, onClose }) {
  const [sel, setSel] = useState(0);
  const [confirm, setConfirm] = useState(null); // option being confirmed
  const [yes, setYes] = useState(false);        // confirm cursor: false = No (default), true = Yes
  const [err, setErr] = useState('');

  const run = async (key) => {
    setErr('');
    try { await window.gjallar.power(key); onClose(); } catch (e) { setErr(e.message || String(e)); }
  };

  bind((btn) => {
    if (btn === 'b') { if (confirm) { setConfirm(null); return; } return onClose(); }
    if (confirm) {
      if (btn === 'left' || btn === 'right') setYes(btn === 'left');
      if (btn === 'a') { if (yes) run(confirm.key); else setConfirm(null); }
      return;
    }
    if (btn === 'up') setSel((s) => Math.max(0, s - 1));
    if (btn === 'down') setSel((s) => Math.min(OPTIONS.length - 1, s + 1));
    if (btn === 'a') {
      const o = OPTIONS[sel];
      if (o.key === 'cancel') onClose();
      else if (o.key === 'exit') onClose({ exit: true });
      else { setConfirm(o); setYes(false); }
    }
  });

  return (
    <motion.div className="couch-page inst-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <div className="couch-page-bg" style={{ background: 'rgba(0,0,0,.6)' }} />
      <div className="inst-card" style={{ maxWidth: 420 }}>
        <div className="eyebrow">System</div>
        {confirm ? (
          <>
            <h1 className="h-title" style={{ fontSize: 26 }}><AlertTriangle size={22} style={{ verticalAlign: -3, marginRight: 8 }} />{confirm.ask}</h1>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div className={`inst-lib ${yes ? 'on' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => run(confirm.key)}><b>Yes</b></div>
              <div className={`inst-lib ${!yes ? 'on' : ''}`} style={{ flex: 1, justifyContent: 'center' }} onClick={() => setConfirm(null)}><b>No</b></div>
            </div>
            <div className="inst-hint"><b className="btn-glyph a">A</b>Choose<b className="btn-glyph b" style={{ marginLeft: 16 }}>B</b>Back</div>
          </>
        ) : (
          <>
            <h1 className="h-title" style={{ fontSize: 30 }}>Power</h1>
            {OPTIONS.map((o, i) => (
              <div key={o.key} className={`inst-lib ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>
                <o.icon size={22} /><div className="grow"><b>{o.label}</b></div>
              </div>
            ))}
            <div className="inst-hint"><b className="btn-glyph a">A</b>Select<b className="btn-glyph b" style={{ marginLeft: 16 }}>B</b>Close</div>
          </>
        )}
        {err && <div className="fr-err">{err}</div>}
      </div>
    </motion.div>
  );
}
