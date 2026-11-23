import React, { useEffect, useState } from 'react';

const PRIMARY_BTN = { background: '#5865F2', color: '#fff', fontWeight: 700 };

export default function DiscordSettings() {
  const [cfg, setCfg] = useState(null); // { enabled, clientId, ready }
  const [draftId, setDraftId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.gjallar.discordGet().then((c) => { setCfg(c); setDraftId(c.clientId || ''); }).catch(() => setCfg({ enabled: false, clientId: '', ready: false }));
    const t = setInterval(() => window.gjallar.discordGet().then(setCfg).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, []);

  if (!cfg) return null;

  const toggle = async (enabled) => {
    const c = await window.gjallar.discordSet({ enabled, clientId: draftId.trim() });
    setCfg(c);
  };
  const saveId = async () => {
    const c = await window.gjallar.discordSet({ clientId: draftId.trim() });
    setCfg(c);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="glass" style={{ padding: 24 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>Discord Rich Presence</h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 14, lineHeight: 1.5, fontSize: 13.5 }}>
        Shows what you're playing on your Discord profile ("Playing Elden Ring &middot; via Gjallarhorn"), the same way Spotify and most
        games do. This is Discord's own local status feature: it only sets your status, and never reads your friends, servers or messages.
        No Discord login needed &mdash; it just talks to the Discord app running on this PC.
      </p>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Discord application ID (one-time setup, free)</div>
        <ol className="muted" style={{ fontSize: 12.5, lineHeight: 1.7, margin: '0 0 10px', paddingLeft: 18 }}>
          <li>Open <a href="#" onClick={(e) => { e.preventDefault(); window.gjallar.open('https://discord.com/developers/applications'); }}>discord.com/developers/applications</a> (sign in with your normal Discord account)</li>
          <li>Click <b>New Application</b>, name it anything (e.g. "Gjallarhorn"), create it</li>
          <li>Copy the <b>Application ID</b> shown on the General Information page and paste it below</li>
        </ol>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" style={{ flex: 1, fontFamily: 'monospace' }} placeholder="Application ID"
            value={draftId} onChange={(e) => setDraftId(e.target.value.replace(/\D/g, ''))} />
          <button className="btn" onClick={saveId} disabled={!draftId.trim()}>{saved ? 'Saved' : 'Save ID'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.enabled && cfg.ready ? '#22c55e' : cfg.enabled ? '#f59e0b' : '#6b7280', display: 'inline-block' }} />
          {cfg.enabled ? (cfg.ready ? 'Connected to Discord' : 'Waiting for Discord to open...') : 'Off'}
        </span>
        {cfg.enabled
          ? <button className="btn" onClick={() => toggle(false)}>Turn off</button>
          : <button className="btn primary" style={PRIMARY_BTN} onClick={() => toggle(true)} disabled={!draftId.trim()}>Turn on</button>}
        {!draftId.trim() && !cfg.enabled && <span className="muted" style={{ fontSize: 12 }}>Paste an application ID first.</span>}
      </div>
    </div>
  );
}
