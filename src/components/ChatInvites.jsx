import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UserPlus, Gamepad2, Check, X } from 'lucide-react';

// Desktop-app prompt for pending Steam friend requests and game invites (only appears when Steam chat is connected and something is waiting).
export default function ChatInvites() {
  const [inv, setInv] = useState({ requests: [], games: [] });
  const [err, setErr] = useState('');
  const load = useCallback(() => window.gjallar.chat.invites().then(setInv).catch(() => {}), []);
  useEffect(() => {
    load();
    return window.gjallar.chat.onEvent((ev) => { if (['invite', 'gameinvite', 'friends', 'status'].includes(ev.type)) load(); });
  }, [load]);

  const run = async (fn) => { setErr(''); try { await fn(); } catch (e) { setErr(e.message); } load(); };
  const items = [
    ...inv.games.map((g) => ({ id: 'g' + g.id, icon: Gamepad2, title: `${g.name} invited you to play`, yes: 'Join', no: 'Dismiss',
      // Join via the friend's current rich presence (live at click time), not a link captured when the invite arrived - that one can go stale.
      onYes: () => run(async () => { await window.gjallar.chat.join(g.id); await window.gjallar.chat.dismissInvite(g.id); }), onNo: () => run(() => window.gjallar.chat.dismissInvite(g.id)) })),
    ...inv.requests.map((r) => ({ id: 'r' + r.id, icon: UserPlus, title: `${r.name} sent you a friend request`, yes: 'Accept', no: 'Decline',
      onYes: () => run(() => window.gjallar.chat.accept(r.id)), onNo: () => run(() => window.gjallar.chat.decline(r.id)) })),
  ];
  if (!items.length) return null;
  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 70, display: 'flex', flexDirection: 'column', gap: 10, width: 340 }}>
      <AnimatePresence>
        {items.map((it) => {
          const Ico = it.icon;
          return (
            <motion.div key={it.id} className="glass" layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} style={{ padding: 14, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}><Ico size={18} />{it.title}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn primary" onClick={it.onYes}><Check size={15} />{it.yes}</button>
                <button className="btn" onClick={it.onNo}><X size={15} />{it.no}</button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {err && <div className="muted" style={{ color: '#ff8da1' }}>{err}</div>}
    </div>
  );
}
