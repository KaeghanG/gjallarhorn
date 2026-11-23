import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderPlus, RefreshCw, Play, Search, X, Trophy } from 'lucide-react';
import { PageHead, TiltCard, Img, Skeletons, Empty, Progress, stagger, useToast } from '../components/ui.jsx';
import { EMULATORS } from '../data/emulators.js';
import { bytes } from '../api.js';

export default function Retro({ settings, saveSettings }) {
  const toast = useToast();
  const [roms, setRoms] = useState(null);
  const [art, setArt] = useState({});
  const [emu, setEmu] = useState({});
  const [sys, setSys] = useState('all');
  const [q, setQ] = useState('');
  const folders = settings?.romFolders || [];

  const scan = async () => {
    setRoms(null);
    const list = await window.gjallar.romScan().catch((e) => { toast({ kind: 'bad', title: 'Scan failed', body: e.message }); return []; });
    setRoms(list);
    window.gjallar.romArt(list).then(setArt).catch(() => {});
  };
  const [ra, setRa] = useState(null);
  useEffect(() => {
    if (settings?.raUser && settings?.raKey) window.gjallar.raSummary().then(setRa, (e) => setRa({ error: e.message }));
  }, [settings?.raUser, settings?.raKey]);
  useEffect(() => {
    scan();
    window.gjallar.emuStatus(EMULATORS.map((e) => ({ id: e.id, paths: e.paths }))).then(setEmu);
  }, [folders.join('|')]);

  const addFolder = async () => {
    const p = await window.gjallar.pickFolder('Pick a folder with your games / ROMs');
    if (p && !folders.includes(p)) await saveSettings({ romFolders: [...folders, p] });
  };
  const launch = async (r) => {
    try { await window.gjallar.romLaunch(r, emu[r.emu]?.exe); toast({ kind: 'ok', title: `Launching ${r.title}`, body: r.systemName }); }
    catch (e) { toast({ kind: 'bad', title: "Can't launch yet", body: e.message, ms: 9000 }); }
  };

  const systems = useMemo(() => {
    const m = new Map();
    for (const r of roms || []) m.set(r.system, { id: r.system, name: r.systemName, n: (m.get(r.system)?.n || 0) + 1 });
    return [...m.values()];
  }, [roms]);
  const shown = (roms || []).filter((r) => (sys === 'all' || r.system === sys) && r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHead eyebrow="Midgard's archives" title="Retro" sub="Your own game files, matched to box art and launched in the right emulator. Gjallarhorn never downloads ROMs, BIOS or firmware.">
        <button className="btn" onClick={scan}><RefreshCw size={15} />Rescan</button>
        <button className="btn gold" onClick={addFolder}><FolderPlus size={16} />Add folder</button>
      </PageHead>

      {ra && (
        <div className="glass" style={{ padding: 18, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: ra.recent?.length ? 12 : 0 }}>
            <Trophy size={20} color="var(--gold)" />
            <b>RetroAchievements</b>
            {ra.error ? <span className="muted" style={{ fontSize: 12.5 }}>{ra.error}</span> : <span className="tag gold">{ra.user} · {ra.points.toLocaleString()} points</span>}
          </div>
          {!!ra.recent?.length && (
            <div className="row-scroll" style={{ gridAutoColumns: 250 }}>
              {ra.recent.map((g) => (
                <div key={g.title + g.console} className="panel" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12 }}>
                  {g.image && <img src={g.image} alt="" style={{ width: 48, height: 48, borderRadius: 8 }} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.title}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{g.console}</div>
                    {g.total > 0 && <div style={{ marginTop: 6 }}><Progress value={g.achieved / g.total} /><div className="muted" style={{ fontSize: 11 }}>{g.achieved}/{g.total}</div></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {folders.length > 0 && (
        <div className="chips" style={{ marginBottom: 14 }}>
          {folders.map((f) => (
            <span key={f} className="tag" style={{ height: 28, padding: '0 6px 0 12px' }}>
              {f}
              <button className="btn sm ghost" style={{ height: 22, padding: '0 6px' }} onClick={() => saveSettings({ romFolders: folders.filter((x) => x !== f) })}><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      {!folders.length ? (
        <Empty rune="ᛗ" title="Point Gjallarhorn at your games">
          <p>Add a folder (one per console works best, e.g. <code>ROMs\PS2</code>, <code>ROMs\GameCube</code>).</p>
          <button className="btn gold" onClick={addFolder}><FolderPlus size={16} />Add folder</button>
        </Empty>
      ) : !roms ? <Skeletons n={12} h={260} className="grid covers" /> : !roms.length ? (
        <Empty rune="ᛗ" title="No games found">Supported: Switch, Wii U, Wii, GameCube, 3DS, DS, PSP, PS1, PS2, Xbox, Xbox 360, Dreamcast, N64, SNES, NES, GBA, GB/GBC, Genesis.</Empty>
      ) : (
        <>
          <div className="toolbar">
            <div className="search-big" style={{ maxWidth: 360 }}>
              <Search size={18} style={{ top: 12 }} />
              <input className="input" style={{ height: 42 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" />
            </div>
            <div className="chips">
              <button className={`chip ${sys === 'all' ? 'on' : ''}`} onClick={() => setSys('all')}>All <span style={{ opacity: 0.6 }}>{roms.length}</span></button>
              {systems.map((s) => <button key={s.id} className={`chip ${sys === s.id ? 'on' : ''}`} onClick={() => setSys(s.id)}>{s.name} <span style={{ opacity: 0.6 }}>{s.n}</span></button>)}
            </div>
          </div>
          <motion.div className="grid covers" variants={stagger} initial="hidden" animate="show" key={sys}>
            {shown.map((r) => {
              const e = EMULATORS.find((x) => x.id === r.emu);
              const ready = !!emu[r.emu]?.exe;
              return (
                <TiltCard key={r.id} className="card cover-card" onClick={() => launch(r)} max={10} style={{ '--accent': e?.accent || '#5c7cff' }}>
                  <div className="media" style={{ background: `radial-gradient(120% 80% at 30% 0%, color-mix(in srgb, ${e?.accent || '#5c7cff'} 45%, transparent), #0b1024 70%)` }}>
                    <Img srcs={[art[r.id]]} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }}
                      fallback={<div className="cover-fallback" style={{ background: 'transparent' }}>{r.title}</div>} />
                  </div>
                  <span className="tag src" style={{ background: 'rgba(4,6,13,.75)' }}>{r.systemName}</span>
                  <div className="overlay">
                    <div className="title">{r.title}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{e?.name || r.emu} · {bytes(r.size)}</div>
                    <button className={`btn sm ${ready ? 'gold' : ''}`} style={{ marginTop: 8 }}><Play size={12} fill="currentColor" />{ready ? 'Play' : 'Needs emulator'}</button>
                  </div>
                </TiltCard>
              );
            })}
          </motion.div>
        </>
      )}
    </>
  );
}
