const { contextBridge, ipcRenderer } = require('electron');

const call = async (ch, ...args) => {
  const r = await ipcRenderer.invoke(ch, ...args);
  if (r.error) throw new Error(r.error);
  return r.data;
};

contextBridge.exposeInMainWorld('gjallar', {
  fetchJson: (url, opts) => call('net:json', url, opts),
  fetchText: (url, opts) => call('net:text', url, opts),
  scanLibrary: () => call('library:scan'),
  saveCustomGame: (game) => call('custom:save', game),
  removeCustomGame: (id) => call('custom:remove', id),
  launchGame: (game) => call('game:launch', game),
  tweakStatus: (game) => call('tweaks:status', game),
  applyTweaks: (game, ids) => call('tweaks:apply', game, ids),
  revertTweaks: (game) => call('tweaks:revert', game),
  wikiLookup: (q) => call('wiki:lookup', q),
  humbleBundles: () => call('humble:bundles'),
  optiInfo: () => call('opti:info'),
  optiDownload: () => call('opti:download'),
  optiInstall: (game, opts) => call('opti:install', game, opts),
  optiUninstall: (game) => call('opti:uninstall', game),
  onOptiProgress: (fn) => {
    const h = (_e, p) => fn(p);
    ipcRenderer.on('opti:progress', h);
    return () => ipcRenderer.removeListener('opti:progress', h);
  },
  emuStatus: (list) => call('emu:status', list),
  emuLatest: (id) => call('emu:latest', id),
  emuInstall: (id) => call('emu:install', id),
  emuUninstall: (id) => call('emu:uninstall', id),
  emuRoot: () => call('emu:root'),
  onEmuProgress: (fn) => {
    const h = (_e, p) => fn(p);
    ipcRenderer.on('emu:progress', h);
    return () => ipcRenderer.removeListener('emu:progress', h);
  },
  detectRegion: () => call('region:detect'),
  sessionStatus: () => call('session:status'),
  playtime: () => call('playtime:get'),
  onSession: (fn) => {
    const h = (_e, ev) => fn(ev);
    ipcRenderer.on('session', h);
    return () => ipcRenderer.removeListener('session', h);
  },
  recordPrice: (gameID, price, title) => call('prices:record', gameID, price, title),
  priceHistory: (q) => call('prices:history', q),
  saveLocations: (game) => call('saves:locations', game),
  saveList: (game) => call('saves:list', game),
  saveBackup: (game, paths) => call('saves:backup', game, paths),
  saveRestore: (game, file) => call('saves:restore', game, file),
  saveRoot: () => call('saves:root'),
  romScan: () => call('roms:scan'),
  romArt: (list) => call('roms:art', list),
  romLaunch: (rom, exe) => call('roms:launch', rom, exe),
  romSystems: () => call('roms:systems'),
  setFullscreen: (on) => call('win:fullscreen', on),
  power: (what) => call('power:action', what),
  achievements: (game) => call('ach:get', game),
  raSummary: () => call('ra:summary'),
  hardware: () => call('hw:get'),
  deckStatus: (appid) => call('deck:get', appid),
  controllers: () => call('pads:get'),
  sessionReports: () => call('reports:get'),
  emuUpdates: () => call('emu:updates'),
  onEmuUpdates: (fn) => {
    const h = (_e, u) => fn(u);
    ipcRenderer.on('emu:updates', h);
    return () => ipcRenderer.removeListener('emu:updates', h);
  },
  getLaunchArgs: (key) => call('args:get', key),
  setLaunchArgs: (key, args) => call('args:set', key, args),
  quickHide: () => call('quick:hide'),
  onQuickShown: (fn) => ipcRenderer.on('quick:shown', () => fn()),
  onOpenCouch: (fn) => ipcRenderer.on('open-couch', () => fn()),
  setHotkey: (key) => call('hotkey:set', key),
  setPadCombo: (patch) => call('padcombo:set', patch),
  padPeek: () => call('pad:peek'),
  overlayAction: (a) => call('overlay:action', a),
  overlayState: () => call('overlay:state'),
  dlMgr: { list: () => call('dl:list'), open: () => call('dl:open'), pause: () => call('dl:open'), resume: () => call('dl:open') },
  sysinfo: () => call('sys:info'), setVolume: (n) => call('sys:volume', n), setMute: (b) => call('sys:mute', b),
  achievementsPublic: (appid) => call('ach:public', appid), pads: () => call('pads:list'),
  install: { prepare: (id) => call('install:prepare', id), start: (id, lib) => call('install:start', id, lib), status: (id) => call('install:status', id), steamDialog: (id) => call('install:steamDialog', id) },
  padType: () => call('pad:type'),
  onPadType: (fn) => { const h = (_e, t) => fn(t); ipcRenderer.on('pad:type', h); return () => ipcRenderer.removeListener('pad:type', h); },
  closeGame: (force) => call('game:close', force),
  shotsList: () => call('shots:list'),
  storeFeatured: () => call('store:featured'), storeSearch: (t) => call('store:search', t),
  chat: {
    status: () => call('chat:status'), connect: () => call('chat:connect'), disconnect: () => call('chat:disconnect'), friends: () => call('chat:friends'), invites: () => call('chat:invites'), dismissInvite: (id) => call('chat:dismissInvite', id),
    history: (id) => call('chat:history', id), send: (id, t) => call('chat:send', id, t), accept: (id) => call('chat:accept', id), decline: (id) => call('chat:decline', id),
    join: (id) => call('chat:join', id), openSteam: (id) => call('chat:openSteam', id),
    onEvent: (fn) => { const h = (_e, ev) => fn(ev); ipcRenderer.on('chat:event', h); return () => ipcRenderer.removeListener('chat:event', h); },
  },
  onCouchPage: (fn) => { const h = (_e, pg) => fn(pg); ipcRenderer.on('couch-page', h); return () => ipcRenderer.removeListener('couch-page', h); },
  onCouchHome: (fn) => { const h = () => fn(); ipcRenderer.on('couch-home', h); return () => ipcRenderer.removeListener('couch-home', h); },
  onOverlayOpen: (fn) => {
    const h = (_e, d) => fn(d);
    ipcRenderer.on('overlay:open', h);
    return () => ipcRenderer.removeListener('overlay:open', h);
  },
  qsGet: () => call('qs:get'),
  qsVolume: (a) => call('qs:volume', a),
  qsBrightness: (d) => call('qs:brightness', d),
  qsDnd: (on) => call('qs:dnd', on),
  downloads: () => call('downloads:get'),
  dominantColor: (url) => call('color:dominant', url),
  displaysList: () => call('displays:list'),
  setCouchDisplay: (id) => call('couch:display', id),
  steamFriends: () => call('steam:friends'),
  onPadState: (fn) => {
    const h = (_e, s) => fn(s);
    ipcRenderer.on('pad:state', h);
    return () => ipcRenderer.removeListener('pad:state', h);
  },
  keyshops: (appid) => call('keyshops:get', appid),
  news: (appid) => call('news:get', appid),
  newsFeed: () => call('news:feed'),
  storage: () => call('storage:get'),
  uninstallGame: (game) => call('game:uninstall', game),
  ollamaStatus: () => call('ollama:status'),
  onBattery: () => call('power:battery'),
  ownedList: () => call('owned:list'),
  installOwned: (g) => call('owned:install', g),
  getSettings: () => call('settings:get'),
  setSettings: (patch) => call('settings:set', patch),
  open: (url) => call('shell:open', url),
  showPath: (p) => call('shell:showPath', p),
  exists: (p) => call('fs:exists', p),
  resolveEnv: (p) => call('fs:resolveEnv', p),
  launchExe: (p) => call('emu:launch', p),
  pickFolder: (title) => call('dialog:pickFolder', title),
  pickExe: (title) => call('dialog:pickExe', title),
  workshop: { browse: (q) => call('ws:browse', q), subscribe: (id, appid, on) => call('ws:subscribe', id, appid, on), open: (id) => call('ws:open', id), hub: (appid) => call('ws:hub', appid) },
  pickMedia: (title) => call('dialog:pickMedia', title),
  notify: (title, body) => call('notify', title, body),
  win: {
    min: () => ipcRenderer.send('win:min'),
    max: () => ipcRenderer.send('win:max'),
    close: () => ipcRenderer.send('win:close'),
    onState: (fn) => ipcRenderer.on('win:state', (_e, s) => fn(s)),
  },
});
