import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Plus, RefreshCw, Search, WandSparkles, FolderOpen, X, Pencil, Trash2, Zap, CloudDownload, TriangleAlert, Dices, Activity, Star, List, LayoutGrid, Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';
import { PageHead, TiltCard, Img, Skeletons, Empty, stagger, rise, useToast } from '../components/ui.jsx';
import Optimizer from '../components/Optimizer.jsx';
import SavesPanel from '../components/SavesPanel.jsx';
import LaunchOptions from '../components/LaunchOptions.jsx';
import ProfileEditor from '../components/ProfileEditor.jsx';
import LayoutEditor from '../components/LayoutEditor.jsx';
import { SectionHead as ProfHead } from '../components/ui.jsx';
import AchievementsPanel from '../components/AchievementsPanel.jsx';
import NewsPanel from '../components/NewsPanel.jsx';
import { gameInfo, TrailerVideo, GameBio } from '../components/Trailer.jsx';
import { bytes, steamImg } from '../api.js';

const SRC = { steam: { label: 'Steam', cls: 'blue' }, epic: { label: 'Epic', cls: '' }, custom: { label: 'Custom', cls: 'violet' }, riot: { label: 'Riot', cls: 'red' }, gog: { label: 'GOG', cls: 'violet' }, ubisoft: { label: 'Ubisoft', cls: 'blue' }, battlenet: { label: 'Battle.net', cls: 'blue' }, ea: { label: 'EA', cls: 'red' }, shortcut: { label: 'Steam shortcut', cls: 'violet' } };

const SORTS = { recent: 'Recently played', playtime: 'Most played', name: 'Name', size: 'Size' };

export default function Library({ library, refreshLibrary, openRoulette, openReport, settings, saveSettings }) {
  const [q, setQ] = useState('');
  const [src, setSrc] = useState('all');
  const [open, setOpen] = useState(null);
  const [edit, setEdit] = useState(null); // custom game being added/edited
  const [pt, setPt] = useState({});
  const [showHidden, setShowHidden] = useState(false);
  useEffect(() => { window.gjallar.playtime().then(setPt).catch(() => {}); }, [library.games]);
  const sort = settings?.librarySort || 'recent';
  const view = settings?.libraryView || 'grid';
  const favs = new Set(settings?.favorites || []);
  const hidden = new Set(settings?.hiddenGames || []);

  const games = useMemo(() => {
    const last = (g) => Math.max(g.lastPlayed || 0, pt[g.key]?.last || 0);
    const list = library.games.filter((g) => (src === 'all' || src === 'favorites' ? true : g.source === src)
      && (src !== 'favorites' || favs.has(g.key))
      && (showHidden || !hidden.has(g.key))
      && g.name.toLowerCase().includes(q.toLowerCase()));
    const cmp = {
      recent: (a, b) => last(b) - last(a) || a.name.localeCompare(b.name),
      playtime: (a, b) => (pt[b.key]?.total || 0) - (pt[a.key]?.total || 0) || last(b) - last(a),
      name: (a, b) => a.name.localeCompare(b.name),
      size: (a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0),
    }[sort];
    // Favorites always float to the top.
    return list.sort((a, b) => (favs.has(b.key) - favs.has(a.key)) || cmp(a, b));
  }, [library.games, q, src, sort, pt, settings?.favorites, settings?.hiddenGames, showHidden]);
  const toggleIn = (k, key) => {
    const cur = new Set(settings?.[k] || []);
    cur.has(key) ? cur.delete(key) : cur.add(key);
    saveSettings({ [k]: [...cur] });
  };
  const [owned, setOwned] = useState(null);
  useEffect(() => {
    if (src !== 'owned' || owned) return;
    window.gjallar.ownedList().then(setOwned, (e) => setOwned({ games: [], errors: [e.message] }));
  }, [src]);
  const count = (s) => (s === 'owned' ? owned?.games.length ?? '' : s === 'favorites' ? favs.size : library.games.filter((g) => s === 'all' || g.source === s).length);

  return (
    <>
      <PageHead eyebrow="Your hoard" title="Library" sub="Installed Steam and Epic games plus any .exe you add. Open a game to play it, apply tweaks, or switch on OptiScaler.">
        <button className="btn aurora" onClick={openRoulette}><Dices size={15} />What should I play?</button>
        <button className="btn" onClick={refreshLibrary}><RefreshCw size={15} className={library.loading ? 'spin' : ''} />Rescan</button>
        <button className="btn gold" onClick={() => setEdit({ name: '', exe: '', args: '', cover: '', hero: '' })}><Plus size={16} />Add a game</button>
      </PageHead>

      <div className="toolbar">
        <div className="search-big" style={{ maxWidth: 420 }}>
          <Search size={18} style={{ top: 12 }} />
          <input className="input" style={{ height: 42 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter your games…" />
        </div>
        <div className="chips">
          {['all', 'favorites', 'steam', 'epic', 'custom', 'owned'].map((s) => (
            <button key={s} className={`chip ${src === s ? 'on' : ''}`} onClick={() => setSrc(s)}>
              {s === 'all' ? 'All' : s === 'favorites' ? <><Star size={13} />Favorites</> : s === 'owned' ? <><CloudDownload size={14} />Not installed</> : SRC[s].label} <span style={{ opacity: 0.6 }}>{count(s)}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {src !== 'owned' && (
          <>
            <select className="input" style={{ height: 36 }} value={sort} onChange={(e) => saveSettings({ librarySort: e.target.value })}>
              {Object.entries(SORTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button className={`icon-btn`} title={view === 'grid' ? 'List view' : 'Grid view'} onClick={() => saveSettings({ libraryView: view === 'grid' ? 'list' : 'grid' })}>{view === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}</button>
            {hidden.size > 0 && <button className={`chip ${showHidden ? 'on' : ''}`} onClick={() => setShowHidden(!showHidden)}><EyeOff size={13} />{hidden.size} hidden</button>}
          </>
        )}
      </div>

      {src === 'owned' ? (
        <OwnedGrid owned={owned} q={q} onRefresh={() => { setOwned(null); window.gjallar.ownedList().then(setOwned, (e) => setOwned({ games: [], errors: [e.message] })); }} />
      ) : library.loading && !library.games.length ? (
        <Skeletons n={12} h={270} className="grid covers" />
      ) : !games.length ? (
        <Empty rune="ᛚ" title={library.games.length ? 'No matches' : 'No games found'}>
          {library.games.length ? 'Try another filter.' : 'Install something on Steam or Epic, or add any .exe with “Add a game”.'}
        </Empty>
      ) : view === 'list' ? (
        <motion.div className="glass" style={{ padding: 6 }} variants={stagger} initial="hidden" animate="show" key={src + 'l'}>
          {games.map((g) => (
            <motion.div key={g.key} variants={rise} className="price-row" onClick={() => setOpen(g)} style={{ opacity: hidden.has(g.key) ? 0.5 : 1 }}>
              <div style={{ width: 120, height: 45, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#0b1024' }}>
                <Img srcs={[g.header, g.hero, g.cover]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span className="name">{favs.has(g.key) && <Star size={12} fill="var(--gold)" color="var(--gold)" style={{ marginRight: 6, verticalAlign: -1 }} />}{g.name}</span>
              <span className={`tag ${SRC[g.source].cls}`}>{SRC[g.source].label}</span>
              <span className="muted" style={{ width: 90, fontSize: 12, textAlign: 'right' }}>{pt[g.key] ? `${Math.round(pt[g.key].total / 360000) / 10} h` : ''}</span>
              <span className="muted" style={{ width: 80, fontSize: 12, textAlign: 'right' }}>{bytes(g.sizeBytes)}</span>
              <button className="btn sm gold" onClick={(e) => { e.stopPropagation(); window.gjallar.launchGame(g); }}><Play size={12} fill="currentColor" />Play</button>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div className="grid covers" variants={stagger} initial="hidden" animate="show" key={src}>
          {games.map((g) => (
            <TiltCard key={g.key} className="card cover-card" onClick={() => setOpen(g)} max={10} style={{ opacity: hidden.has(g.key) ? 0.5 : 1 }}>
              <div className="media">
                <Img srcs={[g.cover, g.appid && steamImg.cover(g.appid)]} alt=""
                  fallback={<div className="cover-fallback">{g.name}</div>} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span className={`tag src ${SRC[g.source].cls}`} style={{ backdropFilter: 'blur(8px)', background: 'rgba(4,6,13,.7)' }}>{SRC[g.source].label}</span>
              {favs.has(g.key) && <span className="couch-fav" style={{ top: 10, left: 10, right: 'auto', zIndex: 3 }}><Star size={12} fill="currentColor" /></span>}
              <div className="overlay">
                <div className="title">{g.name}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button className="btn sm gold" onClick={(e) => { e.stopPropagation(); window.gjallar.launchGame(g); }}><Play size={12} fill="currentColor" />Play</button>
                  <button className="btn sm" onClick={(e) => { e.stopPropagation(); setOpen(g); }}><WandSparkles size={12} /></button>
                </div>
              </div>
            </TiltCard>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {open && <GameSheet key="sheet" game={open} onClose={() => setOpen(null)} onEdit={(g) => { setOpen(null); setEdit(g); }} refreshLibrary={refreshLibrary} openReport={openReport}
          fav={favs.has(open.key)} isHidden={hidden.has(open.key)} onFav={() => toggleIn('favorites', open.key)} onHide={() => toggleIn('hiddenGames', open.key)} />}
        {edit && <CustomGameModal key="edit" initial={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refreshLibrary(); }} />}
      </AnimatePresence>
    </>
  );
}

function OwnedGrid({ owned, q, onRefresh }) {
  const toast = useToast();
  if (!owned) return <Skeletons n={12} h={270} className="grid covers" />;
  const list = owned.games.filter((g) => g.name.toLowerCase().includes(q.toLowerCase()));
  const install = async (g) => {
    try { await window.gjallar.installOwned(g); toast({ kind: 'ok', title: `Opening ${g.source === 'steam' ? 'Steam' : 'Epic'} installer`, body: `${g.name}: pick a drive and it downloads. Rescan when it's done.` }); }
    catch (e) { toast({ kind: 'bad', title: 'Install failed', body: e.message }); }
  };
  return (
    <>
      {owned.errors.map((e) => <div key={e} className="warnbox" style={{ marginBottom: 14 }}><TriangleAlert size={16} style={{ flexShrink: 0 }} />{e}</div>)}
      {!list.length ? (
        <Empty rune="ᛟ" title={owned.errors.length ? 'Steam library not connected' : 'Everything you own is installed'}>
          {owned.errors.length ? 'Add your free Steam Web API key in Settings → Store accounts, then come back.' : 'Nice hoard.'}
          <div style={{ marginTop: 12 }}><button className="btn" onClick={onRefresh}><RefreshCw size={14} />Retry</button></div>
        </Empty>
      ) : (
        <motion.div className="grid covers" variants={stagger} initial="hidden" animate="show">
          {list.slice(0, 400).map((g) => (
            <TiltCard key={g.key} className="card cover-card owned" onClick={() => install(g)} max={8}>
              <div className="media">
                <Img srcs={[g.cover, g.appid && steamImg.cover(g.appid)]} alt="" fallback={<div className="cover-fallback">{g.name}</div>} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span className={`tag src ${SRC[g.source].cls}`} style={{ background: 'rgba(4,6,13,.7)' }}>{SRC[g.source].label}</span>
              <div className="overlay" style={{ opacity: 1, transform: 'none' }}>
                <div className="title">{g.name}</div>
                {g.playtimeMin > 0 && <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>{Math.round(g.playtimeMin / 60)} h on Steam</div>}
                <button className="btn sm aurora" style={{ marginTop: 8 }}><CloudDownload size={13} />Install</button>
              </div>
            </TiltCard>
          ))}
        </motion.div>
      )}
    </>
  );
}

function GameSheet({ game, onClose, onEdit, refreshLibrary, openReport, fav, isHidden, onFav, onHide }) {
  const toast = useToast();
  const [engine, setEngine] = useState('unknown');
  const [reports, setReports] = useState([]);
  const [info, setInfo] = useState(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    gameInfo(game.appid).then(setInfo);
    window.gjallar.tweakStatus(game).then((s) => setEngine(s.info.engine)).catch(() => {});
    window.gjallar.sessionReports().then((all) => setReports(all.filter((r) => r.key === game.key))).catch(() => {});
  }, [game.key]);
  const play = async () => {
    try { await window.gjallar.launchGame(game); toast({ kind: 'ok', title: `Launching ${game.name}`, body: 'Sounding the horn…' }); }
    catch (e) { toast({ kind: 'bad', title: 'Launch failed', body: e.message }); }
  };
  const remove = async () => {
    await window.gjallar.removeCustomGame(game.customId);
    onClose();
    refreshLibrary();
  };
  return (
    <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="sheet" onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 60, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}>
        <button className="icon-btn close" onClick={onClose}><X size={18} /></button>
        <div className="sheet-hero" style={{ height: info ? 470 : 300, transition: 'height .5s ease' }}>
          <Img className="ken" srcs={[game.hero, game.appid && steamImg.hero(game.appid), game.header, game.cover]} alt=""
            fallback={<div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(80% 120% at 20% 0%, rgba(92,124,255,.45), transparent 60%), radial-gradient(60% 100% at 100% 100%, rgba(60,242,176,.3), transparent 60%), #0b1024' }} />} />
          {info?.trailer && <TrailerVideo src={info.trailer.hls} delay={500} muted={muted} />}
          <div className="fade" />
          {info?.trailer && (
            <button className="icon-btn" style={{ position: 'absolute', top: 18, right: 66, zIndex: 5 }} title={muted ? 'Unmute trailer' : 'Mute'} onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
          )}
          <div className="head">
            <div>
              <div className="eyebrow">{SRC[game.source].label}{game.sizeBytes ? ` · ${bytes(game.sizeBytes)}` : ''}</div>
              <h1 className="h-display" style={{ fontSize: 40 }}>{game.name}</h1>
              <GameBio info={info} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {game.source === 'custom' && <button className="btn lg" onClick={() => onEdit({ id: game.customId, name: game.name, exe: game.exe, args: game.args, cover: game.cover || '', hero: game.hero || '', steamAppID: game.appid || '' })}><Pencil size={15} />Edit</button>}
              {game.source === 'custom' && <button className="btn lg danger" onClick={remove}><Trash2 size={15} /></button>}
              <button className={`btn lg ${fav ? 'gold' : ''}`} title={fav ? 'Unfavorite' : 'Favorite'} onClick={onFav}><Star size={16} fill={fav ? 'currentColor' : 'none'} /></button>
              <button className="btn lg" title={isHidden ? 'Unhide' : 'Hide from library'} onClick={onHide}>{isHidden ? <Eye size={16} /> : <EyeOff size={16} />}</button>
              <button className="btn lg" onClick={() => window.gjallar.showPath(game.dir)}><FolderOpen size={16} />Folder</button>
              <motion.button className="btn gold lg" onClick={play} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}><Play size={17} fill="currentColor" />Play</motion.button>
            </div>
          </div>
        </div>
        <div className="sheet-body one">
          <LaunchOptions game={game} engine={engine} />
          <div style={{ marginBottom: 30 }}><ProfHead rune="ᛈ" title="Launch profiles" /><div className="panel"><ProfileEditor gameKey={game.key} /></div></div>
          <div style={{ marginBottom: 30 }}><ProfHead rune="ᚷ" title="Controller layout" /><div className="panel"><LayoutEditor gameKey={game.key} /></div></div>
          <div style={{ height: 26 }} />
          <SavesPanel game={game} />
          {reports.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '-14px 0 28px' }}>
              <span className="muted" style={{ fontSize: 12.5, alignSelf: 'center' }}>Session reports:</span>
              {reports.slice(0, 5).map((r) => <button key={r.id} className="btn sm" onClick={() => openReport(r)}><Activity size={12} />{new Date(r.start).toLocaleDateString()} · {r.minutes} min</button>)}
            </div>
          )}
          <NewsPanel game={game} />
          {game.source === 'steam' && <AchievementsPanel game={game} />}
          <div style={{ height: 26 }} />
          <Optimizer game={game} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function CustomGameModal({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [g, setG] = useState(initial);
  const set = (k) => (e) => setG({ ...g, [k]: e.target.value });
  const pick = async () => {
    const exe = await window.gjallar.pickExe('Choose the game executable');
    if (exe) setG((s) => ({ ...s, exe, name: s.name || exe.split('\\').pop().replace(/\.exe$/i, '').replace(/[-_]/g, ' ') }));
  };
  const save = async () => {
    try {
      const appid = String(g.steamAppID || '').trim();
      await window.gjallar.saveCustomGame({
        ...g,
        steamAppID: appid || null,
        // A Steam app ID gives free official artwork.
        cover: g.cover || (appid ? steamImg.cover(appid) : ''),
        hero: g.hero || (appid ? steamImg.hero(appid) : ''),
      });
      toast({ kind: 'ok', title: initial.id ? 'Game updated' : 'Game added', body: g.name });
      onSaved();
    } catch (e) {
      toast({ kind: 'bad', title: 'Could not save', body: e.message });
    }
  };
  const field = (label, k, ph, extra) => (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" style={{ flex: 1 }} value={g[k] || ''} onChange={set(k)} placeholder={ph} />
        {extra}
      </div>
    </label>
  );
  return (
    <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ alignItems: 'center' }}>
      <motion.div className="sheet glass" style={{ width: 620, padding: 30 }} onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
        <div className="eyebrow">Custom launcher</div>
        <h2 className="h-title" style={{ fontSize: 24, marginBottom: 20 }}>{initial.id ? 'Edit game' : 'Add any game'}</h2>
        {field('Executable', 'exe', 'C:\\Games\\MyGame\\game.exe', <button className="btn" onClick={pick}><FolderOpen size={15} />Browse</button>)}
        {field('Name', 'name', 'My Game')}
        {field('Launch options (arguments)', 'args', '-dx12 -windowed  (optional)')}
        {field('Steam App ID for artwork (optional)', 'steamAppID', 'e.g. 1245620')}
        {field('Cover image URL (optional, 2:3)', 'cover', 'https://…')}
        {field('Banner image URL (optional, wide)', 'hero', 'https://…')}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn gold" disabled={!g.exe || !g.name} onClick={save}><Zap size={15} />{initial.id ? 'Save' : 'Add to library'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
