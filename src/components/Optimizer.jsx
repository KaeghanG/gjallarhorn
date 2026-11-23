import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WandSparkles, RotateCcw, ShieldAlert, Cpu, BookOpen, ExternalLink, Download, Sparkles, TriangleAlert, Check, FolderOpen, LoaderCircle } from 'lucide-react';
import { Switch, Progress, useToast, SectionHead } from './ui.jsx';

const IMPACT = { fps: ['FPS', 'green'], stutter: ['Stutter', 'blue'], visual: ['Visuals', 'violet'], latency: ['Latency', 'gold'] };
const ENGINE = { unreal: 'Unreal Engine', unity: 'Unity', unknown: 'Unknown engine' };

export default function Optimizer({ game }) {
  const toast = useToast();
  const [st, setSt] = useState(null);
  const [wiki, setWiki] = useState(null);
  const [sel, setSel] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [opti, setOpti] = useState(null);
  const [optiBusy, setOptiBusy] = useState(false);
  const [dl, setDl] = useState(null);
  const [proxy, setProxy] = useState('dxgi.dll');

  const refresh = async () => {
    const s = await window.gjallar.tweakStatus(game);
    setSt(s);
    setSel(new Set(s.applied));
    return s;
  };

  useEffect(() => {
    refresh().catch((e) => toast({ kind: 'bad', title: 'Optimizer error', body: e.message }));
    window.gjallar.wikiLookup({ name: game.name, appid: game.appid }).then(setWiki, (e) => setWiki({ found: false, error: e.message }));
    window.gjallar.optiInfo().then(setOpti, () => setOpti({ latest: null, local: [] }));
    window.gjallar.getSettings().then((s) => setProxy(s.optiscalerProxy || 'dxgi.dll'));
    return window.gjallar.onOptiProgress(setDl);
  }, [game.key]);

  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const dirty = st && (sel.size !== st.applied.length || [...sel].some((x) => !st.applied.includes(x)));

  const apply = async () => {
    setBusy(true);
    try {
      const r = await window.gjallar.applyTweaks(game, [...sel]);
      await refresh();
      toast(r.ok
        ? { kind: 'ok', title: sel.size ? `Applied ${sel.size} tweak${sel.size > 1 ? 's' : ''}` : 'All tweaks removed', body: r.changed.length ? `Edited: ${r.changed.slice(0, 3).join(', ')}` : 'Originals restored.' }
        : { kind: 'bad', title: 'Some tweaks failed', body: r.errors.join(' · ') });
    } catch (e) { toast({ kind: 'bad', title: 'Apply failed', body: e.message }); }
    setBusy(false);
  };
  const revert = async () => {
    setBusy(true);
    try { await window.gjallar.revertTweaks(game); await refresh(); toast({ kind: 'ok', title: 'Reverted', body: 'Every edited file and registry value is back to the original.' }); }
    catch (e) { toast({ kind: 'bad', title: 'Revert failed', body: e.message }); }
    setBusy(false);
  };

  const download = async () => {
    setOptiBusy(true); setDl(0);
    try { const r = await window.gjallar.optiDownload(); setOpti(await window.gjallar.optiInfo()); toast({ kind: 'ok', title: `OptiScaler ${r.tag} ready` }); }
    catch (e) { toast({ kind: 'bad', title: 'Download failed', body: e.message }); }
    setOptiBusy(false); setDl(null);
  };
  const setOptiOn = async (on) => {
    setOptiBusy(true);
    try {
      if (on) {
        const r = await window.gjallar.optiInstall(game, { proxy });
        toast({ kind: 'ok', title: 'OptiScaler installed', body: `${r.files.length} files → ${r.dir}. Press Insert in-game for the overlay.` });
      } else {
        const r = await window.gjallar.optiUninstall(game);
        toast(r.ok ? { kind: 'ok', title: 'OptiScaler removed', body: 'Game files restored.' } : { kind: 'bad', title: 'Partly removed', body: r.errors.join(' · ') });
      }
      await refresh();
    } catch (e) { toast({ kind: 'bad', title: 'OptiScaler', body: e.message }); }
    setOptiBusy(false);
  };

  const recommended = st?.tweaks.filter((t) => t.recommended).map((t) => t.id) || [];
  const f = wiki?.features || {};
  const antiCheat = f.antiCheat && !/^(false|none)$/i.test(f.antiCheat) ? f.antiCheat : null;
  const upscalers = f.upscaling && !/^(false|none)$/i.test(f.upscaling) ? f.upscaling : null;
  const optiOn = !!st?.optiscaler;
  const engines = [ENGINE[st?.info.engine], ...(wiki?.engines || [])].filter((x, i, a) => x && x !== 'Unknown engine' && a.indexOf(x) === i);

  return (
    <div>
      <SectionHead rune="ᛟ" title="Optimize" />
      {!st ? <div className="skeleton" style={{ height: 240 }} /> : st.info.missing ? (
        <div className="warnbox"><TriangleAlert size={16} />Game folder not found: {game.dir}</div>
      ) : (
        <div className="opt-grid">
          {/* -------- Tweaks -------- */}
          <div>
            {st.hw && (
              <div className="panel" style={{ background: 'linear-gradient(135deg, rgba(92,124,255,.10), rgba(60,242,176,.05))' }}>
                <h3><Cpu size={14} /> Tuned for your PC</h3>
                <dl className="kv">
                  <dt>GPU</dt><dd>{st.hw.gpu.name}{st.hw.gpu.vramMB ? ` · ${Math.round(st.hw.gpu.vramMB / 1024)} GB` : ''}{st.hw.hybrid ? ' (+ integrated GPU)' : ''}</dd>
                  <dt>Screen</dt><dd>{st.hw.primary.width}×{st.hw.primary.height} @ {st.hw.primary.refresh} Hz</dd>
                  <dt>CPU / RAM</dt><dd>{st.hw.cpu.cores ? `${st.hw.cpu.cores} cores / ${st.hw.cpu.threads} threads` : `${st.hw.cpu.threads} threads`} · {st.hw.ramGB} GB{st.hw.laptop ? ' · laptop' : ''}</dd>
                </dl>
                <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
                  Recommendations below use these values: texture pool {st.tune.poolMB} MB{st.tune.fpsCap ? `, FPS cap ${st.tune.fpsCap}` : ''}, best upscaler for your GPU: <b>{st.tune.upscaler}</b>.
                  {st.hw.laptop && ' Plug in your charger for full GPU power.'}
                </p>
              </div>
            )}
            <div className="panel">
              <h3><Cpu size={14} /> Detected</h3>
              <dl className="kv">
                <dt>Engine</dt><dd>{engines.join(' · ') || 'Unknown'}</dd>
                <dt>Executable</dt><dd>{st.info.exe || '—'}</dd>
                {st.info.ueConfigDirs?.[0] && <><dt>Config</dt><dd>{st.info.ueConfigDirs[0]}{st.info.ueConfigGuessed ? ' (created on apply)' : ''}</dd></>}
                {upscalers && <><dt>Upscalers</dt><dd>{upscalers}</dd></>}
                {f.api && <><dt>Direct3D</dt><dd>{f.api}</dd></>}
              </dl>
              {antiCheat && (
                <div className="warnbox" style={{ marginTop: 14 }}>
                  <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                  <span><b>{antiCheat}</b> detected. File tweaks and OptiScaler can get you kicked or banned online. Only use them offline or single-player.</span>
                </div>
              )}
            </div>

            <div className="panel">
              <h3 style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><WandSparkles size={14} /> Tweaks</span>
                <button className="btn sm ghost" onClick={() => setSel(new Set(recommended))}><Sparkles size={12} />Recommended for this PC</button>
              </h3>
              {st.tweaks.map((t, i) => {
                const on = sel.has(t.id);
                const applied = st.applied.includes(t.id);
                return (
                  <motion.div key={t.id} className={`tweak ${on ? 'on' : ''}`} onClick={() => toggle(t.id)}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Switch on={on} onChange={() => toggle(t.id)} />
                    <div style={{ flex: 1 }}>
                      <div className="t">
                        {t.title}
                        <span className={`tag ${IMPACT[t.impact][1]}`}>{IMPACT[t.impact][0]}</span>
                        {t.recommended && <span className="tag gold">Recommended</span>}
                        {t.experimental && <span className="tag warn">Experimental</span>}
                        {applied && <span className="tag green"><Check size={10} />Applied</span>}
                      </div>
                      <div className="d">{t.desc}</div>
                    </div>
                  </motion.div>
                );
              })}
              {st.info.engine === 'unknown' && <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Engine-specific tweaks appear for Unreal and Unity games. Check the PCGamingWiki fixes on the right for this one.</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className="btn gold" disabled={!dirty || busy} onClick={apply}>{busy ? <LoaderCircle size={15} className="spin" /> : <Check size={15} />}Apply selection</button>
                <button className="btn danger" disabled={!st.applied.length || busy} onClick={revert}><RotateCcw size={15} />Revert all</button>
                <button className="btn ghost" title="Open backups folder" onClick={() => window.gjallar.showPath(st.backupDir)}><FolderOpen size={15} /></button>
              </div>
            </div>
          </div>

          {/* -------- OptiScaler + wiki -------- */}
          <div>
            <div className="panel" style={{ background: optiOn ? 'linear-gradient(135deg, rgba(60,242,176,.10), rgba(92,124,255,.06))' : undefined, borderColor: optiOn ? 'rgba(60,242,176,.3)' : undefined, transition: 'all .4s' }}>
              <h3 style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Sparkles size={14} /> OptiScaler</span>
                <Switch on={optiOn} disabled={optiBusy || (!optiOn && !opti?.local?.length)} onChange={setOptiOn} />
              </h3>
              <p className="muted" style={{ fontSize: 12.5, margin: '0 0 12px' }}>
                Swaps the game's DLSS / FSR / XeSS for whichever upscaler you like, adds frame generation, and gives you an in-game overlay (Insert key).
              </p>
              {st.tune && upscalers && (() => {
                const has = (x) => upscalers.toLowerCase().includes(x.toLowerCase());
                const best = st.tune.upscaler;
                const tip = has(best)
                  ? `This game already has ${best}, the best upscaler for your ${st.hw.gpu.vendor.toUpperCase()} GPU, so OptiScaler is optional (mainly for frame generation or a newer version).`
                  : best === 'DLSS'
                    ? `This game lacks DLSS. Your RTX card can use OptiScaler to run DLSS in place of ${upscalers.split(',')[0]}: usually sharper.`
                    : `This game lacks ${best}. OptiScaler can swap its ${upscalers.split(',')[0]} for ${best}, which suits your ${st.hw.gpu.vendor.toUpperCase()} GPU.`;
                return <div className={has(best) ? 'okbox' : 'warnbox'} style={{ marginBottom: 10 }}><Sparkles size={16} style={{ flexShrink: 0 }} />{tip}</div>;
              })()}
              {optiOn ? (
                <div className="okbox"><Check size={16} />Installed {st.optiscaler.version} as {st.optiscaler.proxy} in {st.optiscaler.dir}</div>
              ) : (
                <>
                  {!upscalers && wiki?.found && <div className="warnbox" style={{ marginBottom: 10 }}><TriangleAlert size={16} style={{ flexShrink: 0 }} />PCGamingWiki doesn't list DLSS, FSR 2+ or XeSS for this game. OptiScaler needs one of those to hook into.</div>}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {opti?.local?.length ? <span className="tag green"><Check size={10} />{opti.local[0]} downloaded</span> : null}
                    {opti?.latest?.tag && opti.local?.[0] !== opti.latest.tag && (
                      <button className="btn sm aurora" disabled={optiBusy} onClick={download}><Download size={13} />Get {opti.latest.tag}</button>
                    )}
                    <select className="input" style={{ height: 30, fontSize: 12 }} value={proxy} onChange={(e) => { setProxy(e.target.value); window.gjallar.setSettings({ optiscalerProxy: e.target.value }); }}>
                      {(opti?.proxies || ['dxgi.dll']).map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  {dl != null && <div style={{ marginTop: 10 }}><Progress value={dl} /></div>}
                  {opti?.latest?.error && <div className="err" style={{ marginTop: 8 }}>{opti.latest.error}</div>}
                  <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>If the game won't start, try winmm.dll or version.dll as the file name. Toggling off restores every overwritten file.</p>
                </>
              )}
            </div>

            <div className="panel">
              <h3 style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><BookOpen size={14} /> Community fixes</span>
                {wiki?.url && <button className="btn sm ghost" onClick={() => window.gjallar.open(wiki.url)}>PCGamingWiki <ExternalLink size={12} /></button>}
              </h3>
              {!wiki ? <div className="skeleton" style={{ height: 120 }} /> : !wiki.found ? (
                <p className="muted" style={{ fontSize: 12.5 }}>{wiki.error ? `Lookup failed: ${wiki.error}` : 'No PCGamingWiki page found for this game.'}</p>
              ) : !wiki.sections.length ? (
                <p className="muted" style={{ fontSize: 12.5 }}>No known fixes listed: this one runs clean.</p>
              ) : (
                wiki.sections.map((s, i) => (
                  <details key={i} className="fix">
                    <summary>
                      <span className={`tag ${/essential/i.test(s.group) ? 'gold' : /unresolved/i.test(s.group) ? 'bad' : /fixed/i.test(s.group) ? 'green' : ''}`}>{s.group.replace(/issues /i, '')}</span>
                      {s.title}
                    </summary>
                    <pre>{s.body}</pre>
                  </details>
                ))
              )}
              {wiki?.features?.ultrawide && <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="tag">Ultrawide: {wiki.features.ultrawide}</span>
                {wiki.features.hdr && <span className="tag">HDR: {wiki.features.hdr}</span>}
              </div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
