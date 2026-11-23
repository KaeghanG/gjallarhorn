import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Download, Globe, FolderSearch, RefreshCw, Check, Trash2, LoaderCircle, ArrowUpCircle } from 'lucide-react';
import { PageHead, Progress, Switch, stagger, rise, useToast } from '../components/ui.jsx';
import { EMULATORS } from '../data/emulators.js';

const MAKERS = ['All', 'Nintendo', 'Sony', 'Microsoft', 'Sega', 'Multi'];
const initials = (s) => s.replace(/[^A-Za-z0-9 ]/g, '').split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase();

export default function Emulators({ settings, saveSettings }) {
  const toast = useToast();
  const [status, setStatus] = useState({});
  const [maker, setMaker] = useState('All');
  const [prog, setProg] = useState({});
  const [latest, setLatest] = useState({});
  const [checking, setChecking] = useState(false);

  const [updates, setUpdates] = useState([]);
  const refresh = useCallback(() => window.gjallar.emuStatus(EMULATORS.map((e) => ({ id: e.id, paths: e.paths }))).then(setStatus), []);
  useEffect(() => {
    refresh();
    window.gjallar.emuUpdates().then(setUpdates).catch(() => {});
    const off1 = window.gjallar.onEmuUpdates(setUpdates);
    const off2 = window.gjallar.onEmuProgress((p) => setProg((s) => ({ ...s, [p.id]: p })));
    return () => { off1(); off2(); };
  }, [refresh]);

  const install = async (e) => {
    setProg((s) => ({ ...s, [e.id]: { phase: 'download', p: 0 } }));
    try {
      const r = await window.gjallar.emuInstall(e.id);
      toast({ kind: 'ok', title: `${e.name} ${r.version} installed`, body: r.exe });
      await refresh();
    } catch (err) {
      toast({ kind: 'bad', title: `${e.name} install failed`, body: err.message });
    }
    setProg((s) => ({ ...s, [e.id]: null }));
  };
  const remove = async (e) => {
    await window.gjallar.emuUninstall(e.id);
    toast({ kind: 'ok', title: `${e.name} removed` });
    refresh();
  };
  const locate = async (e) => {
    const exe = await window.gjallar.pickExe(`Locate ${e.name}`);
    if (!exe) return;
    await saveSettings({ emulatorPaths: { ...(settings?.emulatorPaths || {}), [e.id]: exe } });
    refresh();
  };
  const launch = async (e, exe) => {
    try { await window.gjallar.launchExe(exe); toast({ kind: 'ok', title: `Launching ${e.name}` }); }
    catch (err) { toast({ kind: 'bad', title: 'Launch failed', body: err.message }); }
  };
  const checkUpdates = async () => {
    setChecking(true);
    const managed = EMULATORS.filter((e) => status[e.id]?.managed);
    const res = await Promise.all(managed.map((e) => window.gjallar.emuLatest(e.id).then((r) => [e.id, r.version], () => [e.id, null])));
    setLatest(Object.fromEntries(res));
    setChecking(false);
    const n = res.filter(([id, v]) => v && v !== status[id]?.version).length;
    toast({ kind: n ? 'info' : 'ok', title: n ? `${n} update${n > 1 ? 's' : ''} available` : 'Everything is up to date' });
  };

  const list = EMULATORS.filter((e) => maker === 'All' || e.maker === maker);
  const ready = Object.values(status).filter((s) => s.exe).length;

  return (
    <>
      <PageHead eyebrow="Every realm" title="Emulators" sub="One click downloads the official Windows build from each project. Bring your own games, BIOS and firmware: Gjallarhorn never downloads those.">
        <button className="btn" onClick={checkUpdates} disabled={checking}>{checking ? <LoaderCircle size={15} className="spin" /> : <RefreshCw size={15} />}Check updates</button>
      </PageHead>

      <div className="glass" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ArrowUpCircle size={20} color="var(--aur-green)" />
          <div style={{ flex: 1 }}>
            <b>{updates.length ? `${updates.length} update${updates.length > 1 ? 's' : ''} ready` : 'Emulators Gjallarhorn installed are up to date'}</b>
            <div className="muted" style={{ fontSize: 12.5 }}>Checked in the background every 6 hours.</div>
          </div>
          <span className="muted" style={{ fontSize: 12.5 }}>Install updates automatically</span>
          <Switch on={!!settings?.autoUpdateEmus} onChange={(v) => saveSettings({ autoUpdateEmus: v })} />
        </div>
        {updates.map((u) => {
          const e = EMULATORS.find((x) => x.id === u.id);
          return (
            <details key={u.id} className="fix" style={{ marginTop: 12 }}>
              <summary>
                <span className="tag green">{u.current} → {u.latest}</span>{e?.name || u.id}
                <div style={{ flex: 1 }} />
                <button className="btn sm aurora" onClick={(ev) => { ev.preventDefault(); install(e).then(() => setUpdates((s) => s.filter((x) => x.id !== u.id))); }}><Download size={13} />Update</button>
              </summary>
              <pre>{u.notes.replace(/\r/g, '').replace(/^#+\s*/gm, '').trim() || 'No release notes.'}</pre>
              {u.url && <div style={{ padding: '0 14px 12px' }}><button className="btn sm ghost" onClick={() => window.gjallar.open(u.url)}><Globe size={13} />Full release page</button></div>}
            </details>
          );
        })}
      </div>

      <div className="toolbar">
        <div className="chips">
          {MAKERS.map((m) => <button key={m} className={`chip ${maker === m ? 'on' : ''}`} onClick={() => setMaker(m)}>{m}</button>)}
        </div>
        <div style={{ flex: 1 }} />
        <span className="tag green"><Check size={11} />{ready} / {EMULATORS.length} ready</span>
      </div>

      <motion.div className="grid wide" variants={stagger} initial="hidden" animate="show" key={maker}>
        {list.map((e) => {
          const s = status[e.id] || {};
          const p = prog[e.id];
          const upd = s.managed && latest[e.id] && latest[e.id] !== s.version;
          return (
            <motion.div key={e.id} variants={rise} className="card emu-card" style={{ '--accent': e.accent }} whileHover={{ y: -4 }}>
              <div className="sys">
                <div className="emu-badge">{initials(e.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{e.name}</h3>
                  <div className="muted" style={{ fontSize: 12.5 }}>{e.system} · {e.maker}{e.year && e.maker !== 'Multi' ? ` · ${e.year}` : ''}</div>
                </div>
                {s.exe ? <span className="tag green"><Check size={10} />{s.managed ? s.version : 'Found'}</span> : <span className="tag">Not installed</span>}
              </div>
              <div className="blurb">{e.blurb}</div>
              {p ? (
                <div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>{p.phase === 'extract' ? 'Extracting…' : `Downloading… ${Math.round((p.p || 0) * 100)}%`}</div>
                  <Progress value={p.phase === 'extract' ? 1 : p.p} />
                </div>
              ) : (
                <div className="actions">
                  {s.exe && <button className="btn sm gold" onClick={() => launch(e, s.exe)}><Play size={12} fill="currentColor" />Launch</button>}
                  {!s.exe && s.canInstall && <button className="btn sm aurora" onClick={() => install(e)}><Download size={13} />Install</button>}
                  {upd && <button className="btn sm aurora" onClick={() => install(e)}><ArrowUpCircle size={13} />Update to {latest[e.id]}</button>}
                  {!s.exe && <button className="btn sm" onClick={() => locate(e)} title="Point to an existing install"><FolderSearch size={13} />Locate</button>}
                  <button className="btn sm ghost" onClick={() => window.gjallar.open(e.site)}><Globe size={13} />Site</button>
                  {s.managed && <button className="btn sm ghost danger" onClick={() => remove(e)} title="Uninstall"><Trash2 size={13} /></button>}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </>
  );
}
