import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PageHead } from '../components/ui.jsx';
import { Users, Send, Check, X, Play, ExternalLink, Search, LogOut, MessageCircle } from 'lucide-react';

// Desktop Steam friends: list, presence, chat, invites. Uses the same Steam chat session as couch mode.
const dotClass = (f) => (f.appid ? 'game' : f.state === 1 ? 'on' : f.state >= 2 ? 'away' : 'off');
const sub = (f) => (f.invite ? 'Wants to be friends' : f.appid ? `Playing ${f.game || 'a game'}` : f.stateName);
const order = (a, b) => (b.appid ? 1 : 0) - (a.appid ? 1 : 0) || (b.state > 0 ? 1 : 0) - (a.state > 0 ? 1 : 0) || a.name.localeCompare(b.name);

export default function Friends() {
  const [st, setSt] = useState({ status: 'off' });
  const [data, setData] = useState({ friends: [], invites: [] });
  const [selId, setSelId] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const end = useRef(null);

  const refresh = useCallback(() => window.gjallar.chat.friends().then(setData).catch(() => {}), []);
  const loadHistory = useCallback((id) => window.gjallar.chat.history(id).then(setMsgs).catch(() => setMsgs([])), []);

  useEffect(() => {
    window.gjallar.chat.status().then((s) => { setSt(s); if (s.status === 'online') refresh(); }).catch(() => {});
    return window.gjallar.chat.onEvent((ev) => {
      if (ev.type === 'status') { setSt(ev.status); if (ev.status.status === 'online') refresh(); }
      if (ev.type === 'friends' || ev.type === 'invite' || ev.type === 'message') refresh();
    });
  }, [refresh]);
  useEffect(() => { const t = setInterval(() => { if (st.status === 'online') refresh(); }, 30000); return () => clearInterval(t); }, [st.status, refresh]);
  useEffect(() => window.gjallar.chat.onEvent((ev) => { if (ev.type === 'message' && ev.id === selId) loadHistory(selId); }), [selId, loadHistory]);
  useEffect(() => { if (selId) loadHistory(selId); else setMsgs([]); }, [selId, loadHistory]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  const filtered = data.friends.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).sort(order);
  const online = filtered.filter((f) => f.state > 0 || f.appid);
  const offline = filtered.filter((f) => !(f.state > 0 || f.appid));
  const cur = data.friends.find((f) => f.id === selId);

  const send = async (e) => {
    e?.preventDefault();
    const t = draft.trim();
    if (!t || !cur) return;
    setDraft(''); setErr('');
    try { await window.gjallar.chat.send(cur.id, t); loadHistory(cur.id); } catch (x) { setErr(x.message || String(x)); }
  };
  const row = (f) => (
    <div key={f.id} className={`fp-row ${f.id === selId ? 'on' : ''}`} onClick={() => setSelId(f.id)}>
      {f.avatar ? <img src={f.avatar} alt="" className={`fp-av ${dotClass(f)}`} /> : <span className={`fp-av ${dotClass(f)}`} />}
      <div className="fp-txt"><b>{f.name}</b><small>{sub(f)}</small></div>
      {f.unread > 0 && <span className="fp-badge">{f.unread}</span>}
    </div>
  );

  if (st.status !== 'online') {
    return (
      <div className="page">
        <PageHead eyebrow="Steam" title="Friends" sub="Chat with your Steam friends and join their games." />
        <div className="fp-connect">
          {st.status === 'qr' && st.qr ? (
            <><img src={st.qr} alt="Steam login QR code" className="fp-qr" /><p>Scan this with the Steam mobile app to sign in.<br /><span className="muted">Approve the request, and your friends appear here.</span></p></>
          ) : st.status === 'connecting' ? <p>Connecting to Steam…</p> : (
            <>
              <p>Sign in once with the Steam mobile app to chat with your friends from Gjallarhorn.</p>
              {st.error && <p className="fr-err">{st.error}</p>}
              <button className="btn aurora lg" onClick={() => window.gjallar.chat.connect().then(setSt).catch((e) => setErr(e.message))}>Connect Steam chat</button>
              {err && <p className="fr-err">{err}</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page fp-page">
      <div className="fp-list">
        <div className="fp-head">
          <h1 className="h-title" style={{ fontSize: 26, margin: 0 }}><Users size={22} style={{ verticalAlign: -3, marginRight: 8 }} />Friends</h1>
          <button className="btn sm" title="Sign out of Steam chat" onClick={() => window.gjallar.chat.disconnect().then(() => { setData({ friends: [], invites: [] }); setSt({ status: 'off' }); })}><LogOut size={13} /></button>
        </div>
        <div className="fp-search"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" /></div>
        <div className="fp-scroll">
          {data.invites.length > 0 && <div className="fp-sec">Friend requests</div>}
          {data.invites.map((f) => (
            <div key={f.id} className="fp-row">
              {f.avatar ? <img src={f.avatar} alt="" className="fp-av" /> : <span className="fp-av" />}
              <div className="fp-txt"><b>{f.name}</b><small>Wants to be friends</small></div>
              <button className="btn sm gold" onClick={() => window.gjallar.chat.accept(f.id).then(refresh)}><Check size={13} /></button>
              <button className="btn sm" onClick={() => window.gjallar.chat.decline(f.id).then(refresh)}><X size={13} /></button>
            </div>
          ))}
          <div className="fp-sec">Online · {online.length}</div>
          {online.map(row)}
          <div className="fp-sec">Offline · {offline.length}</div>
          {offline.map(row)}
          {!data.friends.length && <div className="muted" style={{ padding: 16 }}>No friends loaded yet…</div>}
        </div>
      </div>
      <div className="fp-chat">
        {cur ? (
          <>
            <div className="fp-who">
              {cur.avatar ? <img src={cur.avatar} alt="" className={`fp-av big ${dotClass(cur)}`} /> : <span className={`fp-av big ${dotClass(cur)}`} />}
              <div className="fp-txt"><h2>{cur.name}</h2><small>{sub(cur)}{cur.presence ? ` · ${cur.presence}` : ''}</small></div>
              <div className="fp-acts">
                {cur.joinable && <button className="btn sm gold" onClick={() => window.gjallar.chat.join(cur.id).catch((e) => setErr(e.message))}><Play size={12} fill="currentColor" />Join game</button>}
                <button className="btn sm" onClick={() => window.gjallar.chat.openSteam(cur.id)}><ExternalLink size={12} />Steam profile</button>
              </div>
            </div>
            <div className="fp-msgs">
              {msgs.length === 0 && <div className="muted" style={{ margin: 'auto' }}>No messages yet. Say hi.</div>}
              {msgs.map((m, i) => (
                <div key={i} className={`fp-msg ${m.mine || m.me || m.from === 'me' ? 'me' : 'them'}`} style={m.invite ? { display: 'flex', flexDirection: 'column', gap: 8 } : undefined}>
                  <span>{m.text || m.message}</span>
                  {m.invite && (
                    <button className="btn sm gold" onClick={() => {
                      window.gjallar.chat.join(cur.id).catch((e) => setErr(e.message));
                      window.gjallar.chat.dismissInvite(cur.id).catch(() => {});
                    }}>
                      <Play size={12} fill="currentColor" />Accept &amp; join
                    </button>
                  )}
                </div>
              ))}
              <div ref={end} />
            </div>
            {err && <div className="fr-err" style={{ padding: '0 16px' }}>{err}</div>}
            <form className="fp-compose" onSubmit={send}>
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Message ${cur.name}`} autoFocus />
              <button className="btn aurora" type="submit" disabled={!draft.trim()}><Send size={14} />Send</button>
            </form>
          </>
        ) : (
          <div className="fp-empty"><MessageCircle size={40} /><p>Pick a friend to chat.</p></div>
        )}
      </div>
    </div>
  );
}
