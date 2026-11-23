import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageCircle, Play, Check, X, ExternalLink, Wifi, Keyboard, Send } from 'lucide-react';

// Steam friends, chat and friend invites for couch mode. Needs the user to connect once (QR login, see electron/lib/steamchat.cjs).
// The couch-mode input router calls bind()'s function for every button press while this screen is open.
const KEYS = ['1234567890', 'qwertyuiop', 'asdfghjkl\'', 'zxcvbnm,.?!'];
const SPECIAL = ['Space', 'Delete', 'Send', 'Cancel'];

export default function SteamFriends({ bind, onClose }) {
  const [st, setSt] = useState({ status: 'off' });
  const [data, setData] = useState({ friends: [], invites: [] });
  const [sel, setSel] = useState(0);            // index into the combined list (invites first)
  const [mode, setMode] = useState('list');     // list | chat | keys
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [kr, setKr] = useState({ r: 0, c: 0 });
  const [note, setNote] = useState('');
  const listRef = useRef(null);
  const chatEnd = useRef(null);
  const signOutArmed = useRef(false);

  const rows = [...data.invites.map((f) => ({ ...f, invite: true })), ...data.friends];
  const cur = rows[Math.min(sel, rows.length - 1)];

  const refresh = useCallback(() => window.gjallar.chat.friends().then(setData).catch(() => {}), []);
  useEffect(() => {
    window.gjallar.chat.status().then((s) => { setSt(s); if (s.status === 'online') refresh(); }).catch(() => {});
    return window.gjallar.chat.onEvent((ev) => {
      if (ev.type === 'status') { setSt(ev.status); if (ev.status.status === 'online') refresh(); }
      if (ev.type === 'friends' || ev.type === 'invite') refresh();
      if (ev.type === 'message') refresh();
    });
  }, [refresh]);
  // Reload the open conversation when a message arrives for it.
  const curId = cur?.id;
  useEffect(() => window.gjallar.chat.onEvent((ev) => { if (ev.type === 'message' && ev.id === curId && mode !== 'list') window.gjallar.chat.history(curId).then(setMsgs).catch(() => {}); }), [curId, mode]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'end' }); }, [msgs, mode]);
  useEffect(() => { listRef.current?.querySelector('.fr-row.on')?.scrollIntoView({ block: 'nearest' }); }, [sel, rows.length]);

  const flash = (m) => { setNote(m); setTimeout(() => setNote(''), 2600); };
  const openChat = async () => { if (!cur || cur.invite) return; setMode('chat'); setMsgs(await window.gjallar.chat.history(cur.id).catch(() => [])); };
  const sendDraft = async () => {
    const t = draft.trim();
    if (!t || !cur) { setMode('chat'); return; }
    setDraft(''); setMode('chat');
    try { await window.gjallar.chat.send(cur.id, t); setMsgs(await window.gjallar.chat.history(cur.id)); } catch (e) { flash(e.message); }
  };
  const typeKey = () => {
    const sp = kr.r === KEYS.length;
    if (sp) {
      const k = SPECIAL[kr.c];
      if (k === 'Space') setDraft((d) => d + ' ');
      if (k === 'Delete') setDraft((d) => d.slice(0, -1));
      if (k === 'Send') sendDraft();
      if (k === 'Cancel') setMode('chat');
    } else setDraft((d) => d + KEYS[kr.r][kr.c]);
  };

  bind((btn) => {
    if (st.status !== 'online') {
      if (btn === 'b') return onClose();
      if (btn === 'a' && st.status !== 'connecting' && st.status !== 'qr') window.gjallar.chat.connect().then(setSt).catch((e) => flash(e.message));
      return;
    }
    if (mode === 'keys') {
      const lastRow = KEYS.length;
      if (btn === 'b') return setMode('chat');
      if (btn === 'a') return typeKey();
      if (btn === 'x') return setDraft((d) => d.slice(0, -1));
      if (btn === 'y') return setDraft((d) => d + ' ');
      if (btn === 'start') return sendDraft();
      if (btn === 'up') setKr((k) => { const r = Math.max(0, k.r - 1); return { r, c: Math.min(k.c, (r === lastRow ? SPECIAL.length : KEYS[r].length) - 1) }; });
      if (btn === 'down') setKr((k) => { const r = Math.min(lastRow, k.r + 1); return { r, c: Math.min(k.c, (r === lastRow ? SPECIAL.length : KEYS[r].length) - 1) }; });
      if (btn === 'left') setKr((k) => ({ ...k, c: Math.max(0, k.c - 1) }));
      if (btn === 'right') setKr((k) => ({ ...k, c: Math.min((k.r === lastRow ? SPECIAL.length : KEYS[k.r].length) - 1, k.c + 1) }));
      return;
    }
    if (mode === 'chat') {
      if (btn === 'b' || btn === 'left') return setMode('list');
      if (btn === 'a' || btn === 'x') return setMode('keys');
      if (btn === 'y') {
        const inv = [...msgs].reverse().map((m) => m.from === 'them' && m.text.match(/steam:\/\/joinlobby\/\d+\/\d+\/\d+/)?.[0]).find(Boolean);
        if (inv) window.gjallar.open(inv).then(() => flash('Joining your friend…')).catch((e) => flash(e.message));
        else if (cur?.appid) window.gjallar.chat.join(cur.id).then(() => flash('Opening the game…')).catch((e) => flash(e.message));
      }
      return;
    }
    if (btn === 'b') return onClose();
    if (btn === 'start') {
      if (signOutArmed.current) { signOutArmed.current = false; window.gjallar.chat.disconnect().then(() => { flash('Signed out of Steam chat'); setData({ friends: [], invites: [] }); setSel(0); }).catch(() => {}); return; }
      signOutArmed.current = true; setTimeout(() => { signOutArmed.current = false; }, 3000); return flash('Press Start again to sign out of Steam chat');
    }
    if (btn === 'up') setSel((s) => Math.max(0, s - 1));
    if (btn === 'down') setSel((s) => Math.min(rows.length - 1, s + 1));
    if (!cur) return;
    if (cur.invite) {
      if (btn === 'a') window.gjallar.chat.accept(cur.id).then(() => flash(`You and ${cur.name} are now friends`)).catch((e) => flash(e.message));
      if (btn === 'x') window.gjallar.chat.decline(cur.id).then(() => flash('Request declined')).catch((e) => flash(e.message));
      return;
    }
    if (btn === 'a' || btn === 'right') openChat();
    if (btn === 'y' && cur.appid) window.gjallar.chat.join(cur.id).then(() => flash('Opening the game…')).catch((e) => flash(e.message));
    if (btn === 'x') window.gjallar.chat.openSteam(cur.id).catch(() => {});
  });

  const dot = (f) => (f.appid ? 'game' : f.state === 1 ? 'on' : f.state > 1 && f.state !== 7 ? 'away' : 'off');

  return (
    <motion.div className="couch-page fr-page" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <div className="fr-head"><Users size={28} /><h1 className="h-title">Friends</h1>
        <span className="muted">{st.status === 'online' ? `${data.friends.filter((f) => f.state > 0).length} online · ${data.friends.length} friends` : 'Steam chat'}</span>
        {note && <span className="fr-note">{note}</span>}
      </div>

      {st.status !== 'online' ? (
        <div className="fr-connect">
          {st.status === 'qr' && st.qr ? (
            <>
              <img src={st.qr} alt="Steam login QR code" className="fr-qr" />
              <div><h2>Scan with the Steam mobile app</h2><p className="muted">Steam app → the shield / Steam Guard tab → “Scan a QR code”, then approve. Gjallarhorn never sees your password.</p></div>
            </>
          ) : st.status === 'connecting' ? (
            <div><h2>Connecting to Steam…</h2></div>
          ) : (
            <div>
              <h2>Chat with your Steam friends</h2>
              <p className="muted">See who is online or in a game, read and send messages, accept friend requests and join games. You log in once by scanning a QR code with the Steam mobile app.</p>
              {st.error && <p className="fr-err">{st.error}</p>}
              <div className="fr-hint"><b className="btn-glyph a">A</b>Connect <b className="btn-glyph b" style={{ marginLeft: 16 }}>B</b>Back</div>
            </div>
          )}
        </div>
      ) : (
        <div className="fr-body">
          <div className="fr-list" ref={listRef}>
            {data.invites.length > 0 && <div className="fr-sec">Friend requests</div>}
            {rows.map((f, i) => (
              <React.Fragment key={(f.invite ? 'i' : 'f') + f.id}>
                {!f.invite && i === data.invites.length && <div className="fr-sec">Friends</div>}
                <div className={`fr-row ${i === Math.min(sel, rows.length - 1) ? 'on' : ''}`} onClick={() => { setSel(i); }}>
                  {f.avatar ? <img src={f.avatar} alt="" className={`fr-av ${dot(f)}`} /> : <span className={`fr-av ${dot(f)}`} />}
                  <div className="grow"><b>{f.name}</b><small>{f.invite ? 'Wants to be friends' : f.appid ? `Playing ${f.game}` : f.stateName}</small></div>
                  {f.unread > 0 && <span className="fr-badge">{f.unread}</span>}
                </div>
              </React.Fragment>
            ))}
            {!rows.length && <div className="muted" style={{ padding: 20 }}>No friends loaded yet…</div>}
          </div>

          <div className="fr-pane">
            {cur && (
              <>
                <div className="fr-who">
                  {cur.avatar && <img src={cur.avatar} alt="" className={`fr-av big ${dot(cur)}`} />}
                  <div><h2>{cur.name}</h2><span className="muted">{cur.invite ? 'Friend request' : cur.appid ? `Playing ${cur.game}${cur.presence ? ` · ${cur.presence}` : ''}` : cur.stateName}</span></div>
                </div>
                {mode === 'list' && (
                  <div className="fr-actions">
                    {cur.invite ? (
                      <><span><b className="btn-glyph a">A</b><Check size={16} /> Accept</span><span><b className="btn-glyph x">X</b><X size={16} /> Decline</span></>
                    ) : (
                      <><span><b className="btn-glyph a">A</b><MessageCircle size={16} /> Message</span>
                        {cur.appid && <span><b className="btn-glyph y">Y</b><Play size={16} /> Join game</span>}
                        <span><b className="btn-glyph x">X</b><ExternalLink size={16} /> Open in Steam</span></>
                    )}
                  </div>
                )}
                {mode !== 'list' && (
                  <div className="fr-chat">
                    <div className="fr-msgs">
                      {msgs.length === 0 && <div className="muted">No messages yet. Say hi!</div>}
                      {msgs.map((m, i) => <div key={i} className={`fr-msg ${m.from}`}>{m.text.replace(/steam:\/\/joinlobby\/\S+/, '🎮 Game invite')}</div>)}
                      <div ref={chatEnd} />
                    </div>
                    {mode === 'chat' && <div className="fr-actions"><span><b className="btn-glyph a">A</b><Keyboard size={16} /> Write a message</span>{(cur.appid || msgs.some((m) => /steam:\/\/joinlobby/.test(m.text))) && <span><b className="btn-glyph y">Y</b><Play size={16} /> Join game</span>}<span><b className="btn-glyph b">B</b>Back</span></div>}
                    {mode === 'keys' && (
                      <div className="fr-keys">
                        <div className="fr-draft">{draft || <span className="muted">Type a message…</span>}<i /></div>
                        {KEYS.map((row, r) => <div key={r} className="fr-keyrow">{[...row].map((ch, c) => <span key={c} className={kr.r === r && kr.c === c ? 'on' : ''} onClick={() => { setKr({ r, c }); setDraft((d) => d + ch); }}>{ch}</span>)}</div>)}
                        <div className="fr-keyrow wide">{SPECIAL.map((s, c) => <span key={s} className={kr.r === KEYS.length && kr.c === c ? 'on' : ''}>{s === 'Send' && <Send size={14} />} {s}</span>)}</div>
                        <div className="muted fr-kh"><b className="btn-glyph x">X</b>Delete <b className="btn-glyph y" style={{ marginLeft: 12 }}>Y</b>Space <b className="btn-glyph a" style={{ marginLeft: 12 }}>A</b>Type <b className="btn-glyph b" style={{ marginLeft: 12 }}>B</b>Close keys · Start sends</div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <div className="fr-foot"><Wifi size={14} /> {st.status === 'online' ? 'Connected to Steam · Start signs out' : 'Not connected'} · B closes</div>
    </motion.div>
  );
}
