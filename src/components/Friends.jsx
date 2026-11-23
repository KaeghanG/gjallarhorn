import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Copy, Download, Trash2, Sparkles } from 'lucide-react';
import { SectionHead, Img, useToast, stagger, rise } from './ui.jsx';
import { gamesByIds, money, steamImg } from '../api.js';

// Share code = "GJW1." + base64url(deflate(JSON)). No server: paste it in Discord.
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function encode(obj) {
  const stream = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return 'GJW1.' + b64u(await new Response(stream).arrayBuffer());
}
async function decode(code) {
  const m = code.trim().match(/GJW1\.([A-Za-z0-9_-]+)/);
  if (!m) throw new Error("That isn't a Gjallarhorn share code");
  const stream = new Blob([unb64u(m[1])]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const obj = JSON.parse(await new Response(stream).text());
  if (!Array.isArray(obj.items)) throw new Error('Share code is damaged');
  return obj;
}

export default function Friends({ settings, saveSettings, openGame }) {
  const toast = useToast();
  const [paste, setPaste] = useState('');
  const [prices, setPrices] = useState({});
  const mine = settings?.wishlist || [];
  const friends = settings?.friends || [];
  const name = settings?.profileName || '';
  const mineIds = new Set(mine.map((w) => w.gameID));

  useEffect(() => {
    const ids = [...new Set(friends.flatMap((f) => f.items.map((i) => i.gameID)))].filter((id) => !prices[id]).slice(0, 25);
    if (!ids.length) return;
    gamesByIds(ids).then((r) => setPrices((p) => ({ ...p, ...Object.fromEntries(Object.entries(r).map(([id, g]) => [id, Math.min(...g.deals.map((d) => Number(d.price)))])) }))).catch(() => {});
  }, [friends.length]);

  const share = async () => {
    if (!name.trim()) return toast({ kind: 'bad', title: 'Set your name first', body: 'So friends know whose list it is.' });
    const code = await encode({ name: name.trim(), at: Date.now(), items: mine.map(({ gameID, title, steamAppID }) => ({ gameID, title, steamAppID })) });
    await navigator.clipboard.writeText(code);
    toast({ kind: 'ok', title: 'Share code copied', body: `Paste it to your friends: ${mine.length} games, ${code.length} characters.` });
  };
  const importCode = async () => {
    try {
      const f = await decode(paste);
      const next = [...friends.filter((x) => x.name !== f.name), { name: f.name, items: f.items, importedAt: Date.now() }];
      await saveSettings({ friends: next });
      setPaste('');
      toast({ kind: 'ok', title: `Added ${f.name}'s wishlist`, body: `${f.items.length} games, ${f.items.filter((i) => mineIds.has(i.gameID)).length} in common with yours.` });
    } catch (e) { toast({ kind: 'bad', title: 'Could not import', body: e.message }); }
  };

  return (
    <div className="section">
      <SectionHead rune="ᚹ" title="Friends' wishlists" />
      <div className="glass" style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Share yours</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Your name" defaultValue={name} onBlur={(e) => saveSettings({ profileName: e.target.value })} />
            <button className="btn gold" onClick={share} disabled={!mine.length}><Copy size={15} />Copy share code</button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Send the code on Discord. Re-share any time your list changes.</p>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Add a friend's</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" style={{ flex: 1 }} placeholder="Paste a GJW1… code" value={paste} onChange={(e) => setPaste(e.target.value)} />
            <button className="btn" onClick={importCode} disabled={!paste.trim()}><Download size={15} />Import</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {friends.map((f) => {
          const common = f.items.filter((i) => mineIds.has(i.gameID));
          return (
            <motion.div key={f.name} className="glass" style={{ padding: 20, marginTop: 16 }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div className="emu-badge" style={{ '--accent': '#a86bff', width: 40, height: 40, fontSize: 15, borderRadius: 12 }}>{f.name.slice(0, 2).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>{f.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{f.items.length} games · imported {new Date(f.importedAt).toLocaleDateString()}</div>
                </div>
                {common.length > 0 && <span className="tag gold"><Sparkles size={11} />{common.length} in common: co-op night?</span>}
                <button className="btn sm ghost danger" onClick={() => saveSettings({ friends: friends.filter((x) => x.name !== f.name) })}><Trash2 size={13} /></button>
              </div>
              <motion.div className="row-scroll" style={{ gridAutoColumns: 220 }} variants={stagger} initial="hidden" animate="show">
                {[...f.items].sort((a, b) => mineIds.has(b.gameID) - mineIds.has(a.gameID)).map((i) => (
                  <motion.div key={i.gameID} variants={rise} className="card" onClick={() => openGame(i)} whileHover={{ y: -4 }}>
                    <div className="media"><Img srcs={[i.steamAppID && steamImg.header(i.steamAppID)]} alt="" fallback={<div className="cover-fallback" style={{ position: 'absolute', inset: 0, fontSize: 14, padding: 12, display: 'flex', alignItems: 'flex-end' }}>{i.title}</div>} /></div>
                    <div className="body" style={{ padding: '10px 12px 12px' }}>
                      <div className="title" style={{ fontSize: 13 }}>{i.title}</div>
                      <div className="meta" style={{ marginTop: 6 }}>
                        <b>{prices[i.gameID] != null ? money(prices[i.gameID]) : '…'}</b>
                        {mineIds.has(i.gameID) && <span className="tag gold"><Users size={10} />both</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
