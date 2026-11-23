const { app, BrowserWindow, ipcMain, shell, dialog, Notification, globalShortcut, Tray, Menu, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('./lib/net.cjs');
const library = require('./lib/library.cjs');
const tweaks = require('./lib/tweaks.cjs');
const optiscaler = require('./lib/optiscaler.cjs');
const humble = require('./lib/humble.cjs');
const wiki = require('./lib/wiki.cjs');
const settings = require('./lib/settings.cjs');
const emulators = require('./lib/emulators.cjs');
const session = require('./lib/session.cjs');
const prices = require('./lib/prices.cjs');
const saves = require('./lib/saves.cjs');
const roms = require('./lib/roms.cjs');
const owned = require('./lib/owned.cjs');
const extras = require('./lib/extras.cjs');
const round4 = require('./lib/round4.cjs');
const padwatch = require('./lib/padwatch.cjs');
const couch = require('./lib/couch.cjs');
const discord = require('./lib/discord.cjs');

app.setName('Gjallarhorn');
// Dev/test helper: run a second copy with its own data folder (the single-instance lock is per data folder).
if (process.env.GJ_USERDATA) app.setPath('userData', process.env.GJ_USERDATA);
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#05070f',
    show: false,
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // keep couch-mode input/animation timers running when the window isn't focused
    },
  });
  win.once('ready-to-show', () => { if (!process.argv.includes('--hidden')) win.show(); });
  // Closing hides to the tray (so the quick launcher hotkey keeps working) unless turned off in Settings.
  win.on('close', (e) => {
    if (!app.isQuitting && settings.load().closeToTray !== false && !process.env.GJ_SHOTS) { e.preventDefault(); win.hide(); }
  });
  win.on('focus', () => { padSuspended = false; if (couchActive && !gameRunning && !win.isFullScreen()) win.setFullScreen(true); });
  win.on('leave-full-screen', () => { if (couchActive && !gameRunning) setTimeout(() => { try { if (couchActive && !win.isDestroyed() && !win.isFullScreen()) win.setFullScreen(true); } catch {} }, 150); });
  win.on('maximize', () => win.webContents.send('win:state', true));
  win.on('unmaximize', () => win.webContents.send('win:state', false));
  // Open target=_blank / external links in the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  const dev = process.env.VITE_DEV_SERVER_URL;
  if (dev) win.loadURL(dev);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // Dev helper: GJ_SHOTS="home,store,library" GJ_SHOT_DIR=... captures each page to PNG, then quits.
  if (process.env.GJ_SHOTS) {
    // Record renderer console output (errors/warnings) next to the screenshots.
    const logFile = path.join(process.env.GJ_SHOT_DIR || app.getPath('temp'), 'console.log');
    win.webContents.on('console-message', (...a) => {
      const e = a[0] && typeof a[0] === 'object' && 'message' in a[0] ? a[0] : { level: a[1], message: a[2] };
      try { fs.appendFileSync(logFile, `[${e.level}] ${String(e.message).slice(0, 600)}\n`); } catch {}
    });
    win.webContents.once('did-finish-load', async () => {
      const dir = process.env.GJ_SHOT_DIR || app.getPath('temp');
      // Multi-monitor testing: log the displays, and optionally move the window onto one (GJ_DISPLAY=<index>).
      const { screen } = require('electron');
      const displays = screen.getAllDisplays();
      try { fs.appendFileSync(logFile, 'DISPLAYS ' + JSON.stringify(displays.map((d, i) => ({ i, id: d.id, bounds: d.bounds, scale: d.scaleFactor, primary: d.id === screen.getPrimaryDisplay().id }))) + '\n'); } catch {}
      if (process.env.GJ_DISPLAY) { const d = displays[Number(process.env.GJ_DISPLAY)]; if (d) win.setBounds({ x: d.bounds.x + 80, y: d.bounds.y + 80, width: 1200, height: 800 }); }
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      await wait(Number(process.env.GJ_FIRST_WAIT || 6000));
      for (const step of process.env.GJ_SHOTS.split(',')) {
        const [page, js] = step.split(':');
        await win.webContents.executeJavaScript(`window.__gjNav && window.__gjNav(${JSON.stringify(page)})`);
        if (js) await win.webContents.executeJavaScript(decodeURIComponent(js)).catch(() => {});
        await wait(Number(process.env.GJ_SHOT_WAIT || 5000));
        const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(dir, `shot-${page}${js ? '-x' : ''}.png`), img.toPNG());
      }
      // Overlay test: open the in-game menu, then feed it fake controller presses (D-pad down x2) to prove the native-input path works.
      if (process.env.GJ_OVERLAY_TEST) {
        showOverlay(true);
        await wait(2500);
        const send = (b) => overlayWin?.webContents.send('pad:state', { connected: true, buttons: b, lx: 0, ly: 0 });
        send(0x2); await wait(150); send(0); await wait(150); send(0x2); await wait(150); send(0); await wait(900);
        const img = await overlayWin.webContents.capturePage();
        fs.writeFileSync(path.join(dir, 'shot-overlay.png'), img.toPNG());
      }
      app.quit();
    });
  }
}

// Wrap handlers so errors come back as { error } instead of rejecting with noisy stacks.
const handle = (ch, fn) =>
  ipcMain.handle(ch, async (_e, ...args) => {
    try {
      return { data: await fn(...args) };
    } catch (e) {
      return { error: e.message || String(e) };
    }
  });

handle('net:json', (url, opts) => net.get(url, opts));
handle('net:text', (url, opts) => net.get(url, { ...opts, asText: true }));
handle('library:scan', () => library.scanAll(settings.load().customGames));
handle('custom:save', (game) => {
  // game: { id?, name, exe, args, cover, hero, steamAppID }
  if (!game?.name || !game?.exe) throw new Error('Name and executable are required');
  const list = settings.load().customGames || [];
  const id = game.id || Date.now().toString(36);
  const entry = { ...game, id };
  const next = list.some((g) => g.id === id) ? list.map((g) => (g.id === id ? entry : g)) : [...list, entry];
  settings.save({ customGames: next });
  return entry;
});
handle('custom:remove', (id) => {
  settings.save({ customGames: (settings.load().customGames || []).filter((g) => g.id !== id) });
  return true;
});
// The monitor the user is working on right now (physical pixels): the quick launcher if it's open, else the main window,
// else wherever the mouse is (tray menu). Games and emulators are moved there when their window appears.
function originTarget() {
  const { screen } = require('electron');
  let w = null;
  if (quickWin && !quickWin.isDestroyed() && quickWin.isVisible()) w = quickWin;
  else if (win && !win.isDestroyed() && win.isVisible() && !win.isMinimized()) w = win;
  const d = w ? screen.getDisplayMatching(w.getBounds()) : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const r = screen.dipToScreenRect(null, d.bounds);
  return { x: r.x, y: r.y, w: r.width, h: r.height, displayId: d.id };
}
const wantSameScreen = () => settings.load().launchOnSameScreen !== false;

let homeLock = false; // user explicitly went back to Gjallarhorn: stay above the game until the next launch/resume
let yieldUntil = 0; // after launching a game/emulator, couch mode stops forcing itself on top for a while
const yieldToLaunch = (forever) => { homeLock = false; yieldUntil = forever ? Infinity : Date.now() + 120000; try { if (win && !win.isDestroyed()) win.setAlwaysOnTop(false); } catch {} };
async function launchGame(game) {
  yieldToLaunch();
  try { preferDiscreteGpu(game.exe || tweaks.detect(game).exe); } catch {}
  const origin = originTarget(); // captured BEFORE the quick launcher hides
  lastLaunchDisplayId = origin.displayId; // the in-game overlay opens on this monitor
  const target = wantSameScreen() ? origin : null;
  suspendPad(); // the game owns the controller now (couch mode only)
  const prof = settings.load().profiles?.[game.key];
  const profArgs = prof?.active ? (prof.profiles || []).find((p) => p.id === prof.active)?.args || '' : '';
  const args = [(settings.load().launchArgs || {})[game.key], profArgs].map((x) => String(x || '').trim()).filter(Boolean).join(' ');
  if (game.source === 'custom') {
    library.launchCustom(args != null && args !== '' ? { ...game, args } : game);
    const list = settings.load().customGames || [];
    settings.save({ customGames: list.map((g) => (g.id === game.customId ? { ...g, lastPlayed: Date.now() } : g)) });
  } else if (game.source === 'steam' && game.appid) {
    // Big Picture-style launch: `steam.exe -silent -applaunch <id> <args>` starts the game directly, keeps the Steam window
    // hidden (tray only) and passes launch options WITHOUT Steam's "allow arguments?" dialog that steam://run shows.
    const steamExe = path.join(library.steamRoot() || 'C:\\Program Files (x86)\\Steam', 'steam.exe');
    if (fs.existsSync(steamExe)) {
      const { spawn } = require('child_process');
      const child = spawn(steamExe, ['-silent', '-applaunch', game.appid, ...library.splitArgs(args || '')], { detached: true, stdio: 'ignore' });
      child.on('error', () => {});
      child.unref();
    } else {
      await shell.openExternal(`steam://rungameid/${game.appid}`);
    }
  } else if (game.source === 'shortcut') {
    library.launchCustom(args != null && args !== '' ? { ...game, args } : game); // a game added to Steam as a non-Steam shortcut
  } else if (game.launchExe) {
    // Riot / GOG: start through the store's own launcher/executable (extra user launch options are appended).
    require('./lib/launchers.cjs').launchExe(args ? { ...game, launchArgs: [...(game.launchArgs || []), ...library.splitArgs(args)] } : game);
  } else {
    if (!/^(steam|com\.epicgames\.launcher|uplay):/i.test(game.launch || '')) throw new Error('No launcher for this game');
    await shell.openExternal(game.launch);
  }
  startSession(game, target);
  return true;
}
handle('game:launch', (game) => launchGame(game));
// Launch profiles: named sets of launch arguments per game; the active one is appended on Play.
handle('profiles:get', (key) => { const p = settings.load().profiles?.[key]; return { profiles: p?.profiles || [], active: p?.active || null }; });
handle('profiles:set', (key, v) => {
  const all = { ...(settings.load().profiles || {}) };
  const profiles = (Array.isArray(v?.profiles) ? v.profiles : []).slice(0, 20).map((p) => ({ id: String(p.id), name: String(p.name || 'Profile').slice(0, 40), args: String(p.args || '').slice(0, 400) }));
  if (profiles.length) all[key] = { profiles, active: profiles.some((p) => p.id === v.active) ? v.active : null }; else delete all[key];
  settings.save({ profiles: all });
  return true;
});
// Per-game controller layout for Gjallarhorn's own menu while that game runs: { menu: bool, swapAB: bool, deadzone: 0.2..0.8 }.
const cleanLayout = (v) => ({ menu: v?.menu !== false, swapAB: !!v?.swapAB, deadzone: Math.min(0.8, Math.max(0.2, Number(v?.deadzone) || 0.5)) });
const perf = require('./lib/perf.cjs');
handle('perf:info', async () => ({ cpu: await perf.cpuInfo() }));
handle('perf:get', async (game) => { const exe = game.exe || tweaks.detect(game).exe; return { performanceCores: !!settings.load().gamePerf?.[game.key]?.performanceCores, fso: await perf.fsoGet(exe), hasExe: !!exe }; });
handle('perf:set', async (game, patch) => {
  const all = { ...(settings.load().gamePerf || {}) };
  const cur = { ...(all[game.key] || {}) };
  if ('performanceCores' in patch) cur.performanceCores = !!patch.performanceCores;
  if ('fso' in patch) await perf.fsoSet(game.exe || tweaks.detect(game).exe, !!patch.fso);
  if (cur.performanceCores) all[game.key] = cur; else delete all[game.key];
  settings.save({ gamePerf: all });
  return true;
});
handle('layout:get', (key) => cleanLayout(settings.load().layouts?.[key]));
handle('layout:set', (key, v) => { const all = { ...(settings.load().layouts || {}) }; const c = cleanLayout(v); if (c.menu && !c.swapAB && c.deadzone === 0.5) delete all[key]; else all[key] = c; settings.save({ layouts: all }); return c; });
handle('layout:current', () => { const k = session.status()?.key; return cleanLayout(k ? settings.load().layouts?.[k] : null); });
const clips = require('./lib/clips.cjs');
handle('clips:list', () => clips.list({ videosDir: app.getPath('videos'), steamRoot: library.steamRoot() }).map((c) => ({ ...c, url: shots.toFileUrl(c.file) })));
handle('clips:record', async () => { const ok = await clips.toggleRecording(); if (!ok) throw new Error('Could not send the Game Bar shortcut'); return true; });
handle('shots:reveal', (file) => { shell.showItemInFolder(String(file)); return true; });
handle('shots:copy', (file) => { const { clipboard, nativeImage } = require('electron'); const img = nativeImage.createFromPath(String(file)); if (img.isEmpty()) throw new Error('Could not read the image'); clipboard.writeImage(img); return true; });
handle('args:get', (key) => (settings.load().launchArgs || {})[key] || '');
handle('args:set', (key, args) => {
  const all = { ...(settings.load().launchArgs || {}) };
  if (String(args || '').trim()) all[key] = String(args).trim(); else delete all[key];
  settings.save({ launchArgs: all });
  return true;
});

// ---------- round 3: achievements, hardware, deck, controllers, reports, emulator updates ----------
handle('ach:get', (game) => extras.achievements(game, settings.load()));
handle('ra:summary', () => extras.raSummary(settings.load()));
handle('hw:get', async (opts) => { const hw = await extras.hardware(opts); return { ...hw, tune: extras.tuning(hw) }; });
handle('deck:get', (appid) => extras.deckStatus(appid));
handle('pads:get', () => extras.controllers());
handle('reports:get', () => session.reports());
handle('emu:updates', () => emulators.checkUpdates());

async function backgroundEmuUpdates() {
  try {
    const ups = await emulators.checkUpdates();
    if (!ups.length) return;
    win?.webContents.send('emu:updates', ups);
    if (settings.load().autoUpdateEmus) {
      for (const u of ups) {
        try { await emulators.install(u.id, (p) => win?.webContents.send('emu:progress', p)); } catch {}
      }
      new Notification({ title: 'Gjallarhorn: emulators updated', body: ups.map((u) => `${u.id} ${u.latest}`).join(', ') }).show();
    } else {
      new Notification({ title: 'Gjallarhorn: emulator updates', body: ups.map((u) => `${u.id} ${u.current} → ${u.latest}`).join(', ') }).show();
    }
  } catch {}
}

// ---------- round 4 ----------
handle('keyshops:get', (appid) => { const s = settings.load(); return round4.keyshops(appid, { ggKey: s.ggKey, region: s.region || app.getLocaleCountryCode() || 'us' }); });
handle('news:get', (appid) => round4.news(appid));
handle('news:feed', () => round4.feed(library.scanAll(settings.load().customGames)));
handle('storage:get', () => round4.storage(library.scanAll(settings.load().customGames)));
handle('game:uninstall', async (game) => {
  const uri = round4.uninstallUri(game);
  if (!uri) { await shell.openPath(game.dir); return 'folder'; } // custom games: show the folder, the user deletes it
  await shell.openExternal(uri);
  return 'launcher';
});
handle('ollama:status', () => round4.ollamaLoaded());
handle('power:battery', () => powerMonitor.isOnBatteryPower());

// ---------- quick launcher (global hotkey) + tray ----------
let quickWin = null, tray = null;
function devUrl() { return process.env.VITE_DEV_SERVER_URL; }
function createQuick() {
  quickWin = new BrowserWindow({
    width: 560, height: 420, frame: false, resizable: false, show: false, alwaysOnTop: true, skipTaskbar: true,
    backgroundColor: '#0a0e1c', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true },
  });
  if (devUrl()) quickWin.loadURL(devUrl() + '?quick=1');
  else quickWin.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { query: { quick: '1' } });
  quickWin.on('blur', () => quickWin?.hide());
}
function toggleQuick() {
  if (!quickWin || quickWin.isDestroyed()) createQuick();
  if (quickWin.isVisible()) return quickWin.hide();
  // Open on the monitor where the mouse is, not always the primary one.
  const { screen } = require('electron');
  const d = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const b = quickWin.getBounds();
  quickWin.setPosition(Math.round(d.workArea.x + (d.workArea.width - b.width) / 2), Math.round(d.workArea.y + d.workArea.height * 0.2));
  quickWin.show();
  quickWin.focus();
  quickWin.webContents.send('quick:shown');
}
handle('quick:hide', () => { quickWin?.hide(); return true; });
function registerHotkey() {
  globalShortcut.unregisterAll();
  const key = settings.load().quickHotkey || 'Control+Shift+Space';
  try { globalShortcut.register(key, toggleQuick); } catch {}
}
handle('hotkey:set', (key) => { settings.save({ quickHotkey: key }); registerHotkey(); return globalShortcut.isRegistered(key); });

function showMain() { if (!win || win.isDestroyed()) createWindow(); win.show(); win.focus(); }
function buildTray() {
  if (!tray) {
    tray = new Tray(path.join(__dirname, '..', 'public', 'icon.png'));
    tray.setToolTip('Gjallarhorn');
    tray.on('click', showMain);
  }
  if (tray && gameRunning) return; // never scan the disk while a game is running
  const pt = session.playtime();
  const recent = library.scanAll(settings.load().customGames)
    .map((g) => ({ g, t: Math.max(g.lastPlayed || 0, pt[g.key]?.last || 0) }))
    .filter((x) => x.t).sort((a, b) => b.t - a.t).slice(0, 6);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Gjallarhorn', click: showMain },
    { label: `Quick launcher (${(settings.load().quickHotkey || 'Control+Shift+Space').replace('Control', 'Ctrl')})`, click: toggleQuick },
    { label: 'Couch mode', click: () => { showMain(); win.webContents.send('open-couch'); } },
    { type: 'separator' },
    ...(recent.length ? [{ label: 'Recent', enabled: false }, ...recent.map(({ g }) => ({ label: g.name, click: () => launchGame(g).catch(() => {}) }))] : []),
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]));
}

// ---------- Discord Rich Presence (shows your status; never reads friends or messages) ----------
function discordIdle() {
  if (couchActive) discord.setActivity({ details: 'In couch mode', state: 'Browsing the library', largeText: 'Gjallarhorn' });
  else discord.setActivity({ details: 'In the hub', state: 'Browsing the library', largeText: 'Gjallarhorn' });
}
function startDiscordIfEnabled() {
  const d = settings.load().discord;
  if (d?.enabled) discord.connect(d.clientId); else discord.disconnect();
}

// ---------- sessions: boost + playtime + auto save backup ----------
function startSession(game, target) {
  const s = settings.load();
  const exe = game.exe || tweaks.detect(game).exe;
  const we = library.scanAll([]).find((g) => g.appid === '431960');
  session.start(game, exe, {
    target,
    boostPriority: s.boost?.priority !== false,
    pauseWallpaper: s.boost?.wallpaper !== false,
    perf: { noThrottle: s.boost?.noThrottle !== false, performanceCores: !!s.gamePerf?.[game.key]?.performanceCores },
    autoBackup: !!s.autoBackup,
    wallpaperDir: we?.dir,
  }, {
    emit: async (ev) => {
      // AI <-> Gaming switch: free GPU memory held by local AI models while the game runs.
      if (ev.state === 'running' && settings.load().aiSwitch !== false) {
        const freed = await round4.ollamaUnloadAll().catch(() => []);
        if (freed.length) ev.actions = [...(ev.actions || []), `Unloaded ${freed.map((m) => m.name).join(', ')} from GPU memory`];
      }
      win?.webContents.send('session', ev);
      gameRunning = ev.state === 'running' || ev.state === 'waiting'; if (ev.state === 'ended' || ev.state === 'gave-up') yieldUntil = 0; pinCouch();
      if (ev.state === 'running') discord.setActivity({ details: `Playing ${ev.name}`, state: 'via Gjallarhorn', startedAt: Date.now(), largeText: ev.name, button: game.appid ? { label: 'View on Steam', url: `https://store.steampowered.com/app/${game.appid}` } : undefined });
      if (ev.state === 'ended' || ev.state === 'gave-up') discordIdle();
      // Big Picture behaviour: when the game closes, bring couch mode back to the front and give it the controller again.
      if (ev.state === 'ended' || ev.state === 'gave-up') { padSuspended = false; hideOverlay(); }
      if ((ev.state === 'ended' || ev.state === 'gave-up') && couchActive && win) {
        win.show(); win.setFullScreen(true); win.focus(); win.moveTop();
      }
      if (ev.state === 'ended' && ev.backup && !ev.backup.error) new Notification({ title: `${ev.name}: saves backed up`, body: `${ev.minutes} min played` }).show();
    },
    backup: (g) => saves.backup(g, { root: settings.load().saveRoot }),
  });
}
handle('session:status', () => session.status());
handle('playtime:get', () => session.playtime());

// ---------- prices ----------
handle('prices:record', (gameID, price, title) => prices.record(gameID, price, title));
handle('prices:history', (q) => prices.history({ ...q, key: settings.load().itadKey }));

// ---------- saves ----------
handle('saves:locations', (game) => saves.locations(game));
handle('saves:list', (game) => saves.list(game, settings.load().saveRoot));
handle('saves:backup', (game, paths) => saves.backup(game, { root: settings.load().saveRoot, paths }));
handle('saves:restore', (game, file) => saves.restore(game, file, settings.load().saveRoot));
handle('saves:root', () => saves.rootFor(settings.load().saveRoot));

// ---------- ROMs ----------
handle('roms:scan', () => roms.scan(settings.load().romFolders || []));
handle('roms:art', (list) => roms.art(list));
handle('roms:launch', (rom, exe) => {
  yieldToLaunch(true); // emulators aren't session-tracked: stay out of the way until the user comes back via Back+Start
  const target = wantSameScreen() ? originTarget() : null;
  preferDiscreteGpu(exe);
  const r = roms.launch(rom, exe);
  suspendPad();
  if (target) session.placeWindow(path.basename(exe), target, 60);
  return r;
});
handle('roms:systems', () => roms.SYSTEMS);

// ---------- owned (not installed) games ----------
handle('owned:list', () => {
  const s = settings.load();
  const installed = library.scanAll(s.customGames).map((g) => g.key);
  return owned.owned({ steamKey: s.steamKey, steamId: s.steamId }, installed);
});
const installer = require('./lib/installer.cjs');
let installStartedAt = {};
handle('install:prepare', (appid) => installer.prepare(appid));
handle('install:start', async (appid, lib) => { const r = await installer.start(appid, lib); installStartedAt[String(appid)] = Date.now(); return r; });
handle('install:status', (appid) => installer.status(appid, installStartedAt[String(appid)]));
handle('install:steamDialog', (appid) => installer.steamDialog(appid));
handle('owned:install', async (g) => {
  if (!/^(steam:\/\/install\/\d+|com\.epicgames\.launcher:\/\/apps\/)/.test(g.install || '')) throw new Error('No installer link for this game');
  await shell.openExternal(g.install);
  return true;
});

// ---------- couch mode ----------
let couchActive = false;
// Couch mode stays above Steam (Big Picture / main window) while no game is running; a running game gets the screen back.
let gameRunning = false;
function pinCouch() { try { if (win && !win.isDestroyed() && (!couchActive || (!homeLock && gameRunning))) win.setAlwaysOnTop(false); } catch {} }
// Briefly float above Steam after a Guide/Home press (never permanently: emulators and games must be able to cover us).
let pinTimer = null;
// Couch mode is a shell: while it is open and nothing launched by us is running, keep it truly fullscreen and above the taskbar/Steam.
setInterval(() => {
  try {
    if (!win || win.isDestroyed() || !couchActive || !win.isVisible() || overlayOpen) return;
    if (!homeLock && (gameRunning || Date.now() < yieldUntil)) return;
    if (!win.isFullScreen()) win.setFullScreen(true);
    win.setAlwaysOnTop(true, 'screen-saver');
  } catch {}
}, 1200);
function flashPin() { if (couchActive && !gameRunning && win && !win.isDestroyed() && !win.isFullScreen()) { try { win.setFullScreen(true); } catch {} } if (!couchActive || gameRunning || !win || win.isDestroyed()) return; try { win.setAlwaysOnTop(true, 'screen-saver'); win.show(); win.moveTop(); win.focus(); } catch {} clearTimeout(pinTimer); pinTimer = setTimeout(() => { try { win.setAlwaysOnTop(false); } catch {} }, 3500); }
// While a game/emulator launched from couch mode is running, couch mode must NOT react to the controller (the game owns it).
// Cleared when Gjallarhorn regains focus, a tracked game ends, or the controller combo is used.
let padSuspended = false;
function suspendPad() {
  if (!couchActive) return;
  padSuspended = true;
  // Send a neutral state so a button or stick held at launch time can't keep navigating couch mode.
  win?.webContents.send('pad:state', { connected: false, buttons: 0, lx: 0, ly: 0 });
}
// Global controller handling: reads XInput natively (a browser page only gets gamepad input while focused, so clicking another
// window or monitor used to kill couch-mode control). State is forwarded to couch mode whenever it's open and not suspended.
// Back (0x20) and Start (0x10) only act as a plain tap on RELEASE, and never when the other one was pressed too (that's the Back+Start combo hold).
const gate = { since: 0, prev: 0, combo: false };
function gatePad(state, send) {
  const bs = state.buttons & 0x30;
  const now = Date.now();
  if (bs && !gate.prev) { gate.since = now; gate.combo = false; }
  if (bs === 0x30) gate.combo = true;
  const wasDown = gate.prev;
  gate.prev = bs;
  const base = { ...state, buttons: state.buttons & ~0x30 };
  if (!bs && wasDown && !gate.combo && now - gate.since < 700) {
    send({ ...base, buttons: base.buttons | wasDown }); // one-frame tap
    setTimeout(() => send(base), 60);
    return;
  }
  send(base);
}
const dbgLog = (m) => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'launch-debug.log'), `${new Date().toISOString()} [pad] ${m}
`); } catch {} };
function startPadWatch() {
  const s = settings.load();
  // The watcher always runs while couch mode is open (navigation), even if the global combo is switched off.
  // Keep the watcher running for: the global combo, couch-mode navigation, and the in-game menu (Guide/PS button).
  if (s.globalPadCombo === false && !couchActive && s.inGameMenu === false) return padwatch.stop();
  padwatch.start(s.globalPadCombo === false ? 'none' : 'back+start', () => { // always Back+Start (Share+Options): a stale saved setting must never stop the menu opening
    dbgLog('pad combo: Back+Start held');
    // The combo (Back+Start / Share+Options) is the Steam-proof twin of the Home tap: Steam grabs the Guide/PS button first.
    if (overlayOpen) return resumeGame();
    { const k = session.status()?.key; if (k && settings.load().layouts?.[k]?.menu === false) { dbgLog('pad combo ignored: menu is turned off for this game'); return; } }
    if (couchActive && win?.isVisible() && win.isFocused() && !session.status()?.running) { padSuspended = false; return win.webContents.send('couch-home'); } // already in couch mode: jump to the Home menu
    if (settings.load().inGameMenu !== false && showOverlay()) return; // in a game, on the desktop or over an emulator: the menu
    bringCouch();
  }, (state) => {
    gatePad(state, (st) => {
      lastPad = st;
      if (overlayOpen) { overlayWin?.webContents.send('pad:state', st); return; } // the in-game menu owns the controller while open
      if (couchActive && !padSuspended && win && !win.isDestroyed()) win.webContents.send('pad:state', st);
    });
  }, () => {
    // The Home/Guide/PS button no longer opens anything: the Home menu / in-game menu is the Back+Start (Share+Options) hold. Just keep Steam from covering us.
    flashPin();
  }, (family) => { for (const w of [win, overlayWin]) if (w && !w.isDestroyed()) w.webContents.send('pad:type', family); lastPadType = family; }, () => {
    // Steam popped its Big Picture window (Guide button) and the watcher closed it: put Gjallarhorn back in front.
    if (overlayOpen) return;
    flashPin();
  });
}
function bringCouch() {
  padSuspended = false;
  yieldUntil = 0;
  homeLock = true;
  hideOverlay();
  showMain();
  win.setFullScreen(true);
  win.moveTop();
  win.focus();
  pinCouch();
  win.webContents.send('open-couch');
}
let lastPadType = 'xbox';
handle('pad:type', () => lastPadType);
// ---- round 7: downloads, quick access, power, achievements, controllers ----
const sys7 = require('./lib/system.cjs');
handle('dl:list', () => sys7.downloads());
handle('dl:open', () => sys7.openDownloads());
handle('sys:info', () => sys7.sysinfo());
handle('sys:volume', (n) => sys7.setVolume(n));
handle('sys:mute', (b) => sys7.setMute(!!b));
handle('ach:public', (appid) => sys7.achievementsPublic(appid, settings.load().steamId));
handle('pads:list', async () => {
  const rows = (await extras.controllers()).filter((p) => p.connected).map((p) => ({ index: p.slot, type: 'xbox', battery: p.type === 'wired' ? 'wired' : p.level, name: 'Controller ' + (p.slot + 1) }));
  if (!rows.length && lastPadType && lastPadType !== 'xbox') return [{ index: 0, type: lastPadType, battery: null, name: 'Controller' }];
  return rows;
});
let lastPad = { connected: false, buttons: 0, lx: 0, ly: 0 };
handle('pad:peek', () => lastPad); // for the Controllers page "background input" readout

// ---------- in-game menu: hold the Guide/PS button ~1 s while a game started from Gjallarhorn is running ----------
// A transparent always-on-top window over the game's monitor (works over borderless/windowed games; exclusive-fullscreen games may hide it).
let overlayWin = null, overlayOpen = false, overlayGame = '', lastLaunchDisplayId = null;
// The menu page loads lazily and can miss the "open" push, so it also asks for the current state when it starts.
handle('overlay:state', () => (overlayOpen ? { game: overlayGame, noGame: overlayGame === 'Gjallarhorn' && !session.status()?.running } : null));
function createOverlay() {
  overlayWin = new BrowserWindow({
    show: false, frame: false, transparent: true, resizable: false, movable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, backgroundThrottling: false },
  });
  const dev = process.env.VITE_DEV_SERVER_URL;
  if (dev) overlayWin.loadURL(dev + '?overlay=1');
  else overlayWin.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { query: { overlay: '1' } });
}
function overlayDisplay() {
  const { screen } = require('electron');
  return screen.getAllDisplays().find((d) => d.id === lastLaunchDisplayId) || screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
}
function showOverlay(force) {
  let st = force ? { name: 'ELDEN RING', running: true } : session.status(); // `force`: test hook (GJ_OVERLAY_TEST) without a real game
  if (!st?.running) st = { name: 'Gjallarhorn', running: false, noGame: true }; // no tracked game: the menu still opens (home, friends, volume, power…)
  if (!overlayWin || overlayWin.isDestroyed()) createOverlay();
  const d = overlayDisplay();
  overlayWin.setBounds(d.bounds);
  overlayOpen = true;
  overlayGame = st.name;
  const open = () => {
    overlayWin.setAlwaysOnTop(true, 'screen-saver');
    overlayWin.show();
    overlayWin.focus();
    overlayWin.webContents.send('overlay:open', { game: st.name, displayId: d.id, noGame: !!st.noGame });
  };
  if (overlayWin.webContents.isLoading()) overlayWin.webContents.once('did-finish-load', open); else open();
  return true;
}
function hideOverlay() {
  overlayOpen = false;
  if (overlayWin && !overlayWin.isDestroyed()) overlayWin.hide();
}
function resumeGame() {
  homeLock = false;
  hideOverlay();
  try { if (win && !win.isDestroyed()) win.setAlwaysOnTop(false); } catch {}
  for (const ms of [120, 600]) setTimeout(() => session.focusGame().catch(() => {}), ms); // twice: the first can lose the race with the overlay hiding
}
function toggleOverlay() { if (overlayOpen) hideOverlay(); else showOverlay(); }
handle('overlay:action', async (action) => {
  if (action === 'resume') { resumeGame(); return true; }
  if (action === 'quit') { hideOverlay(); return session.closeCurrent(false); }
  if (action === 'forcequit') { hideOverlay(); return session.closeCurrent(true); }
  if (action === 'couch') { bringCouch(); for (const ms of [500, 1100, 1800]) setTimeout(() => win?.webContents.send('couch-home'), ms); return true; }
  if (String(action).startsWith('page:')) { bringCouch(); const pg = String(action).slice(5); for (const ms of [600, 1300]) setTimeout(() => win?.webContents.send('couch-page', pg), ms); return true; }
  if (action === 'sleep') { hideOverlay(); require('child_process').execFile('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0'], { windowsHide: true }, () => {}); return true; }
  if (action === 'clip') {
    // Give the game focus back first, then press Win+Alt+R (Game Bar records the foreground game).
    resumeGame();
    await new Promise((r) => setTimeout(r, 1000));
    return clips.toggleRecording();
  }
  if (action === 'screenshot') {
    const id = overlayDisplay().id;
    overlayWin.hide(); // so the menu itself isn't in the picture
    await new Promise((r) => setTimeout(r, 350));
    try { return await couch.screenshot(id); } finally { overlayWin.show(); overlayWin.focus(); }
  }
  throw new Error('Unknown action');
});

// ---------- Steam Workshop ----------
const workshop = require('./lib/workshop.cjs');
handle('ws:browse', (q) => workshop.browse(q || {}, settings.load().steamKey));
handle('ws:subscribe', (id, appid, on) => workshop.setSubscribed(id, appid, on !== false));
handle('ws:open', (id) => workshop.openPage(id));
handle('ws:hub', (appid) => workshop.openHub(appid));

// ---------- couch-mode backends ----------
handle('game:close', (force) => session.closeCurrent(!!force)); // close the running tracked game from couch mode
handle('qs:get', () => couch.quickGet());
handle('qs:volume', (a) => couch.volume(a));
handle('qs:brightness', async (delta) => { const cur = await couch.brightnessGet(); return cur == null ? null : couch.brightnessSet(cur + delta); });
handle('qs:dnd', (on) => couch.dndSet(!!on));
handle('downloads:get', () => couch.downloads());
handle('color:dominant', (url) => couch.dominantColor(url));
handle('displays:list', () => ({ list: couch.displays(), current: settings.load().couchDisplayId || null }));
handle('couch:display', (id) => { settings.save({ couchDisplayId: id }); if (couchActive) moveWinToCouchDisplay(); return true; });
handle('steam:friends', () => { const s = settings.load(); return round4.steamFriends({ steamKey: s.steamKey, steamId: s.steamId }); });
handle('padcombo:set', (patch) => { settings.save(patch); startPadWatch(); return true; });
// Couch mode opens on the screen chosen in its System tab (default: wherever the window already is).
function moveWinToCouchDisplay() {
  const { screen } = require('electron');
  const d = screen.getAllDisplays().find((x) => x.id === settings.load().couchDisplayId);
  if (!d || !win) { win?.setFullScreen(true); return; }
  win.setFullScreen(false);
  win.setBounds(d.bounds);
  win.setFullScreen(true);
}
let sleepBlocker = null;
handle('win:fullscreen', (on) => {
  const { powerSaveBlocker } = require('electron');
  couchActive = !!on;
  if (!on) { homeLock = false; yieldUntil = 0; } // leaving couch mode: drop every 'stay on top' lock so Gjallarhorn behaves like a normal window again
  pinCouch();
  if (!gameRunning) discordIdle();
  if (!on) padSuspended = false;
  // While couch mode is open the PC must not go to sleep mid-session (the screen may still turn off).
  if (on && sleepBlocker == null) sleepBlocker = powerSaveBlocker.start('prevent-app-suspension');
  if (!on && sleepBlocker != null) { powerSaveBlocker.stop(sleepBlocker); sleepBlocker = null; }
  if (on && settings.load().couchDisplayId) moveWinToCouchDisplay(); else win?.setFullScreen(!!on);
  padwatch.setTaskbarHidden(!!on); // couch mode owns the whole screen: the taskbar stays hidden until we leave it
  if (on) { flashPin(); setTimeout(flashPin, 700); setTimeout(flashPin, 1800); } // entering couch mode: jump above every other window (Steam, browsers, the taskbar)
  startPadWatch(); // keep the watcher alive while couch mode is open
  return win?.isFullScreen();
});
// Power menu (user confirms in the UI first).
handle('power:action', (what) => {
  const { execFile } = require('child_process');
  const run = (cmd, args) => execFile(cmd, args, { windowsHide: true }, () => {});
  if (what === 'sleep') run('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']);
  else if (what === 'restart') run('shutdown', ['/r', '/t', '5']);
  else if (what === 'shutdown') run('shutdown', ['/s', '/t', '5']);
  else if (what === 'quit') app.quit();
  else throw new Error('Unknown action');
  return true;
});
handle('tweaks:status', async (game) => { const hw = await extras.hardware(); return tweaks.status(game, hw, extras.tuning(hw)); });
handle('tweaks:apply', async (game, ids) => { const hw = await extras.hardware(); return tweaks.apply(game, ids, hw, extras.tuning(hw)); });
handle('tweaks:revert', (game) => tweaks.revertAll(game.key));
handle('wiki:lookup', (q) => wiki.lookup(q));
handle('humble:bundles', () => humble.bundles());
handle('opti:info', () => optiscaler.info());
handle('opti:download', () => optiscaler.download((p) => win?.webContents.send('opti:progress', p)));
handle('opti:install', (game, opts) => optiscaler.install(game, opts));
handle('opti:uninstall', (game) => optiscaler.uninstall(game));
handle('emu:status', async (list) => {
  // list: [{ id, paths: [...] }] -> { id: { exe, managed, version, canInstall } }
  const out = {};
  const s = settings.load();
  for (const e of list) {
    const m = emulators.installed(e.id);
    const override = s.emulatorPaths?.[e.id];
    let exe = m?.exe || (override && fs.existsSync(override) ? override : null);
    if (!exe) for (const p of e.paths || []) {
      const r = p.replace(/%([^%]+)%/g, (_, v) => process.env[v] || process.env[v.toUpperCase()] || '');
      if (fs.existsSync(r)) { exe = r; break; }
    }
    out[e.id] = { exe, managed: !!m, version: m?.version || null, canInstall: emulators.hasInstaller(e.id) };
  }
  return out;
});
handle('emu:latest', (id) => emulators.resolveLatest(id));
handle('emu:install', (id) => emulators.install(id, (p) => win?.webContents.send('emu:progress', p)));
handle('emu:uninstall', (id) => emulators.uninstall(id));
handle('emu:root', () => emulators.managedRoot());
handle('region:detect', () => (app.getLocaleCountryCode() || 'US').toUpperCase());
const shots = require('./lib/screenshots.cjs');
handle('shots:list', async () => {
  const items = await shots.list({ steamRoot: library.steamRoot(), extraDirs: [path.join(app.getPath('pictures'), 'Gjallarhorn'), path.join(app.getPath('pictures'), 'Screenshots')] });
  return items.map((i) => ({ ...i, url: shots.toFileUrl(i.file) }));
});
const storefront = require('./lib/storefront.cjs');
handle('store:featured', () => storefront.featured((app.getLocaleCountryCode() || 'US')));
handle('store:search', (term) => storefront.search(String(term || ''), (app.getLocaleCountryCode() || 'US')));
const gamefinder = require('./lib/gamefinder.cjs');
handle('finder:tags', () => ({ genres: gamefinder.GENRES, moods: gamefinder.MOODS }));
handle('finder:search', (tags, excludeOwnedAppids) => gamefinder.find({ tags, cc: app.getLocaleCountryCode() || 'US', excludeOwnedAppids }));
handle('discord:get', () => ({ ...settings.load().discord, ...discord.state() }));
handle('discord:set', (patch) => {
  const d = { ...settings.load().discord, ...patch };
  settings.save({ discord: d });
  startDiscordIfEnabled();
  if (d.enabled) setTimeout(discordIdle, 1500); // give the IPC handshake a moment before the first activity push
  return { ...d, ...discord.state() };
});
handle('settings:get', () => settings.load());
handle('settings:set', (patch) => settings.save(patch));

handle('shell:open', (url) => {
  if (!/^(https?|steam|com\.epicgames\.launcher):/i.test(url)) throw new Error('Blocked URL scheme');
  return shell.openExternal(url);
});
handle('shell:showPath', (p) => shell.openPath(p));
handle('fs:exists', (p) => fs.existsSync(p));
handle('fs:resolveEnv', (p) => p.replace(/%([^%]+)%/g, (_, v) => process.env[v] || process.env[v.toUpperCase()] || `%${v}%`));
handle('emu:launch', async (exe) => {
  yieldToLaunch(true);
  if (!/\.exe$/i.test(exe) || !fs.existsSync(exe)) throw new Error('Executable not found');
  preferDiscreteGpu(exe);
  const target = wantSameScreen() ? originTarget() : null;
  const err = await shell.openPath(exe);
  if (err) throw new Error(err);
  suspendPad();
  if (target) session.placeWindow(path.basename(exe), target, 60);
  return true;
});
handle('dialog:pickFolder', async (title) => {
  const r = await dialog.showOpenDialog(win, { title, properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
handle('dialog:pickExe', async (title) => {
  const r = await dialog.showOpenDialog(win, { title, properties: ['openFile'], filters: [{ name: 'Programs', extensions: ['exe'] }] });
  return r.canceled ? null : r.filePaths[0];
});
handle('dialog:pickMedia', async (title) => {
  const r = await dialog.showOpenDialog(win, { title, properties: ['openFile'], filters: [{ name: 'Images and video', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm'] }] });
  return r.canceled ? null : r.filePaths[0];
});
handle('notify', (title, body) => new Notification({ title, body }).show());

ipcMain.on('win:min', () => win?.minimize());
ipcMain.on('win:max', () => (win?.isMaximized() ? win.unmaximize() : win?.maximize()));
ipcMain.on('win:close', () => win?.close());

// One instance only: launching again from Windows search just brings the window back.
// Hybrid laptops: Windows' "GPU preference" is per executable. Set High performance for Gjallarhorn and for every game / emulator it launches,
// so nothing silently lands on the integrated GPU. (HKCU, no admin needed; harmless on PCs with a single GPU.)
try { app.commandLine.appendSwitch('force_high_performance_gpu'); app.commandLine.appendSwitch('enable-gpu-rasterization'); app.commandLine.appendSwitch('enable-zero-copy'); app.commandLine.appendSwitch('ignore-gpu-blocklist'); } catch {}
const gpuDone = new Set();
function preferDiscreteGpu(exe) {
  try {
    if (!exe || process.platform !== 'win32' || !/\.exe$/i.test(exe)) return;
    const key = String(exe).toLowerCase();
    if (gpuDone.has(key)) return;
    gpuDone.add(key);
    require('child_process').execFile('reg', ['add', 'HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences', '/v', exe, '/t', 'REG_SZ', '/d', 'GpuPreference=2;', '/f'], { windowsHide: true }, () => {});
  } catch {}
}
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
// ---------- Steam friends / chat / invites (opt-in; QR login, see lib/steamchat.cjs) ----------
const steamchat = require('./lib/steamchat.cjs');
steamchat.setEmitter((ev) => {
  if (ev.type === 'status') { try { fs.appendFileSync(path.join(app.getPath('userData'), 'launch-debug.log'), `${new Date().toISOString()} [chat] ${ev.status.status}${ev.status.error ? ' ERROR ' + ev.status.error : ''}
`); } catch {} }
  for (const w of [win, overlayWin]) if (w && !w.isDestroyed()) w.webContents.send('chat:event', ev);
  const focused = win && !win.isDestroyed() && win.isFocused();
  if (ev.type === 'message' && !ev.echo && !focused) new Notification({ title: ev.name, body: ev.join ? 'Sent you a game invite' : ev.text.slice(0, 140) }).show();
  if (ev.type === 'gameinvite' && !focused) new Notification({ title: `${ev.invite.name} invited you to play`, body: 'Open Gjallarhorn and press the Guide button, or open Friends, to join' }).show();
  if (ev.type === 'invite' && !focused) new Notification({ title: 'Steam friend request', body: `${ev.friend?.name || 'Someone'} wants to be your friend` }).show();
});
handle('chat:status', () => steamchat.status());
handle('chat:connect', () => steamchat.connect());
handle('chat:disconnect', () => steamchat.disconnect());
handle('chat:friends', () => steamchat.friends());
handle('chat:invites', () => steamchat.pendingInvites());
handle('chat:dismissInvite', (sid) => steamchat.dismissGameInvite(String(sid)));
handle('chat:history', (sid) => steamchat.history(String(sid)));
handle('chat:send', (sid, text) => steamchat.send(String(sid), text));
handle('chat:accept', (sid) => steamchat.accept(String(sid)));
handle('chat:decline', (sid) => steamchat.decline(String(sid)));
handle('chat:join', (sid) => { const l = steamchat.joinLink(String(sid)); if (!l) throw new Error('This friend is not in a game'); return shell.openExternal(l); });
handle('chat:openSteam', (sid) => shell.openExternal(steamchat.openChatLink(String(sid))));

// ---------- gjallarhorn:// links (used by the HornVoice voice tool, and handy for shortcuts) ----------
//   gjallarhorn://launch?name=Elden%20Ring   gjallarhorn://couch   gjallarhorn://home   gjallarhorn://menu   gjallarhorn://page?name=friends
const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function findGame(query) {
  const q = normName(query);
  if (!q) return null;
  const games = library.scanAll(settings.load().customGames);
  const words = q.split(' ');
  let best = null, bestScore = 0;
  for (const g of games) {
    const n = normName(g.name);
    let sc = 0;
    if (n === q) sc = 100;
    else if (n.startsWith(q)) sc = 80;
    else if (n.includes(q)) sc = 65;
    else { const hit = words.filter((w) => w.length > 2 && n.includes(w)).length; if (hit) sc = (hit / words.length) * 50; }
    if (sc > bestScore) { bestScore = sc; best = g; }
  }
  return bestScore >= 30 ? best : null;
}
async function handleDeepLink(url) {
  let u;
  try { u = new URL(url); } catch { return; }
  if (u.protocol !== 'gjallarhorn:') return;
  const action = (u.hostname || u.pathname.replace(/^\/+/, '')).toLowerCase();
  const name = u.searchParams.get('name') || '';
  dbgLog('deep link: ' + action + (name ? ' ' + name : ''));
  try {
    if (action === 'launch') { const g = findGame(name); if (g) await launchGame(g); else dbgLog('deep link: no game matches "' + name + '"'); }
    else if (action === 'couch') { bringCouch(); }
    else if (action === 'home') { bringCouch(); for (const ms of [500, 1100, 1800]) setTimeout(() => win?.webContents.send('couch-home'), ms); }
    else if (action === 'menu') { if (!showOverlay()) bringCouch(); }
    else if (action === 'page') { bringCouch(); for (const ms of [600, 1300]) setTimeout(() => win?.webContents.send('couch-page', name), ms); }
  } catch (e) { dbgLog('deep link failed: ' + e.message); }
}
handle('deeplink:find', (name) => { const g = findGame(name); return g ? { name: g.name, key: g.key } : null; });
app.on('second-instance', (_e, argv) => {
  const link = (argv || []).find((a) => /^gjallarhorn:\/\//i.test(a));
  if (link) return void handleDeepLink(link);
  showMain();
});
app.on('before-quit', () => { app.isQuitting = true; });
app.on('will-quit', () => { globalShortcut.unregisterAll(); try { require('fs').unlinkSync(require('path').join(app.getPath('userData'), 'hide-taskbar.flag')); } catch {} padwatch.stop(); padwatch.showTaskbar(true); discord.disconnect(); });
if (gotLock) app.whenReady().then(() => {
  preferDiscreteGpu(process.execPath);
  try { if (app.isPackaged) app.setAsDefaultProtocolClient('gjallarhorn'); } catch {}
  { const link = process.argv.find((a) => /^gjallarhorn:\/\//i.test(a)); if (link) setTimeout(() => handleDeepLink(link), 2500); }
  padwatch.setTaskbarHidden(false); // a crash while in couch mode must never leave the taskbar hidden
  createWindow();
  registerHotkey();
  setTimeout(() => steamchat.autoStart(), 4000); // quietly reconnect Steam chat if the user connected before
  startDiscordIfEnabled();
  setTimeout(discordIdle, 2500);
  startPadWatch();
  buildTray();
  setInterval(buildTray, 15 * 60 * 1000);
  setTimeout(backgroundEmuUpdates, 20000);
  setInterval(backgroundEmuUpdates, 6 * 60 * 60 * 1000);
});
app.on('window-all-closed', () => { if (app.isQuitting) app.quit(); });
