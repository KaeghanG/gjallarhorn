import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Download, Check, ExternalLink } from 'lucide-react';
import { Img } from '../ui.jsx';

// Gjallarhorn's own install screen for Steam games (replaces Steam's dialog). The couch-mode router calls bind()'s function for each button.
const gb = (b) => (b == null ? '—' : b >= 1e12 ? `${(b / 1e12).toFixed(1)} TB` : `${(b / 1e9).toFixed(b >= 1e10 ? 0 : 1)} GB`);

export default function InstallDialog({ game, bind, onClose }) {
  const [info, setInfo] = useState(null);
  const [sel, setSel] = useState(0);
  const [phase, setPhase] = useState('choose'); // choose | working | done | error
  const [prog, setProg] = useState(null);
  const [err, setErr] = useState('');
  const startedAt = useRef(0);

  useEffect(() => {
    window.gjallar.install.prepare(game.appid).then((d) => {
      setInfo(d);
      // default to the library with the most free space that can hold the game
      const best = [...d.libraries].sort((a, b) => (b.freeBytes || 0) - (a.freeBytes || 0))[0];
      setSel(Math.max(0, d.libraries.indexOf(best)));
    }).catch((e) => { setErr(e.message); setPhase('error'); });
  }, [game.appid]);

  // While installing, watch the Steam manifest for progress.
  useEffect(() => {
    if (phase !== 'working') return undefined;
    const t = setInterval(() => window.gjallar.install.status(game.appid).then((s) => {
      setProg(s);
      if (s.phase === 'done') setPhase('done');
    }).catch(() => {}), 1500);
    return () => clearInterval(t);
  }, [phase, game.appid]);

  const libs = info?.libraries || [];
  const lib = libs[sel];
  const tooSmall = lib && info?.sizeBytes && lib.freeBytes != null && lib.freeBytes < info.sizeBytes * 1.05;

  const go = async () => {
    if (!lib || tooSmall) return;
    setPhase('working'); setProg({ phase: 'queued' }); startedAt.current = Date.now();
    try { await window.gjallar.install.start(game.appid, lib.path); } catch (e) { setErr(e.message); setPhase('error'); }
  };
  const steamDialog = () => window.gjallar.install.steamDialog(game.appid).catch(() => {});

  bind((btn) => {
    if (btn === 'b') return onClose();
    if (phase === 'choose') {
      if (btn === 'up') setSel((s) => Math.max(0, s - 1));
      if (btn === 'down') setSel((s) => Math.min(libs.length - 1, s + 1));
      if (btn === 'a') go();
    } else if (phase === 'working' && (btn === 'x' || (btn === 'a' && prog?.phase === 'needs-steam'))) steamDialog();
    else if (phase === 'done' && btn === 'a') onClose();
  });

  const pct = prog?.percent != null ? Math.round(prog.percent * 100) : null;
  return (
    <motion.div className="couch-page inst-page" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <div className="couch-page-bg"><Img srcs={game.hero} alt="" className="ken" /></div>
      <div className="inst-card">
        <div className="eyebrow">Install</div>
        <h1 className="h-title">{game.title}</h1>
        {info && <div className="muted">{info.sizeBytes ? `About ${gb(info.sizeBytes)} to download` : 'Size shown by Steam once it starts'}</div>}

        {phase === 'choose' && (
          <>
            <div className="inst-sec">Install to</div>
            {!info && !err && <div className="muted">Checking your drives…</div>}
            {libs.map((l, i) => (
              <div key={l.path} className={`inst-lib ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>
                <HardDrive size={22} />
                <div className="grow"><b>{l.path}</b><small>{l.label}{l.isSteamRoot ? ' · main Steam library' : ''}</small></div>
                <div className="inst-free"><b>{gb(l.freeBytes)}</b><small>free</small></div>
              </div>
            ))}
            {tooSmall && <div className="fr-err">Not enough free space on this drive.</div>}
            <div className="inst-hint"><b className="btn-glyph a">A</b><Download size={15} /> Install <b className="btn-glyph b" style={{ marginLeft: 16 }}>B</b>Cancel</div>
          </>
        )}

        {phase === 'working' && (
          <>
            <div className="inst-status">
              {prog?.phase === 'downloading' ? <><Download size={20} /> Downloading{pct != null ? ` · ${pct}%` : ''}</> : prog?.phase === 'needs-steam' ? 'Steam needs one confirmation for this game' : 'Handing it to Steam…'}
            </div>
            <div className="inst-bar"><i style={{ width: `${pct ?? (prog?.phase === 'downloading' ? 4 : 2)}%` }} /></div>
            {prog?.phase === 'downloading' && prog.total > 0 && <div className="muted">{gb(prog.downloaded)} of {gb(prog.total)}</div>}
            <div className="inst-hint">
              {prog?.phase === 'needs-steam' ? <><b className="btn-glyph a">A</b><ExternalLink size={15} /> Open Steam's install window</> : <><b className="btn-glyph x">X</b>Use Steam's own window instead</>}
              <b className="btn-glyph b" style={{ marginLeft: 16 }}>B</b>Close (it keeps downloading)
            </div>
          </>
        )}

        {phase === 'done' && <div className="inst-status"><Check size={20} /> Installed. It is in your library now.<div className="inst-hint"><b className="btn-glyph a">A</b>Done</div></div>}
        {phase === 'error' && <><div className="fr-err">{err}</div><div className="inst-hint"><b className="btn-glyph b">B</b>Close</div></>}
      </div>
    </motion.div>
  );
}
