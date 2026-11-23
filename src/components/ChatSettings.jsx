import React, { useEffect, useState, useCallback } from 'react';

const PRIMARY_BTN = { background: 'var(--gold)', color: '#1d1405', fontWeight: 700 };

export default function ChatSettings() {
  const [status, setStatus] = useState(null);          // 'off' | 'qr' | 'connecting' | 'online' | 'error'
  const [qr, setQr] = useState(null);                    // data: URL
  const [error, setError] = useState(null);              // string or null

  // Load status on mount, subscribe to event changes.
  useEffect(() => {
    let unsub = null;

    async function boot() {
      try {
        const s = await window.gjallar.chat.status();
        setStatus(s.status);
        setQr(s.qr || null);
        setError(s.error || null);
      } catch (e) {
        setError(e.message || String(e));
        setStatus('error');
      }

      unsub = window.gjallar.chat.onEvent?.((ev) => {
        if (ev.type === 'status') {
          // ev: { type: 'status', status: string }
          // qr and error are also present on the event object when relevant
          setStatus(ev.status);
          setQr(ev.qr || null);
          setError(ev.error || null);
        }
      });
    }

    boot();

    return () => { unsub?.(); };
  }, []);

  const go = useCallback(async (fn, successStatus) => {
    setError(null);
    try {
      const s = await fn();
      setStatus(s.status);
      setQr(s.qr || null);
      setError(s.error || null);
      if (successStatus && s.status === successStatus) return;
    } catch (e) {
      setError(e.message || String(e));
      setStatus('error');
    }
  }, []);

  const isActionable = status === 'off' || status === 'error';
  const isQr = status === 'qr';
  const isConnected = status === 'online';
  const isConnecting = status === 'connecting';

  return (
    <div className="glass" style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Steam chat &amp; friends</h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 18, lineHeight: 1.5, fontSize: 13.5 }}>
        Chat with friends, accept friend requests and game invites inside Gjallarhorn. You log in once by scanning a QR code with the Steam mobile app; your password is never seen or stored.
      </p>

      {error && <div style={{ color: '#ff5d73', marginBottom: 12 }}>{error}</div>}

      {isQr && (
        <>
          <img src={qr} alt="QR login code" width={240} height={240}
            style={{ background: '#fff', borderRadius: 12, display: 'block', marginBottom: 12 }} />
          <p className="muted">Open the Steam mobile app &rarr; Steam Guard &rarr; Scan a QR code, then approve.</p>
        </>
      )}

      {isConnecting && <p style={{ color: 'var(--ink-2)' }}>Connecting&hellip;</p>}

      {isConnected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Connected
          </span>
          <button className="btn" onClick={() => go(window.gjallar.chat.disconnect, 'off')}>Disconnect</button>
          <span className="muted" style={{ fontSize: 12 }}>This also forgets the saved login.</span>
        </div>
      )}

      {isActionable && (
        <button className="btn primary" onClick={() => go(window.gjallar.chat.connect, 'qr')}
          style={PRIMARY_BTN}>Connect</button>
      )}
    </div>
  );
}
