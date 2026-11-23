import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Download, Power as PowerIcon, Play, Volume2, VolumeX, Sun, BellOff, Camera, Tv, Power, Moon, Wifi, BatteryFull, BatteryCharging, Clock, ChevronLeft, ChevronRight, X, UserPlus, Gamepad2 } from 'lucide-react';
import { usePadInput } from '../hooks/usePadInput.js';

// The in-game menu: hold the Guide/PS button while a game started from Gjallarhorn is running.
// Rendered in its own transparent always-on-top window over the game's monitor.
export default function Overlay() {
  const [open, setOpen] = useState(false);
  const [game, setGame] = useState('');
  const [noGame, setNoGame] = useState(false); // menu opened with no tracked game running
  const [i, setI] = useState(0);
  const [qs, setQs] = useState(null);
  const [bat, setBat] = useState(null);
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(new Date());
  const layoutRef = useRef({});
  useEffect(() => { if (open) window.gjallar.layoutCurrent().then((l) => { layoutRef.current = l || {}; }).catch(() => {}); }, [open]);
  const openedAt = useRef(0); // the Back+Start hold that opened the menu is still down: ignore buttons until it is released
  const [inv, setInv] = useState({ requests: [], games: [] }); // pending Steam friend requests + game invites

  const loadInv = () => window.gjallar.chat.invites().then(setInv).catch(() => {});
  useEffect(() => window.gjallar.chat.onEvent((ev) => { if (['invite', 'gameinvite', 'friends'].includes(ev.type)) loadInv(); }), []);
  useEffect(() => {
    const show = (d) => {
      openedAt.current = Date.now(); setGame(d.game); setNoGame(!!d.noGame); setOpen(true); setI(0); setConfirm(false); setMsg('');
      window.gjallar.qsGet().then(setQs).catch(() => {});
      loadInv();
    };
    const off = window.gjallar.onOverlayOpen(show);
    // This page loads lazily and can miss the push: ask whether the menu is already supposed to be open.
    window.gjallar.overlayState().then((d) => d && show(d)).catch(() => {});
    return off;
  }, []);
  useEffect(() => {
    navigator.getBattery?.().then((b) => { const u = () => setBat({ level: b.level, charging: b.charging }); u(); b.addEventListener('levelchange', u); b.addEventListener('chargingchange', u); });
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const act = (a) => window.gjallar.overlayAction(a).then((r) => { if (a === 'screenshot') setMsg(`Saved: ${String(r).split('\\').pop()}`); return r; }, (e) => setMsg(e.message));
  const adjust = async (kind, d) => {
    if (kind === 'vol') { await window.gjallar.qsVolume(d > 0 ? 'up' : 'down'); setMsg(d > 0 ? 'Volume up' : 'Volume down'); }
    if (kind === 'bri') { const v = await window.gjallar.qsBrightness(d * 10); if (v != null) { setQs((q) => ({ ...q, brightness: v })); setMsg(`Brightness ${v}%`); } else setMsg('Brightness can only be changed on the laptop screen'); }
  };

  const answer = async (fn, ok) => { try { await fn(); setMsg(ok); } catch (e) { setMsg(e.message); } loadInv(); };
  const inviteItems = [
    ...inv.games.map((g) => ({ id: 'gi-' + g.id, icon: Gamepad2, label: `Join ${g.name}'s game`, hint: 'A join · X dismiss', run: () => answer(async () => { await window.gjallar.open(g.join); await window.gjallar.chat.dismissInvite(g.id); }, 'Joining…'), alt: () => answer(() => window.gjallar.chat.dismissInvite(g.id), 'Invite dismissed') })),
    ...inv.requests.map((r) => ({ id: 'fr-' + r.id, icon: UserPlus, label: `Accept friend request: ${r.name}`, hint: 'A accept · X decline', run: () => answer(() => window.gjallar.chat.accept(r.id), `You and ${r.name} are now friends`), alt: () => answer(() => window.gjallar.chat.decline(r.id), 'Request declined') })),
  ];
  const items = [
    { id: 'resume', icon: Play, label: noGame ? 'Close menu' : 'Resume game', run: () => act('resume') },
    ...inviteItems,
    { id: 'couch', icon: Tv, label: 'Gjallarhorn home', run: () => act('couch') },
    { id: 'friends', icon: Users, label: 'Friends & chat', run: () => act('page:friends') },
    { id: 'dl', icon: Download, label: 'Downloads', run: () => act('page:downloads') },
    { id: 'vol', icon: Volume2, label: 'Volume', hint: '◀ ▶ adjust · A mute', adj: (d) => adjust('vol', d), run: async () => { await window.gjallar.qsVolume('mute'); setMsg('Mute toggled'); } },
    { id: 'bri', icon: Sun, label: 'Brightness', value: qs?.brightness != null ? `${qs.brightness}%` : '—', hint: '◀ ▶ adjust', adj: (d) => adjust('bri', d), run: () => {} },
    { id: 'dnd', icon: BellOff, label: 'Do Not Disturb', value: qs?.dnd ? 'On' : 'Off', run: async () => { const on = await window.gjallar.qsDnd(!qs?.dnd); setQs((q) => ({ ...q, dnd: on })); } },
    { id: 'shot', icon: Camera, label: 'Take screenshot', run: () => act('screenshot') },
    ...(noGame ? [] : [{ id: 'clip', icon: Camera, label: 'Start / stop clip recording (Game Bar)', run: () => act('clip') }]),
    ...(noGame ? [] : [{ id: 'quit', icon: X, label: 'Close game', danger: true, run: () => setConfirm(true) }]),
    { id: 'sleep', icon: Moon, label: 'Sleep PC', run: () => act('sleep') },
    { id: 'power', icon: PowerIcon, label: 'Restart / shut down…', run: () => act('page:power') },
  ];
  const confirmItems = [
    { label: 'Quit the game (like closing its window)', run: () => act('quit') },
    { label: 'Force quit (use if it is frozen)', run: () => act('forcequit') },
    { label: 'Cancel', run: () => setConfirm(false) },
  ];
  const list = confirm ? confirmItems : items;

  usePadInput((btn) => {
    if (!open) return;
    if (Date.now() - openedAt.current < 1200) return;
    if (btn === 'up') setI((x) => (x + list.length - 1) % list.length);
    if (btn === 'down') setI((x) => (x + 1) % list.length);
    if (btn === 'left') list[i].adj?.(-1);
    if (btn === 'right') list[i].adj?.(1);
    if (btn === 'a') list[i].run();
    if (btn === 'x') list[i].alt?.();
    if (btn === 'b' || btn === 'start') { confirm ? setConfirm(false) : act('resume'); }
  }, { layout: () => layoutRef.current });

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="ov-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => act('resume')}>
          <motion.div className="ov-panel glass" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.94, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 26 }}>
            <div className="eyebrow">{noGame ? 'Menu' : 'Paused'}{inviteItems.length > 0 ? ` · ${inviteItems.length} invite${inviteItems.length > 1 ? 's' : ''} waiting` : ''}</div>
            <h2 className="h-title" style={{ fontSize: 30, margin: '4px 0 12px' }}>{game}</h2>
            <div className="ov-status">
              <span><Clock size={15} />{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              {qs?.wifi && <span><Wifi size={15} />{qs.wifi.ssid}</span>}
              {bat && <span>{bat.charging ? <BatteryCharging size={15} /> : <BatteryFull size={15} />}{Math.round(bat.level * 100)}%</span>}
            </div>
            {confirm && <div className="muted" style={{ margin: '10px 4px 4px' }}>Quit {game}? Unsaved progress will be lost.</div>}
            {list.map((it, k) => {
              const Ico = it.icon;
              return (
                <div key={it.id || it.label} className={`ov-item ${k === i ? 'on' : ''} ${it.danger ? 'danger' : ''}`} onMouseEnter={() => setI(k)} onClick={() => it.run()}>
                  {Ico && <Ico size={22} />}
                  <span className="grow">{it.label}</span>
                  {it.adj && <ChevronLeft size={18} className="adj" onClick={(e) => { e.stopPropagation(); it.adj(-1); }} />}
                  {it.value && <b className="val">{it.value}</b>}
                  {it.adj && <ChevronRight size={18} className="adj" onClick={(e) => { e.stopPropagation(); it.adj(1); }} />}
                </div>
              );
            })}
            <div className="ov-foot">{msg || <><b className="btn-glyph a">A</b>Select <b className="btn-glyph b" style={{ marginLeft: 14 }}>B</b>Resume <span style={{ marginLeft: 14 }}>Hold Back + Start again to close</span></>}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
