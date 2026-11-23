import React, { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sky, TitleBar, Sidebar } from './components/Shell.jsx';
import { ToastProvider, useToast } from './components/ui.jsx';
import { gamesByIds, money, setRegion, getRegion } from './api.js';
import Home from './pages/Home.jsx';
import Library from './pages/Library.jsx';
import { applyFonts } from './data/fonts.js';
import ThemeBackground from './components/ThemeBackground.jsx';
import Splash from './components/couch/Splashes.jsx';
import CouchSplash from './components/couch/CouchSplash.jsx';
import ChatInvites from './components/ChatInvites.jsx';
import { DesktopLaunch } from './components/LaunchScreen.jsx';
import usePadCombo from './usePadCombo.js';

const StorePage = lazy(() => import('./pages/Store.jsx'));
const Emulators = lazy(() => import('./pages/Emulators.jsx'));
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'));
const SettingsPage = lazy(() => import('./pages/Settings.jsx'));
const FriendsPage = lazy(() => import('./pages/Friends.jsx'));
const WorkshopPage = lazy(() => import('./pages/Workshop.jsx'));
const ReportsPage = lazy(() => import('./pages/Reports.jsx'));
const DownloadsPage = lazy(() => import('./pages/Downloads.jsx'));
const GameDetail = lazy(() => import('./pages/GameDetail.jsx'));
const Retro = lazy(() => import('./pages/Retro.jsx'));
const Controllers = lazy(() => import('./pages/Controllers.jsx'));
const Storage = lazy(() => import('./pages/Storage.jsx'));
const Roulette = lazy(() => import('./components/Roulette.jsx'));
const SessionReport = lazy(() => import('./components/SessionReport.jsx'));
const Welcome = lazy(() => import('./components/Welcome.jsx'));
const CommandPalette = lazy(() => import('./components/CommandPalette.jsx'));
const CouchMode = lazy(() => import('./components/CouchMode.jsx'));
const ShotsPage = lazy(() => import('./pages/Screenshots.jsx'));
const Bundles = lazy(() => import('./pages/Bundles.jsx'));

const pageAnim = {
  initial: { opacity: 0, y: 18, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 170, damping: 24 } },
  exit: { opacity: 0, y: -10, filter: 'blur(8px)', transition: { duration: 0.18 } },
};

function Inner() {
  const toast = useToast();
  const [page, setPage] = useState('home');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null); // { steamAppID?, gameID?, title?, thumb? }
  const [settings, setSettings] = useState(null);
  // The splash must cover the very first paint, before settings arrive from the main process: remember the chosen style locally.
  const cachedStyle = (() => { try { return localStorage.getItem('gj.splashStyle'); } catch { return null; } })();
  const [introOn, setIntroOn] = useState(() => !new URLSearchParams(location.search).has('overlay') && !new URLSearchParams(location.search).has('quick')); // app-start intro (not for the in-game menu / quick launcher windows)
  const introStyle = settings ? (settings.splashStyle || 'bifrost') : (cachedStyle || 'bifrost');
  useEffect(() => { if (settings) { try { localStorage.setItem('gj.splashStyle', settings.splashStyle || 'bifrost'); } catch {} } }, [settings?.splashStyle]); // eslint-disable-line
  const [library, setLibrary] = useState({ loading: true, games: [] });
  const checked = useRef(false);

  const refreshLibrary = useCallback(() => {
    setLibrary((l) => ({ ...l, loading: true }));
    return window.gjallar.scanLibrary().then(
      (games) => setLibrary({ loading: false, games }),
      (e) => { setLibrary({ loading: false, games: [] }); toast({ kind: 'bad', title: 'Library scan failed', body: e.message }); }
    );
  }, [toast]);

  const saveSettings = useCallback(async (patch) => {
    const next = await window.gjallar.setSettings(patch);
    setSettings((s) => ({ ...next, detectedRegion: s?.detectedRegion }));
    return next;
  }, []);

  // Region must be known before any page fetches prices.
  const [region, setRegionState] = useState(null);
  useEffect(() => {
    Promise.all([window.gjallar.getSettings(), window.gjallar.detectRegion().catch(() => 'US')]).then(([s, detected]) => {
      setRegion(s.region || detected);
      setRegionState(getRegion());
      setSettings({ ...s, detectedRegion: detected });
    });
    refreshLibrary();
  }, [refreshLibrary]);
  useEffect(() => {
    if (!settings) return;
    const want = (settings.region || settings.detectedRegion || 'US').toUpperCase();
    if (want !== region) { setRegion(want); setRegionState(want); }
  }, [settings?.region]);

  // Wishlist price alerts on startup.
  useEffect(() => {
    if (!settings?.wishlist?.length || checked.current) return;
    checked.current = true;
    const wl = settings.wishlist;
    gamesByIds(wl.map((w) => w.gameID).slice(0, 25))
      .then((res) => {
        const drops = [];
        const next = wl.map((w) => {
          const r = res[w.gameID];
          if (!r) return w;
          const now = Math.min(...r.deals.map((d) => Number(d.price)));
          if (w.lastPrice != null && now < Number(w.lastPrice) - 0.009) drops.push(`${w.title}: ${money(w.lastPrice)} → ${money(now)}`);
          else if (w.targetPrice != null && now <= w.targetPrice) drops.push(`${w.title} is ${money(now)} (your target: ${money(w.targetPrice)})`);
          return { ...w, lastPrice: now };
        });
        saveSettings({ wishlist: next });
        if (drops.length) {
          toast({ kind: 'ok', title: 'Price drop on your wishlist!', body: drops.join(' · '), ms: 10000 });
          window.gjallar.notify('Gjallarhorn: price drop', drops.join('\n'));
        }
      })
      .catch(() => {});
  }, [settings, saveSettings, toast]);

  const openGame = useCallback((g) => setDetail(g), []);

  // Couch mode: sidebar button or hold Start+Select on a controller.
  const [couch, setCouch] = useState(false);
  const openCouch = useCallback(() => setCouch(true), []);
  usePadCombo(openCouch);
  useEffect(() => { window.__gjCouch = openCouch; }, [openCouch]);
  const navTo = (p) => (p === 'couch' ? setCouch(true) : setPage(p));

  useEffect(() => { window.gjallar.onOpenCouch(openCouch); }, [openCouch]);
  const [roulette, setRoulette] = useState(false);
  // Command palette: Ctrl+K from anywhere in the app.
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, []);
  // Theme realm on <html data-realm>.
  useEffect(() => { applyFonts(settings); }, [settings?.uiFont, settings?.headFont, settings?.uiScale, settings?.accent, settings?.uiBlur, settings?.bgMode]);
  useEffect(() => { document.documentElement.dataset.realm = settings?.realm || 'asgard'; }, [settings?.realm]);
  const [report, setReport] = useState(null);

  // Game session events (boost, playtime, auto save backup, session report).
  // Steam chat: show incoming messages / requests as toasts (Windows notifications cover the unfocused case).
  useEffect(() => window.gjallar.chat.onEvent((ev) => {
    if (ev.type === 'message' && !ev.echo && document.hasFocus()) toast({ kind: 'info', title: ev.name, body: ev.join ? 'Sent you a game invite' : ev.text.slice(0, 140), ms: 6000 });
    if (ev.type === 'invite' && document.hasFocus()) toast({ kind: 'info', title: 'Steam friend request', body: `${ev.friend?.name || 'Someone'} wants to be your friend`, ms: 8000 });
  }), [toast]);
  useEffect(() => window.gjallar.onSession((ev) => {
    if (ev.state === 'ended' && ev.reportId && ev.minutes >= 1) {
      window.gjallar.sessionReports().then((all) => setReport(all.find((r) => r.id === ev.reportId) || null)).catch(() => {});
    }
    if (ev.state === 'running') toast({ kind: 'ok', title: `${ev.name} is running`, body: ev.actions?.length ? `Game Boost: ${ev.actions.join(' · ')}` : 'Tracking playtime.' });
    if (ev.state === 'ended') {
      const b = ev.backup ? (ev.backup.error ? ` · save backup failed: ${ev.backup.error}` : ' · saves backed up') : '';
      toast({ kind: ev.backup?.error ? 'bad' : 'ok', title: `Welcome back from ${ev.name}`, body: `${ev.minutes} min played${b}`, ms: 8000 });
      refreshLibrary();
    }
  }), [toast, refreshLibrary]);
  useEffect(() => { window.__gjNav = (p) => { setDetail(null); setPage(p); }; window.__gjOpen = openGame; }, [openGame]);
  const goSearch = (q) => { setQuery(q); setPage('store'); };
  const ctx = { openGame, settings, saveSettings, library, refreshLibrary, setPage, goSearch, openRoulette: () => setRoulette(true), openReport: setReport };

  const pages = {
    home: <Home {...ctx} />,
    store: <StorePage {...ctx} query={query} setQuery={setQuery} />,
    library: <Library {...ctx} />,
    storage: <Storage {...ctx} />,
    bundles: <Suspense fallback={null}><Bundles /></Suspense>,
    emulators: <Emulators {...ctx} />,
    retro: <Retro {...ctx} />,
    controllers: <Controllers {...ctx} />,
    friends: <FriendsPage />,
    workshop: <WorkshopPage library={library} />,
    reports: <ReportsPage />,
    downloads: <DownloadsPage />,
    screenshots: <ShotsPage />,
    wishlist: <Wishlist {...ctx} />,
    settings: <SettingsPage {...ctx} />,
  };

  return (
    <div className={settings?.reduceMotion ? 'reduce-motion' : ''} style={{ height: '100%' }}>
      {(settings?.bgMode || 'aurora') === 'aurora' && <Sky reduceMotion={settings?.reduceMotion} />}
      <ThemeBackground settings={settings} />
      <div className="shell">
        <TitleBar onSearch={goSearch} />
        <Sidebar page={page} setPage={navTo} counts={{ library: library.games.length || null, wishlist: settings?.wishlist?.length || null }} />
        <main className="main">
          <AnimatePresence mode="wait">
            <motion.div key={page + region} className="page" {...pageAnim}>
              <Suspense fallback={null}>{region ? pages[page] : null}</Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <Suspense fallback={null}>
      <AnimatePresence>{detail && <GameDetail key="detail" game={detail} onClose={() => setDetail(null)} {...ctx} />}</AnimatePresence>
      <CommandPalette open={palette} onClose={() => setPalette(false)} games={library.games} onNavigate={navTo} onOpenStore={(g) => { setPalette(false); openGame(g); }} onSearchStore={goSearch} />
      <AnimatePresence>{roulette && <Roulette key="roulette" library={library} onClose={() => setRoulette(false)} />}</AnimatePresence>
      <AnimatePresence>{report && <SessionReport key="report" report={report} onClose={() => setReport(null)} />}</AnimatePresence>
      <ChatInvites />
      <AnimatePresence>{settings && !settings.onboarded && !couch && <Welcome key="welcome" settings={settings} saveSettings={saveSettings} onDone={() => setSettings((s) => ({ ...s, onboarded: true }))} />}</AnimatePresence>
      {introOn && introStyle !== 'none' && (!settings || settings.onboarded !== false) && (introStyle === 'cinematic' ? <CouchSplash key="intro" /> : <Splash key="intro" style={introStyle} onDone={() => setIntroOn(false)} />)}
      <DesktopLaunch library={library} />
      <AnimatePresence>{couch && <CouchMode key="couch" library={library} settings={settings} saveSettings={saveSettings} onClose={() => setCouch(false)} toast={toast} />}</AnimatePresence></Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Inner />
    </ToastProvider>
  );
}
