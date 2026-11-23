import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  House, Library, Joystick, Gamepad2, Tag, Settings2, Star, Play, Save, FolderOpen, Info, LogOut, Moon, RotateCw, Power,
  Zap, Volume2, VolumeX, X as XIcon, BatteryFull, BatteryMedium, BatteryLow, BatteryCharging, Clock, Gift, Monitor,
  Search, CloudDownload, Download, Users, Bookmark, KeyRound, Sun, BellOff, Wifi, ZoomIn, Contrast, Maximize, Timer, Newspaper, MessageCircle, ShoppingBag, Camera, Gauge,
} from 'lucide-react';
import { Wrench } from 'lucide-react';
import { Users as SbUsers, Power as SbPower, Download as SbDownload, Gauge as SbGauge, Gamepad2 as SbPad } from 'lucide-react';
import { Img } from './ui.jsx';
import { LaunchScreen } from './LaunchScreen.jsx';
import { HornLogo } from './Shell.jsx';
import { steamImg, epicFree, deals, money } from '../api.js';
import { EMULATORS } from '../data/emulators.js';
import { fmtPlaytime } from './SavesPanel.jsx';
import { gameInfo, TrailerVideo, GameBio } from './Trailer.jsx';
import { usePadInput } from '../hooks/usePadInput.js';
import GamePage from './couch/GamePage.jsx';
import SteamFriends from './couch/SteamFriends.jsx';
import Screenshots from './couch/Screenshots.jsx';
import InstallDialog from './couch/InstallDialog.jsx';
import Idle from './couch/Idle.jsx';
import Downloads from './couch/Downloads.jsx';
import QuickAccess from './couch/QuickAccess.jsx';
import Achievements from './couch/Achievements.jsx';
import Workshop from './couch/Workshop.jsx';
import PlayReports from './couch/PlayReports.jsx';
import Controllers from './couch/Controllers.jsx';
import ActivityFeed from './couch/ActivityFeed.jsx';
import PowerMenu from './couch/PowerMenu.jsx';
import { buildCollections } from '../lib/collections.js';
import CouchSplash from './couch/CouchSplash.jsx';
import Splash from './couch/Splashes.jsx';

const LOGO = (id) => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}/logo.png`;

// Standard gamepad mapping: 0 A, 1 B, 2 X, 3 Y, 4 LB, 5 RB, 8 Select, 9 Start, 12-15 D-pad.
export function usePadCombo(onCombo) {
  useEffect(() => {
    let raf, since = 0;
    const tick = () => {
      const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
      const held = document.hasFocus() && pads.some((p) => p.buttons[8]?.pressed && p.buttons[9]?.pressed);
      if (held) { since ||= performance.now(); if (performance.now() - since > 700) { since = Infinity; onCombo(); } }
      else since = 0;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onCombo]);
}

// Tiny synthesized UI sounds (no audio files).
let ctx;
function blip(kind, on) {
  if (!on) return;
  try {
    ctx ||= new AudioContext();
    const o = ctx.createOscillator(), g = ctx.createGain();
    const f = { move: 660, tab: 520, ok: 880, back: 330, fav: 990 }[kind] || 600;
    o.type = 'sine';
    o.frequency.setValueAtTime(f, ctx.currentTime);
    if (kind === 'ok') o.frequency.exponentialRampToValueAtTime(f * 1.5, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(kind === 'move' ? 0.025 : 0.05, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (kind === 'move' ? 0.06 : 0.14));
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.16);
  } catch {}
}

const TABS = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'retro', label: 'Retro', icon: Joystick },
  { id: 'emulators', label: 'Emulators', icon: Gamepad2 },
  { id: 'store', label: 'Store', icon: ShoppingBag },
  { id: 'deals', label: 'Deals', icon: Tag },
  { id: 'system', label: 'System', icon: Settings2 },
];

const SHELF_PRESETS = ['Couch co-op', 'Chill', 'Backlog', 'Finish this month'];
const KEYROWS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ0123', '456789'];
const has = (info, re) => !!info?.categories?.some((c) => re.test(c));
const genre = (name) => (g, info) => !!info?.genres?.includes(name);
// Library filters. `test(game, info)` where info = Steam store data (categories + genres), loaded in the background.
const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'steam', label: 'Steam', test: (g) => g.source === 'steam' },
  { id: 'epic', label: 'Epic', test: (g) => g.source === 'epic' },
  { id: 'custom', label: 'Custom', test: (g) => g.source === 'custom' },
  { id: 'riot', label: 'Riot', test: (g) => g.source === 'riot' },
  { id: 'gog', label: 'GOG', test: (g) => g.source === 'gog' },
  { id: 'ubisoft', label: 'Ubisoft', test: (g) => g.source === 'ubisoft' },
  { id: 'battlenet', label: 'Battle.net', test: (g) => g.source === 'battlenet' },
  { id: 'ea', label: 'EA', test: (g) => g.source === 'ea' },
  { id: 'controller', label: 'Controller friendly', test: (g, i) => has(i, /controller support/i) },
  { id: 'coop', label: 'Co-op', test: (g, i) => has(i, /co-op/i) },
  { id: 'local', label: 'Local / split-screen', test: (g, i) => has(i, /shared\/split screen/i) },
  { id: 'single', label: 'Single-player', test: (g, i) => has(i, /single-player/i) },
  { id: 'multi', label: 'Multiplayer', test: (g, i) => has(i, /multi-player/i) },
  { id: 'action', label: 'Action', test: genre('Action') },
  { id: 'rpg', label: 'RPG', test: genre('RPG') },
  { id: 'adventure', label: 'Adventure', test: genre('Adventure') },
  { id: 'strategy', label: 'Strategy', test: genre('Strategy') },
  { id: 'indie', label: 'Indie', test: genre('Indie') },
];
// A–Z helpers (ignore a leading "The/A/An").
const nameKey = (t) => (t || '').trim().replace(/^(the|a|an)\s+/i, '').toLowerCase();
const letterOf = (t) => { const c = nameKey(t)[0]?.toUpperCase() || '#'; return /[A-Z]/.test(c) ? c : '#'; };
const byName = (a, b) => nameKey(a.title).localeCompare(nameKey(b.title), undefined, { numeric: true });

// Colour helpers for the dynamic accent.
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixWhite = (h, t) => '#' + hexRgb(h).map((v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, '0')).join('');
const rgba = (h, a) => `rgba(${hexRgb(h).join(',')},${a})`;

function Battery() {
  const [b, setB] = useState(null);
  useEffect(() => {
    navigator.getBattery?.().then((x) => { const u = () => setB({ level: x.level, charging: x.charging }); u(); x.addEventListener('levelchange', u); x.addEventListener('chargingchange', u); });
  }, []);
  if (!b) return null;
  const I = b.charging ? BatteryCharging : b.level > 0.6 ? BatteryFull : b.level > 0.25 ? BatteryMedium : BatteryLow;
  return <span className="couch-stat"><I size={20} />{Math.round(b.level * 100)}%</span>;
}

const next = (arr, v) => arr[(arr.indexOf(v) + 1) % arr.length] ?? arr[0];

export default function CouchMode({ library, settings, saveSettings, onClose, toast }) {
  const [roms, setRoms] = useState([]);
  const [art, setArt] = useState({});
  const [emu, setEmu] = useState({});
  const [pt, setPt] = useState({});
  const [free, setFree] = useState([]);
  const [top, setTop] = useState([]);
  const [owned, setOwned] = useState(null);
  const [friends, setFriends] = useState([]);
  const [dls, setDls] = useState([]);
  const [infoMap, setInfoMap] = useState({});
  const [qs, setQs] = useState(null);
  const [disp, setDisp] = useState({ list: [], current: null });
  const [tab, setTab] = useState(0);
  const [pos, setPos] = useState({ r: 0, c: 0 });
  const [zone, setZone] = useState('rows'); // 'tabs' | 'rows'
  const [menu, setMenu] = useState(null); // { title, items: [{label, icon, run}], i }
  const [page, setPage] = useState(null); // game tile whose full page is open
  const [friendsOpen, setFriendsOpen] = useState(false); // Steam friends / chat / invites screen
  const [storeData, setStoreData] = useState(null); // Steam store sections for the Store tab
  const [shotItems, setShotItems] = useState(null); // screenshot gallery (null = closed)
  const [actOpen, setActOpen] = useState(false); // friends activity feed
  const [powerOpen, setPowerOpen] = useState(false); // power menu
  const [side, setSide] = useState(null); // Big-Picture-style left sidebar: { i } when open
  const [padsOpen, setPadsOpen] = useState(false); // controller manager page
  const [repOpen, setRepOpen] = useState(false); // play reports page
  const [wsGame, setWsGame] = useState(null); // Steam Workshop page for a game tile
  const [achGame, setAchGame] = useState(null); // achievements page for a Steam game tile
  const [qaOpen, setQaOpen] = useState(false); // quick access side panel
  const [dlOpen, setDlOpen] = useState(false); // downloads manager page
  const [installTile, setInstallTile] = useState(null); // Steam game being installed through Gjallarhorn's own install screen
  const [newsItems, setNewsItems] = useState([]); // recent patch notes across the library
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [hud, setHud] = useState(null);
  const [idle, setIdle] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [afterDl, setAfterDl] = useState('none');
  const [accent, setAccent] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [pad, setPad] = useState(false);
  const [launching, setLaunching] = useState(null);
  const [running, setRunning] = useState(''); // name of the tracked game that is currently running (for the "Now playing" row)
  const rowRefs = useRef([]);
  const lastInput = useRef(Date.now());
  const pageInput = useRef(null);
  const hudTimer = useRef(null);
  const prevActive = useRef(0);
  const sounds = settings?.couchSounds !== false;
  const favs = new Set(settings?.favorites || []);
  const tabId = TABS[tab].id;

  useEffect(() => {
    window.gjallar.setFullscreen(true);
    window.gjallar.romScan().then((l) => { setRoms(l); window.gjallar.romArt(l).then(setArt).catch(() => {}); }).catch(() => {});
    window.gjallar.emuStatus(EMULATORS.map((e) => ({ id: e.id, paths: e.paths }))).then(setEmu);
    window.gjallar.playtime().then(setPt).catch(() => {});
    window.gjallar.newsFeed().then((n) => setNewsItems(n || [])).catch(() => {});
    epicFree().then(setFree).catch(() => {});
    deals({ aaa: true }).then((d) => setTop(d.filter((x, i, a) => a.findIndex((y) => y.gameID === x.gameID) === i).slice(0, 20))).catch(() => {});
    // Prefer the live Steam chat connection (richer, instant); fall back to the Web API friends list.
    const loadFriends = () => window.gjallar.chat.status().then((s) => (s.status === 'online' ? window.gjallar.chat.friends().then((r) => setFriends(r.friends.filter((f) => f.state > 0 || f.appid).map((f) => ({ id: f.id, name: f.name, avatar: f.avatar, game: f.game, gameid: f.appid })))) : window.gjallar.steamFriends().then((r) => setFriends(r.friends || [])))).catch(() => {});
    const loadDls = () => window.gjallar.downloads().then(setDls, () => {});
    loadFriends(); loadDls();
    window.gjallar.displaysList().then(setDisp, () => {});
    const t1 = setInterval(() => setClock(new Date()), 10000);
    const t2 = setInterval(loadFriends, 120000);
    const t3 = setInterval(loadDls, 8000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); window.gjallar.setFullscreen(false); };
  }, []);

  // Per-tab lazy loads: owned-but-not-installed games, Steam store info for filters, quick settings.
  useEffect(() => {
    if ((tabId === 'library' || tabId === 'search') && !owned) window.gjallar.ownedList().then(setOwned, (e) => setOwned({ games: [], errors: [e.message] }));
    if (tabId === 'system') { window.gjallar.qsGet().then(setQs, () => {}); window.gjallar.displaysList().then(setDisp, () => {}); }
  }, [tabId]);
  useEffect(() => {
    if (tabId !== 'library') return;
    let dead = false;
    const queue = library.games.filter((g) => g.appid && !infoMap[g.appid]).slice(0, 150);
    const worker = async () => {
      while (queue.length && !dead) {
        const g = queue.shift();
        const i = await gameInfo(g.appid);
        if (i && !dead) setInfoMap((m) => ({ ...m, [g.appid]: i }));
      }
    };
    Promise.all([worker(), worker(), worker(), worker()]);
    return () => { dead = true; };
  }, [tabId, library.games.length]);

  // Downloads finishing → optional sleep/shutdown with a cancellable countdown.
  useEffect(() => {
    const active = dls.filter((d) => d.state === 'Downloading' || d.state === 'Updating').length;
    if (afterDl !== 'none' && prevActive.current > 0 && active === 0) setCountdown({ what: afterDl, left: 30 });
    prevActive.current = active;
  }, [dls]);
  useEffect(() => {
    if (!countdown) return;
    if (countdown.left <= 0) { window.gjallar.power(countdown.what); setCountdown(null); return; }
    const t = setTimeout(() => setCountdown((c) => c && { ...c, left: c.left - 1 }), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Idle: after a few minutes without input, show the ambient slideshow.
  useEffect(() => {
    const t = setInterval(() => {
      const min = settings?.couchIdleMin ?? 3;
      if (min > 0 && !launching && !idle && Date.now() - lastInput.current > min * 60000) setIdle(true);
    }, 5000);
    return () => clearInterval(t);
  }, [settings?.couchIdleMin, launching, idle]);

  // ---------- content ----------
  const gameTile = (g) => ({
    key: g.key, title: g.name, kind: 'game', game: g, appid: g.appid,
    img: [g.cover, g.appid && steamImg.cover(g.appid)], hero: [g.hero, g.appid && steamImg.hero(g.appid), g.header], logo: g.appid ? LOGO(g.appid) : null,
    sub: { steam: 'Steam', epic: 'Epic Games', custom: 'Custom', riot: 'Riot Games', gog: 'GOG', ubisoft: 'Ubisoft Connect', battlenet: 'Battle.net', ea: 'EA', shortcut: 'Steam shortcut' }[g.source],
    meta: [g.updateRequired ? 'Update queued' : null, pt[g.key] ? `${fmtPlaytime(pt[g.key].total)} played` : null, g.lastPlayed || pt[g.key]?.last ? `Last played ${new Date(Math.max(g.lastPlayed || 0, pt[g.key]?.last || 0)).toLocaleDateString()}` : null].filter(Boolean),
    run: () => window.gjallar.launchGame(g),
  });
  const romTile = (x) => ({
    key: x.id, title: x.title, kind: 'rom', rom: x, img: [art[x.id]], hero: [art[x.id]], contain: true, sub: x.systemName,
    meta: [EMULATORS.find((e) => e.id === x.emu)?.name].filter(Boolean),
    run: () => window.gjallar.romLaunch(x, emu[x.emu]?.exe),
  });
  const ownedTile = (g) => ({
    key: g.key, title: g.name, kind: 'owned', appid: g.appid, img: [g.cover, g.appid && steamImg.cover(g.appid)], hero: [g.appid && steamImg.hero(g.appid)], logo: g.appid ? LOGO(g.appid) : null,
    sub: 'Not installed', meta: [g.playtimeMin ? `${Math.round(g.playtimeMin / 60)} h on Steam` : null, 'Press A to install'].filter(Boolean),
    run: async () => {
      if (g.appid && /^steam:/i.test(g.install || '')) return setInstallTile({ title: g.name, appid: g.appid, hero: [g.appid && steamImg.hero(g.appid)] }); // our own screen; Steam shows no dialog
      await window.gjallar.installOwned(g); toast({ kind: 'ok', title: 'Opening the installer…', body: `${g.name}: pick a drive and it downloads. Watch progress on Home.` }); },
  });
  const friendTile = (f) => ({
    key: 'fr-' + f.id, title: f.name, kind: 'friend', img: [f.avatar], sub: f.game ? `Playing ${f.game}` : 'Online', meta: [f.game ? (f.lobby ? 'Press A to join' : 'Press A to message') : 'Press A to message'],
    run: () => setFriendsOpen(true),
  });
  const downloadTile = (d) => ({
    key: 'dl-' + d.appid, title: d.name, kind: 'download', appid: d.appid, img: [d.cover], hero: [steamImg.hero(d.appid)], sub: d.state, p: d.percent,
    meta: [d.total ? `${(d.downloaded / 1e9).toFixed(1)} of ${(d.total / 1e9).toFixed(1)} GB` : d.state], run: () => {},
  });
  const action = (key, title, icon, run, sub, danger) => ({ key, title, icon, run, sub, kind: 'action', danger });
  const passes = (g) => (FILTERS.find((f) => f.id === filter) || FILTERS[0]).test(g, g.appid ? infoMap[g.appid] : null);

  const typeKey = (ch) => {
    blip('move', sounds);
    if (ch === 'BS') setQuery((q) => q.slice(0, -1));
    else if (ch === 'CLEAR') setQuery('');
    else setQuery((q) => (q + ch.toLowerCase()).replace(/^\s+/, '').replace(/\s{2,}/g, ' '));
  };

  const rows = useMemo(() => {
    const games = library.games;
    const all = [...games.map(gameTile), ...roms.map(romTile)];
    const r = [];
    if (tabId === 'home') {
      if (running) r.push({ title: `Now playing · ${running}`, icon: Play, items: [
        action('np-close', 'Close game', XIcon, () => window.gjallar.closeGame(false), `Quit ${running} cleanly`, true),
        action('np-force', 'Force quit', Zap, () => window.gjallar.closeGame(true), 'If it is frozen', true),
      ] });
      if (dls.length) r.push({ title: 'Downloading', icon: Download, items: dls.map(downloadTile) });
      const f = all.filter((t) => favs.has(t.key));
      if (f.length) r.push({ title: 'Favorites', icon: Star, items: f });
      for (const [name, keys] of Object.entries(settings?.shelves || {})) {
        const items = keys.map((k) => all.find((t) => t.key === k)).filter(Boolean);
        if (items.length) r.push({ title: name, icon: Bookmark, items });
      }
      const recent = games.filter((g) => g.lastPlayed || pt[g.key]).sort((a, b) => Math.max(b.lastPlayed || 0, pt[b.key]?.last || 0) - Math.max(a.lastPlayed || 0, pt[a.key]?.last || 0)).slice(0, 12);
      if (recent.length) r.push({ title: 'Jump back in', icon: Clock, items: recent.map(gameTile) });
      const most = games.filter((g) => pt[g.key]).sort((a, b) => pt[b.key].total - pt[a.key].total).slice(0, 12);
      if (most.length) r.push({ title: 'Most played', icon: Zap, items: most.map(gameTile) });
      r.push({ title: 'Friends', icon: Users, items: [action('open-friends', 'Friends & chat', MessageCircle, () => setFriendsOpen(true), 'Messages, invites, join games'), action('open-activity', 'Friends activity', Users, () => setActOpen(true), 'Who is playing what'), ...friends.slice(0, 20).map(friendTile)] });
      if (newsItems.length) r.push({ title: "What's new in your games", icon: Newspaper, items: newsItems.slice(0, 12).map((n) => ({ key: 'nw-' + n.id, title: n.title, kind: 'deal', appid: String(n.appid), img: [steamImg.cover(n.appid)], hero: [steamImg.hero(n.appid)], sub: n.game, meta: [new Date(n.date).toLocaleDateString()], run: () => window.gjallar.open(n.url) })) });
      if (!r.length) r.push({ title: 'Library', icon: Library, items: games.map(gameTile).sort(byName) });
    }
    if (tabId === 'library') {
      r.push({ title: 'Filters', icon: Search, items: FILTERS.map((f) => ({ key: 'f-' + f.id, title: f.label, kind: 'filter', fid: f.id, active: filter === f.id, sub: 'Filter', count: games.filter((g) => f.test(g, g.appid ? infoMap[g.appid] : null)).length })) });
      if (filter === 'all') {
        const ICONS = { Star, Clock, Download, Folder: FolderOpen };
        for (const c of buildCollections(games, { favorites: [...favs], collections: settings?.collections }).filter((x) => !/^(source:|ready$)/.test(x.id)))
          r.push({ title: c.label, icon: ICONS[c.icon] || Library, items: c.games.map(gameTile) });
      }
      const list = games.filter(passes).map(gameTile).sort(byName);
      r.push({ title: filter === 'all' ? 'All games · L2/R2 jump A–Z' : `${FILTERS.find((f) => f.id === filter)?.label} · L2/R2 jump A–Z`, icon: Library, items: list });
      if (filter === 'all') {
        if (owned?.games?.length) r.push({ title: 'Not installed · press A to install', icon: CloudDownload, items: owned.games.slice(0, 400).map(ownedTile) });
        else if (owned?.errors?.length) r.push({ title: 'Not installed', icon: CloudDownload, items: [action('keyhelp', 'Connect Steam', KeyRound, () => toast({ kind: 'info', title: 'Add your Steam Web API key', body: 'Desktop app → Settings → Store accounts' }), owned.errors[0])] });
      }
    }
    if (tabId === 'search') {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const match = (t) => words.every((w) => t.toLowerCase().includes(w));
      const resGames = words.length ? games.filter((g) => match(g.name)).map(gameTile).sort(byName) : [];
      const resRoms = words.length ? roms.filter((x) => match(x.title)).map(romTile).sort(byName) : [];
      const resOwned = words.length ? (owned?.games || []).filter((g) => match(g.name)).slice(0, 40).map(ownedTile) : [];
      const total = resGames.length + resRoms.length + resOwned.length;
      const tag = { sub: 'Search', icon: Search, meta: [words.length ? `${total} result${total === 1 ? '' : 's'}` : 'Use the stick, or just type'] };
      KEYROWS.forEach((row, ri) => r.push({ title: ri === 0 ? `Search: ${query || '…'}` : '', icon: Search, keys: true, items: [...row].map((ch) => ({ key: 'k-' + ch, title: query || 'Type to search', kind: 'key', ch, ...tag })) }));
      r.push({ title: '', icon: Search, keys: true, items: [['Space', ' '], ['Delete', 'BS'], ['Clear', 'CLEAR']].map(([t, ch]) => ({ key: 'k-' + t, title: query || 'Type to search', kind: 'key', ch, label: t, ...tag })) });
      if (resGames.length) r.push({ title: 'Games', icon: Library, items: resGames });
      if (resRoms.length) r.push({ title: 'Retro', icon: Joystick, items: resRoms });
      if (resOwned.length) r.push({ title: 'Not installed', icon: CloudDownload, items: resOwned });
    }
    if (tabId === 'retro') {
      const by = new Map();
      for (const x of roms) (by.get(x.systemName) || by.set(x.systemName, []).get(x.systemName)).push(x);
      for (const [name, l] of by) r.push({ title: name, icon: Joystick, items: l.map(romTile).sort(byName) });
    }
    if (tabId === 'emulators') {
      const ready = EMULATORS.filter((e) => emu[e.id]?.exe);
      if (ready.length) r.push({ title: 'Ready to play', icon: Gamepad2, items: ready.map((e) => ({ key: e.id, title: e.name, kind: 'emu', accent: e.accent, sub: e.system, meta: [e.blurb], run: () => window.gjallar.launchExe(emu[e.id].exe) })) });
    }
    if (tabId === 'store') {
      if (settings?.wishlist?.length) r.push({ title: 'Your wishlist', icon: Star, items: settings.wishlist.map((w) => ({ key: 'wl-' + w.gameID, title: w.title, kind: 'deal', img: [w.thumb], hero: [w.thumb], sub: w.lastPrice != null ? money(w.lastPrice) : 'Watching', meta: [w.targetPrice ? `Alert at ${money(w.targetPrice)}` : 'Price watch'], run: () => window.gjallar.open(`https://store.steampowered.com/search/?term=${encodeURIComponent(w.title)}`) })) });
      for (const sec of storeData || []) r.push({ title: sec.title, icon: ShoppingBag, items: sec.items.map((i) => ({ key: 'st-' + sec.id + i.appid, title: i.name, kind: 'deal', appid: String(i.appid), img: [steamImg.cover(i.appid), i.image], hero: [steamImg.hero(i.appid)], logo: LOGO(i.appid), sub: i.price == null ? 'See store' : i.discountPercent ? `${money(i.price)} · was ${money(i.original)}` : money(i.price), meta: [i.discountPercent ? `${i.discountPercent}% off` : sec.title], run: () => window.gjallar.open(`https://store.steampowered.com/app/${i.appid}`) })) });
      if (!storeData) r.push({ title: 'Loading the Steam store…', icon: ShoppingBag, items: [action('st-load', 'Loading…', ShoppingBag, () => {}, 'Fetching featured games')] });
    }
    if (tabId === 'deals') {
      if (free.length) r.push({ title: 'Free on Epic', icon: Gift, items: free.map((g) => ({ key: g.id, title: g.title, kind: 'deal', img: [g.tall, g.image], hero: [g.image], sub: g.now ? 'Free now' : 'Free soon', meta: [g.now ? 'Claim it in your browser' : 'Coming soon'], run: () => window.gjallar.open(g.url) })) });
      if (top.length) r.push({ title: 'Best deals', icon: Tag, items: top.map((d) => ({ key: d.dealID, title: d.title, kind: 'deal', appid: d.steamAppID, img: [d.steamAppID && steamImg.cover(d.steamAppID), d.thumb], hero: [d.steamAppID && steamImg.hero(d.steamAppID)], logo: d.steamAppID ? LOGO(d.steamAppID) : null, sub: `${money(d.salePrice)} · was ${money(d.normalPrice)}`, meta: [`${Math.round(d.savings)}% off`], run: () => window.gjallar.open(`https://www.cheapshark.com/redirect?dealID=${d.dealID}`) })) });
    }
    if (tabId === 'system') {
      const scale = settings?.couchScale || 1;
      const curDisp = disp.list.find((d) => d.id === (disp.current ?? settings?.couchDisplayId)) || disp.list.find((d) => d.primary);
      const bri = qs?.brightness;
      r.push({ title: 'Gjallarhorn', icon: Monitor, items: [
        action('exit', 'Exit couch mode', LogOut, async () => onClose(), 'Back to the desktop app'),
        action('qa', 'Quick access', Gauge, () => setQaOpen(true), 'Volume, Wi-Fi, battery, CPU/GPU/RAM'),
        action('power', 'Power menu', Power, () => setPowerOpen(true), 'Sleep, restart, shut down'),
        action('pads', 'Controllers', Gamepad2, () => setPadsOpen(true), 'Battery and button test'),
        action('downloads', 'Downloads', Download, () => setDlOpen(true), 'Queue, progress and speed'),
        action('shots', 'Screenshots', Camera, () => window.gjallar.shotsList().then(setShotItems).catch((e) => toast({ kind: 'bad', title: "Couldn't load screenshots", body: e.message })), 'Steam and Gjallarhorn captures'),
        action('boost', settings?.boost?.priority === false ? 'Game Boost: off' : 'Game Boost: on', Zap, () => saveSettings({ boost: { ...(settings?.boost || {}), priority: settings?.boost?.priority === false, wallpaper: settings?.boost?.priority === false } }), 'High priority + pause wallpaper'),
        action('ingame', settings?.inGameMenu === false ? 'In-game menu: off' : 'In-game menu: on', Gamepad2, () => saveSettings({ inGameMenu: settings?.inGameMenu === false }), 'Hold the PS/Guide button in a game'),
        action('sound', sounds ? 'UI sounds: on' : 'UI sounds: off', sounds ? Volume2 : VolumeX, () => saveSettings({ couchSounds: !sounds }), 'Navigation blips'),
        action('trailer', settings?.couchTrailerSound ? 'Trailer sound: on' : 'Trailer sound: off', settings?.couchTrailerSound ? Volume2 : VolumeX, () => saveSettings({ couchTrailerSound: !settings?.couchTrailerSound }), 'Play trailer audio'),
        action('quit', 'Close Gjallarhorn', XIcon, () => confirmThen('Close Gjallarhorn?', () => window.gjallar.power('quit')), 'Quit the app', true),
      ] });
      r.push({ title: 'Screen & TV', icon: Monitor, items: [
        action('disp', `Couch screen: ${curDisp ? curDisp.label : '…'}`, Monitor, cycleDisplay, 'Which monitor Couch mode opens on'),
        action('scale', `Text size: ${Math.round(scale * 100)}%`, ZoomIn, () => saveSettings({ couchScale: next([0.9, 1, 1.15, 1.3, 1.5], scale) }), 'Bigger for TV distance'),
        action('safe', `Safe area: ${settings?.couchSafe || 0}%`, Maximize, () => saveSettings({ couchSafe: next([0, 2, 4, 6], settings?.couchSafe || 0) }), 'Margin for TVs that crop the edges'),
        action('contrast', settings?.couchContrast ? 'High contrast: on' : 'High contrast: off', Contrast, () => saveSettings({ couchContrast: !settings?.couchContrast }), 'Darker backdrop, brighter outlines'),
        action('idle', `Idle slideshow: ${(settings?.couchIdleMin ?? 3) ? `${settings?.couchIdleMin ?? 3} min` : 'off'}`, Timer, () => saveSettings({ couchIdleMin: next([0, 1, 3, 5, 10], settings?.couchIdleMin ?? 3) }), 'Ambient art after no input'),
      ] });
      r.push({ title: 'Quick settings', icon: Sun, items: [
        action('vdn', 'Volume −', Volume2, () => window.gjallar.qsVolume('down'), '−10%'),
        action('vup', 'Volume +', Volume2, () => window.gjallar.qsVolume('up'), '+10%'),
        action('vmute', 'Mute', VolumeX, () => window.gjallar.qsVolume('mute'), 'Toggle mute'),
        action('bdn', `Brightness −${bri != null ? ` (${bri}%)` : ''}`, Sun, () => brightness(-10), 'Laptop screen'),
        action('bup', `Brightness +${bri != null ? ` (${bri}%)` : ''}`, Sun, () => brightness(10), 'Laptop screen'),
        action('dnd', qs?.dnd ? 'Do Not Disturb: on' : 'Do Not Disturb: off', BellOff, async () => { const on = await window.gjallar.qsDnd(!qs?.dnd); setQs((q) => ({ ...q, dnd: on })); }, 'Hide notification banners'),
        action('wifi', qs?.wifi ? qs.wifi.ssid : 'No Wi-Fi', Wifi, () => {}, qs?.wifi ? `Signal ${qs.wifi.signal}%` : 'Not connected'),
        action('afterdl', `When downloads finish: ${{ none: 'do nothing', sleep: 'sleep', shutdown: 'shut down' }[afterDl]}`, Download, () => setAfterDl(next(['none', 'sleep', 'shutdown'], afterDl)), 'While Couch mode is open'),
      ] });
      r.push({ title: 'Power', icon: Power, items: [
        action('sleep', 'Sleep', Moon, () => confirmThen('Put the PC to sleep?', () => window.gjallar.power('sleep')), 'Suspend the PC'),
        action('restart', 'Restart', RotateCw, () => confirmThen('Restart the PC?', () => window.gjallar.power('restart')), 'In 5 seconds', true),
        action('shutdown', 'Shut down', Power, () => confirmThen('Shut down the PC?', () => window.gjallar.power('shutdown')), 'In 5 seconds', true),
      ] });
    }
    return r.filter((x) => x.items.length);
  }, [tab, library.games, roms, art, emu, pt, free, top, settings, owned, friends, dls, infoMap, filter, query, qs, disp, afterDl, running, storeData, newsItems]);

  const cur = rows[pos.r]?.items[Math.min(pos.c, (rows[pos.r]?.items.length || 1) - 1)];

  // Trailer + bio for the focused game (Steam store API). Debounced so scrolling quickly doesn't fetch every tile.
  const [curInfo, setCurInfo] = useState(null);
  const trailerSound = settings?.couchTrailerSound === true;
  useEffect(() => {
    setCurInfo(null);
    if (!cur?.appid || zone !== 'rows') return;
    const key = cur.key;
    const t = setTimeout(() => gameInfo(cur.appid).then((i) => i && setCurInfo({ ...i, key })), 450);
    return () => clearTimeout(t);
  }, [cur?.key, zone]);

  // Dynamic accent: tint the interface with the dominant colour of the focused game's art.
  useEffect(() => {
    const url = cur?.hero?.find((u) => typeof u === 'string' && /steamstatic\.com/.test(u));
    if (!url) { setAccent(null); return; }
    let dead = false;
    const t = setTimeout(() => window.gjallar.dominantColor(url).then((c) => !dead && setAccent(c), () => {}), 300);
    return () => { dead = true; clearTimeout(t); };
  }, [cur?.key]);

  function confirmThen(title, run) {
    setMenu({ title, items: [{ label: 'Yes', icon: Power, run }, { label: 'Cancel', icon: XIcon, run: () => {} }], i: 1 });
  }
  async function cycleDisplay() {
    if (disp.list.length < 2) return toast({ kind: 'info', title: 'Only one screen detected', body: 'Plug in a second display or TV to choose between them.' });
    const curId = disp.current ?? settings?.couchDisplayId ?? disp.list.find((d) => d.primary)?.id;
    const nx = disp.list[(disp.list.findIndex((d) => d.id === curId) + 1) % disp.list.length];
    await window.gjallar.setCouchDisplay(nx.id);
    setDisp((d) => ({ ...d, current: nx.id }));
    toast({ kind: 'ok', title: 'Couch screen changed', body: nx.label });
  }
  async function brightness(d) {
    const v = await window.gjallar.qsBrightness(d);
    if (v == null) toast({ kind: 'info', title: 'Brightness', body: 'Only the laptop screen can be changed from here.' });
    else setQs((q) => ({ ...q, brightness: v }));
  }
  const toggleFav = (t) => {
    const nextFavs = favs.has(t.key) ? [...favs].filter((k) => k !== t.key) : [...favs, t.key];
    saveSettings({ favorites: nextFavs });
    blip('fav', sounds);
    toast({ kind: 'ok', title: favs.has(t.key) ? 'Removed from favorites' : 'Added to favorites', body: t.title });
  };
  const toggleShelf = (name, t) => {
    const shelves = { ...(settings?.shelves || {}) };
    const list = shelves[name] || [];
    shelves[name] = list.includes(t.key) ? list.filter((k) => k !== t.key) : [...list, t.key];
    if (!shelves[name].length) delete shelves[name];
    saveSettings({ shelves });
    blip('fav', sounds);
    toast({ kind: 'ok', title: list.includes(t.key) ? `Removed from "${name}"` : `Added to "${name}"`, body: t.title });
  };
  const shelfMenu = (t) => ({
    title: 'Add to shelf', i: 0,
    items: SHELF_PRESETS.map((name) => ({ label: `${(settings?.shelves?.[name] || []).includes(t.key) ? '✓ ' : ''}${name}`, icon: Bookmark, run: () => toggleShelf(name, t) })),
  });
  const backup = async (t) => {
    try { await window.gjallar.saveBackup(t.game); toast({ kind: 'ok', title: 'Saves backed up', body: t.title }); }
    catch (e) { toast({ kind: 'bad', title: 'Backup failed', body: e.message }); }
  };
  const optionsFor = (t) => {
    if (!t || (t.kind !== 'game' && t.kind !== 'rom')) return null;
    const items = [{ label: 'Play', icon: Play, run: () => activate(t) }];
    if (t.kind === 'game') items.push({ label: 'Game page', icon: Newspaper, run: () => setPage(t) });
    if (t.kind === 'game' && t.game?.source === 'steam' && t.appid) items.push({ label: 'Achievements', icon: Star, run: () => setAchGame(t) });
    if (t.kind === 'game' && t.game?.source === 'steam' && t.appid) items.push({ label: 'Workshop / mods', icon: Wrench, run: () => setWsGame(t) });
    items.push({ label: favs.has(t.key) ? 'Remove from favorites' : 'Add to favorites', icon: Star, run: () => toggleFav(t) });
    items.push({ label: 'Add to shelf…', icon: Bookmark, run: () => setMenu(shelfMenu(t)) });
    if (t.kind === 'game') {
      items.push({ label: 'Back up saves now', icon: Save, run: () => backup(t) });
      items.push({ label: 'Open game folder', icon: FolderOpen, run: () => window.gjallar.showPath(t.game.dir) });
      if (t.game.appid) items.push({ label: 'Store page', icon: Info, run: () => window.gjallar.open(`https://store.steampowered.com/app/${t.game.appid}`) });
    } else items.push({ label: 'Open file location', icon: FolderOpen, run: () => window.gjallar.showPath(t.rom.path.replace(/\\[^\\]+$/, '')) });
    return { title: t.title, items, i: 0 };
  };

  async function activate(t = cur) {
    if (!t) return;
    if (t.kind === 'key') return typeKey(t.ch);
    if (t.kind === 'filter') { blip('ok', sounds); setFilter(t.fid); return; }
    blip('ok', sounds);
    const playable = t.kind === 'game' || t.kind === 'rom' || t.kind === 'emu';
    if (playable) setLaunching({ key: t.key, title: t.title, hero: t.hero, logo: t.logo, accent: t.accent, phase: 'starting', tracked: t.kind === 'game' });
    try {
      await t.run();
      // ROMs/emulators aren't session-tracked: drop the splash once the emulator has had time to take over.
      if (playable && t.kind !== 'game') setTimeout(() => setLaunching((l) => (l?.key === t.key ? null : l)), 9000);
    } catch (e) {
      setLaunching(null);
      toast({ kind: 'bad', title: "Can't do that", body: e.message });
    }
  }
  // Session events drive the launch screen (waiting → running → back to couch on exit).
  useEffect(() => {
    window.gjallar.sessionStatus().then((s) => setRunning(s?.running ? s.name : '')).catch(() => {});
    return window.gjallar.onSession((ev) => setRunning(ev.state === 'running' || ev.state === 'waiting' ? ev.name || ev.game || '' : ''));
  }, []);
  useEffect(() => window.gjallar.onSession((ev) => {
    setLaunching((l) => {
      if (!l || !l.tracked) return l;
      if (ev.state === 'running') return { ...l, phase: 'playing', actions: ev.actions };
      if (ev.state === 'ended' || ev.state === 'gave-up') return null;
      return l;
    });
    if (ev.state === 'ended') window.gjallar.playtime().then(setPt).catch(() => {});
  }), []);

  useEffect(() => { if (TABS[tab]?.id === 'store' && !storeData) window.gjallar.storeFeatured().then(setStoreData).catch(() => setStoreData([])); }, [tab, storeData]);
  // The in-game menu asks couch mode to open a specific page (Friends, Downloads, Power…).
  useEffect(() => window.gjallar.onCouchPage((pg) => { setLaunching(null); if (pg === 'friends') setFriendsOpen(true); if (pg === 'downloads') setDlOpen(true); if (pg === 'power') setPowerOpen(true); if (pg === 'quick') setQaOpen(true); if (pg === 'pads') setPadsOpen(true); }), []);
  // Home/Guide tap while couch mode is already focused: close any popups and jump to the Home tab (like Steam's Home button).
  useEffect(() => window.gjallar.onCouchHome(() => { setLaunching(null); setMenu(null); setPage(null); setFriendsOpen(false); setShotItems(null); setInstallTile(null); setDlOpen(false); setQaOpen(false); setAchGame(null); setWsGame(null); setRepOpen(false); setPadsOpen(false); setActOpen(false); setPowerOpen(false); setIdle(false); gotoTab('home'); }), []);
  const switchTab = (d) => { const n = (tab + d + TABS.length) % TABS.length; setTab(n); setPos({ r: TABS[n].id === 'library' ? 1 : 0, c: 0 }); blip('tab', sounds); };
  const sideItems = () => [
    ...TABS.map((t) => ({ key: t.id, label: t.label, icon: t.icon, run: () => gotoTab(t.id) })),
    { key: 'friends', label: 'Friends', icon: SbUsers, run: () => setFriendsOpen(true) },
    { key: 'downloads', label: 'Downloads', icon: SbDownload, run: () => setDlOpen(true) },
    { key: 'reports', label: 'Play reports', icon: SbGauge, run: () => setRepOpen(true) },
    { key: 'quick', label: 'Quick access', icon: SbGauge, run: () => setQaOpen(true) },
    { key: 'pads', label: 'Controllers', icon: SbPad, run: () => setPadsOpen(true) },
    { key: 'power', label: 'Power', icon: SbPower, run: () => setPowerOpen(true) },
  ];
  const gotoTab = (id) => { const n = TABS.findIndex((t) => t.id === id); setTab(n); setPos({ r: 0, c: 0 }); setZone('rows'); blip('tab', sounds); };
  const move = (dr, dc) => {
    if (zone === 'tabs') {
      if (dc) switchTab(dc);
      if (dr > 0) { setZone('rows'); blip('move', sounds); }
      return;
    }
    if (dr < 0 && pos.r === 0) { setZone('tabs'); blip('move', sounds); return; }
    setPos((p) => {
      const r = Math.max(0, Math.min(rows.length - 1, p.r + dr));
      const len = rows[r]?.items.length || 1;
      return { r, c: Math.max(0, Math.min(len - 1, Math.min(p.c, len - 1) + dc)) };
    });
    blip('move', sounds);
  };
  // L2 / R2: jump to the previous / next letter in the current (alphabetical) row.
  const jump = (dir) => {
    const items = rows[pos.r]?.items;
    if (!items?.length || zone !== 'rows') return;
    const L = items.map((i) => letterOf(i.title));
    const c = Math.min(pos.c, items.length - 1);
    const start = (idx) => { let s = idx; while (s > 0 && L[s - 1] === L[idx]) s--; return s; };
    let target;
    if (dir > 0) { target = c; while (target < items.length && L[target] === L[c]) target++; if (target >= items.length) target = 0; }
    else { const s = start(c); target = c > s ? s : s === 0 ? start(items.length - 1) : start(s - 1); }
    setPos({ r: pos.r, c: target });
    setHud(L[target]);
    clearTimeout(hudTimer.current);
    hudTimer.current = setTimeout(() => setHud(null), 800);
    blip('tab', sounds);
  };

  useEffect(() => {
    // Keep the focused tile centred in its strip and the active row fully inside the rows area (above the hint bar).
    const fit = () => {
      const strip = rowRefs.current[pos.r];
      const tile = strip?.children[pos.c];
      if (tile && strip) strip.scrollTo({ left: tile.offsetLeft - (strip.clientWidth - tile.offsetWidth) / 2, behavior: 'smooth' });
      const row = strip?.parentElement;
      const box = row?.closest('.couch-rows');
      if (!row || !box) return;
      const rb = row.getBoundingClientRect(), bb = box.getBoundingClientRect();
      let d = 0;
      if (rb.bottom > bb.bottom - 44) d = rb.bottom - bb.bottom + 44;
      if (rb.top - d < bb.top + 6) d = rb.top - bb.top - 6;
      if (Math.abs(d) > 1) box.scrollBy({ top: d, behavior: 'smooth' });
    };
    fit();
    const ts = [250, 700, 1500].map((ms) => setTimeout(fit, ms)); // again once the hero text / images have settled
    return () => ts.forEach(clearTimeout);
  }, [pos, tab]);

  // ---------- input ----------
  const input = (btn, ev) => {
    if (idle) { setIdle(false); return; } // any input just wakes the screen
    if (countdown) { if (btn === 'b') { setCountdown(null); setAfterDl('none'); } return; }
    if (launching) {
      // While a game is starting/running, only B (cancel the splash) does anything, so in-game presses can't launch things.
      if (btn === 'b') setLaunching(null);
      if (launching.phase !== 'starting' && (btn === 'x' || btn === 'y')) {
        window.gjallar.closeGame(btn === 'y').then(() => toast({ kind: 'info', title: btn === 'y' ? 'Force quitting…' : 'Closing the game…' })).catch((e) => toast({ kind: 'bad', title: "Couldn't close it", body: e.message }));
      }
      return;
    }
    if (side) {
      const items = sideItems();
      if (btn === 'up') setSide((s) => ({ i: (s.i - 1 + items.length) % items.length }));
      if (btn === 'down') setSide((s) => ({ i: (s.i + 1) % items.length }));
      if (btn === 'a') { const it = items[side.i]; setSide(null); blip('ok', sounds); it.run(); }
      if (btn === 'b' || btn === 'right' || btn === 'y') { setSide(null); blip('back', sounds); }
      return;
    }
    if (menu) {
      if (btn === 'up' || btn === 'down') { setMenu((m) => ({ ...m, i: (m.i + (btn === 'up' ? -1 : 1) + m.items.length) % m.items.length })); blip('move', sounds); }
      if (btn === 'a') { const it = menu.items[menu.i]; setMenu(null); blip('ok', sounds); it.run(); }
      if (btn === 'b') { setMenu(null); blip('back', sounds); }
      return;
    }
    if (friendsOpen || shotItems || installTile || dlOpen || qaOpen || achGame || wsGame || repOpen || padsOpen || actOpen || powerOpen) { pageInput.current?.(btn); return; }
    if (page) { pageInput.current?.(btn); return; }
    if (tabId === 'search') {
      if (btn === 'char' && /^[a-z0-9 ]$/i.test(ev?.key || '')) return typeKey(ev.key.toUpperCase());
      if (btn === 'b' && ev?.key === 'Backspace') return typeKey('BS');
      if (zone === 'rows' && btn === 'x') return typeKey('BS');
      if (zone === 'rows' && btn === 'y') return typeKey(' ');
    }
    if (btn === 'char') return;
    if (btn === 'up') move(-1, 0);
    if (btn === 'down') move(1, 0);
    if (btn === 'left') { if (zone === 'rows' && pos.c === 0 && !page) { setSide({ i: 0 }); blip('ok', sounds); } else move(0, -1); }
    if (btn === 'right') move(0, 1);
    if (btn === 'lb') switchTab(-1);
    if (btn === 'rb') switchTab(1);
    if (btn === 'lt') jump(-1);
    if (btn === 'rt') jump(1);
    if (btn === 'back') gotoTab('search');
    if (btn === 'start' && zone === 'rows' && cur?.kind === 'game') { setPage(cur); blip('ok', sounds); }
    if (btn === 'a') zone === 'tabs' ? setZone('rows') : activate();
    if (btn === 'x' && cur && zone === 'rows' && (cur.kind === 'game' || cur.kind === 'rom')) toggleFav(cur);
    if (btn === 'y' && zone === 'rows') { const m = optionsFor(cur); if (m) { setMenu(m); blip('ok', sounds); } }
    if (btn === 'b') { blip('back', sounds); zone === 'tabs' ? setZone('rows') : onClose(); }
  };
  usePadInput(input, {
    onActivity: () => { lastInput.current = Date.now(); },
    onPad: setPad,
    charMode: () => tabId === 'search' && zone === 'rows' && !menu && !page && !launching,
  });

  const CurIcon = cur?.icon;
  const rootStyle = {
    zoom: settings?.couchScale || 1,
    '--safe': settings?.couchSafe || 0,
    ...(accent ? { '--gold': accent, '--gold-hi': mixWhite(accent, 0.38), '--glow-gold': `0 0 0 1px ${rgba(accent, 0.35)}, 0 10px 40px -8px ${rgba(accent, 0.5)}` } : {}),
  };
  const idleImages = library.games.filter((g) => g.appid).slice(0, 14).map((g) => [g.hero, steamImg.hero(g.appid)]);
  const keyLabel = (it) => it.label || it.ch;

  return (
    <motion.div className={`couch ${settings?.couchContrast ? 'hc' : ''}`} style={rootStyle} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.4 }}>
      <AnimatePresence mode="sync">
        <motion.div key={cur?.key || 'none'} className="couch-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
          {cur?.hero?.some(Boolean) ? <Img srcs={cur.hero} alt="" className="ken" /> : <div className="couch-bg-glow" style={{ '--accent': cur?.accent || accent || '#5c7cff' }} />}
          {curInfo?.trailer && curInfo.key === cur?.key && !launching && !page && <TrailerVideo src={curInfo.trailer.hls} delay={1100} muted={!trailerSound} />}
        </motion.div>
      </AnimatePresence>
      <div className="couch-shade" />

      <div className="couch-top">
        <HornLogo size={34} />
        <nav className={`couch-tabs ${zone === 'tabs' ? 'focus' : ''}`}>
          <span className="couch-bumper">LB</span>
          {TABS.map((t, i) => (
            <button key={t.id} className={`couch-tab ${i === tab ? 'on' : ''}`} onClick={() => { setTab(i); setPos({ r: t.id === 'library' ? 1 : 0, c: 0 }); }}>
              {i === tab && <motion.span layoutId="couch-tab" className="couch-tab-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <t.icon size={20} /><span>{t.label}</span>
            </button>
          ))}
          <span className="couch-bumper">RB</span>
        </nav>
        <div style={{ flex: 1 }} />
        {pad && <span className="couch-stat"><Gamepad2 size={20} /></span>}
        <Battery />
        <span className="couch-clock">{clock.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
      </div>

      <motion.div className="couch-hero" key={(cur?.key || '') + tab} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 150, damping: 20 }}>
        {cur ? (
          <>
            <div className="eyebrow">{cur.sub}{favs.has(cur.key) && <Star size={12} fill="currentColor" style={{ marginLeft: 8, verticalAlign: -1 }} />}</div>
            {cur.logo ? (
              <Img srcs={[cur.logo]} alt={cur.title} className="couch-logo" fallback={<h1 className="h-display">{cur.title}</h1>} />
            ) : (
              <h1 className="h-display" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>{CurIcon && <CurIcon size={56} />}{cur.title}</h1>
            )}
            <div className="couch-meta">{(cur.meta || []).map((m) => <span key={m}>{m}</span>)}{cur.kind === 'filter' && <span>{cur.count} games</span>}</div>
            {curInfo?.key === cur.key && <GameBio info={curInfo} large />}
          </>
        ) : <h1 className="h-display">Nothing here yet</h1>}
      </motion.div>

      <div className="couch-rows">
        {rows.map((row, ri) => (
          <div key={row.title + ri} className={`couch-row ${zone === 'rows' && ri === pos.r ? 'active' : ''} ${row.keys ? 'keys' : ''}`}>
            {(row.title || !row.keys) && <h2><row.icon size={18} />{row.title}{!row.keys && <span className="muted" style={{ fontFamily: 'var(--font)', fontSize: 13, letterSpacing: 0 }}>{row.items.length}</span>}</h2>}
            <div className="couch-strip" ref={(el) => (rowRefs.current[ri] = el)}>
              {row.items.map((it, ci) => {
                const focus = zone === 'rows' && ri === pos.r && ci === pos.c;
                const wide = it.kind === 'action' || it.kind === 'emu';
                return (
                  <motion.div key={it.key} className={`couch-tile kind-${it.kind} ${wide ? 'wide' : ''} ${focus ? 'focus' : ''} ${it.danger ? 'danger' : ''} ${it.active ? 'active' : ''}`}
                    animate={{ scale: focus ? 1.1 : 1, y: focus ? -8 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    onClick={() => { setZone('rows'); setPos({ r: ri, c: ci }); if (focus) activate(it); }} style={it.accent ? { '--accent': it.accent } : null}>
                    {it.kind === 'action' ? (
                      <div className="couch-action"><it.icon size={40} /><b>{it.title}</b><small>{it.sub}</small></div>
                    ) : it.kind === 'emu' ? (
                      <div className="couch-action emu"><div className="emu-badge" style={{ width: 64, height: 64, fontSize: 22 }}>{it.title.slice(0, 2).toUpperCase()}</div><b>{it.title}</b><small>{it.sub}</small></div>
                    ) : it.kind === 'key' ? (
                      <div className="couch-key">{keyLabel(it)}</div>
                    ) : it.kind === 'filter' ? (
                      <div className={`couch-chip ${it.active ? 'on' : ''}`}><b>{it.title}</b><small>{it.count}</small></div>
                    ) : it.kind === 'friend' ? (
                      <div className="couch-friend"><Img srcs={it.img} alt="" /><b>{it.title}</b><small>{it.sub}</small></div>
                    ) : (
                      <Img srcs={it.img} alt="" style={{ objectFit: it.contain ? 'contain' : 'cover', padding: it.contain ? 10 : 0 }} fallback={<div className="cover-fallback">{it.title}</div>} />
                    )}
                    {it.kind === 'download' && <div className="couch-dl"><div className="couch-pbar"><div style={{ width: `${(it.p || 0) * 100}%` }} /></div><small>{it.sub}{it.p != null ? ` · ${Math.round(it.p * 100)}%` : ''}</small></div>}
                    {it.kind === 'owned' && <span className="couch-install"><CloudDownload size={14} /> Install</span>}
                    {favs.has(it.key) && <span className="couch-fav"><Star size={12} fill="currentColor" /></span>}
                    {focus && <motion.div className="couch-focus-ring" layoutId="couch-ring" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
        {!rows.length && <div className="couch-row active"><h2>Nothing here yet</h2><p className="muted">{tabId === 'retro' ? 'Add ROM folders on the Retro page.' : 'Loading…'}</p></div>}
      </div>

      {(settings?.splashStyle || 'bifrost') === 'cinematic' ? <CouchSplash /> : <Splash style={settings?.splashStyle || 'bifrost'} />}

      <AnimatePresence>{hud && <motion.div className="couch-hud" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }}>{hud}</motion.div>}</AnimatePresence>

      <div className="couch-hints">
        <span><b className="btn-glyph a">A</b>Select</span>
        <span><b className="btn-glyph b">B</b>{zone === 'tabs' ? 'Back' : 'Exit'}</span>
        <span><b className="btn-glyph x">X</b>{tabId === 'search' ? 'Delete' : 'Favorite'}</span>
        <span><b className="btn-glyph y">Y</b>{tabId === 'search' ? 'Space' : 'Options'}</span>
        <span><b className="btn-glyph lb">Menu</b>Details</span>
        <span><b className="btn-glyph lb">View</b>Search</span>
        <span><b className="btn-glyph lb">L2/R2</b>A–Z</span>
        <span><b className="btn-glyph lb">LB/RB</b>Tabs</span>
        <div style={{ flex: 1 }} />
        <span className="muted" style={{ fontWeight: 600 }}>{pad ? 'Controller connected' : 'Keyboard: arrows · Enter · Esc · Q/E tabs · F favorite · O options · Tab details · / search'}</span>
      </div>

      <AnimatePresence>
        {friendsOpen && <SteamFriends key="friends" bind={(fn) => { pageInput.current = fn; }} onClose={() => setFriendsOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {installTile && <InstallDialog key="install" game={installTile} bind={(fn) => { pageInput.current = fn; }} onClose={() => setInstallTile(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {powerOpen && <PowerMenu key="power" bind={(fn) => { pageInput.current = fn; }} onClose={(o) => { setPowerOpen(false); if (o?.exit) onClose(); }} />}
        {actOpen && <ActivityFeed key="act" bind={(fn) => { pageInput.current = fn; }} onClose={() => setActOpen(false)} />}
        {padsOpen && <Controllers key="pads" bind={(fn) => { pageInput.current = fn; }} onClose={() => setPadsOpen(false)} />}
        {repOpen && <PlayReports key="rep" bind={(fn) => { pageInput.current = fn; }} onClose={() => setRepOpen(false)} />}
        {wsGame && <Workshop key="ws" game={wsGame} bind={(fn) => { pageInput.current = fn; }} onClose={() => setWsGame(null)} />}
        {achGame && <Achievements key="ach" game={achGame} bind={(fn) => { pageInput.current = fn; }} onClose={() => setAchGame(null)} />}
        {qaOpen && <QuickAccess key="qa" bind={(fn) => { pageInput.current = fn; }} onClose={() => setQaOpen(false)} />}
        {dlOpen && <Downloads key="downloads" bind={(fn) => { pageInput.current = fn; }} onClose={() => setDlOpen(false)} />}
        {shotItems && <Screenshots key="shots" items={shotItems} bind={(fn) => { pageInput.current = fn; }} onClose={() => setShotItems(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {page && (
          <GamePage key="page" tile={page} pt={pt} fav={favs.has(page.key)} bind={(fn) => { pageInput.current = fn; }}
            onClose={() => setPage(null)} onPlay={() => { const t = page; setPage(null); activate(t); }}
            onFav={() => toggleFav(page)} onShelf={() => setMenu(shelfMenu(page))} onBackup={() => backup(page)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {side && (
          <motion.div key="side" className="couch-menu-scrim" style={{ justifyContent: 'flex-start' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSide(null)}>
            <motion.div className="couch-side glass" initial={{ x: -360 }} animate={{ x: 0 }} exit={{ x: -360 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }} onClick={(e) => e.stopPropagation()}>
              <div className="eyebrow" style={{ margin: '0 0 10px 14px' }}>Gjallarhorn</div>
              {sideItems().map((it, i) => (
                <button key={it.key} className={`couch-menu-item ${i === side.i ? 'on' : ''}`} onClick={() => { setSide(null); it.run(); }}>
                  {i === side.i && <motion.span layoutId="couch-side-pill" className="couch-tab-pill" />}
                  <it.icon size={22} /><span>{it.label}</span>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {launching && (
          <LaunchScreen key="launch" hero={launching.hero} logo={launching.logo} title={launching.title} phase={launching.phase} actions={launching.actions} footer={<div className="muted" style={{ marginTop: 18, fontSize: 15 }}>{launching.phase !== 'starting' ? <><b className="btn-glyph x" style={{ display: 'inline-grid', marginRight: 8 }}>X</b>Close game <b className="btn-glyph y" style={{ display: 'inline-grid', margin: '0 8px 0 18px' }}>Y</b>Force quit <b className="btn-glyph b" style={{ display: 'inline-grid', margin: '0 8px 0 18px' }}>B</b>Hide this screen</> : <><b className="btn-glyph b" style={{ display: 'inline-grid', marginRight: 8 }}>B</b>Cancel</>}</div>} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {menu && (
          <motion.div className="couch-menu-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="couch-menu glass" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Options</div>
              <h3>{menu.title}</h3>
              {menu.items.map((it, i) => (
                <button key={it.label} className={`couch-menu-item ${i === menu.i ? 'on' : ''}`} onClick={() => { setMenu(null); it.run(); }}>
                  {i === menu.i && <motion.span layoutId="couch-menu-pill" className="couch-tab-pill" />}
                  <it.icon size={20} /><span>{it.label}</span>
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {countdown && (
          <motion.div className="couch-menu-scrim" style={{ justifyContent: 'center', alignItems: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="couch-menu glass" style={{ borderRadius: 24, textAlign: 'center', width: 520 }}>
              <div className="eyebrow">Downloads finished</div>
              <h3>{countdown.what === 'sleep' ? 'Sleeping' : 'Shutting down'} in {countdown.left}s</h3>
              <div className="muted"><b className="btn-glyph b" style={{ display: 'inline-grid', marginRight: 8 }}>B</b>Cancel</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{idle && <Idle key="idle" images={idleImages} />}</AnimatePresence>
    </motion.div>
  );
}
