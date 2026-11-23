// Tiny JSON settings store in %APPDATA%\Gjallarhorn\settings.json
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULTS = {
  wishlist: [], // [{ gameID, title, thumb, targetPrice, lastPrice }]
  customGames: [], // [{ id, name, exe, args, cover, hero, steamAppID }]
  emulatorPaths: {}, // id -> exe path override
  optiscalerProxy: 'dxgi.dll',
  region: '', // empty = auto-detect from Windows
  itadKey: '', // IsThereAnyDeal API key for price history
  saveRoot: '', // empty = Documents\Gjallarhorn Saves
  autoBackup: true, // back up saves when a game launched from Gjallarhorn closes
  boost: { priority: true, wallpaper: true },
  romFolders: [],
  friends: [], // [{ name, items: [{ gameID, title, steamAppID }], importedAt }]
  profileName: '',
  favorites: [], // game keys / rom ids pinned in couch mode
  launchArgs: {}, // gameKey -> launch options string
  ggKey: '', // GG.deals API key (key-shop prices)
  showKeyshops: true, // show grey-market key shops (G2A, Loaded/CDKeys) with warnings
  aiSwitch: true, // unload Ollama models from VRAM while a game runs
  launchOnSameScreen: true, // open games/emulators on the monitor Gjallarhorn is on
  inGameMenu: true, // hold the Guide/PS button in a game for the Resume / Quit / Quick settings menu
  couchDisplayId: null, // monitor couch mode opens on (null = wherever the window is)
  couchScale: 1, // couch-mode text/UI size
  couchSafe: 0, // couch-mode safe-area margin (percent) for TVs that crop the edges
  couchContrast: false,
  couchIdleMin: 3, // minutes of no input before the ambient slideshow
  shelves: {}, // { "Couch co-op": [gameKey, ...] }
  hapticTicks: false, // controller rumble tick on navigation (experimental)
  realm: 'asgard', // theme
  hiddenGames: [],
  librarySort: 'recent',
  libraryView: 'grid',
  raUser: '', raKey: '', // RetroAchievements
  autoUpdateEmus: false,
  quickHotkey: 'Control+Shift+Space', // Alt+Space is PowerToys Run
  closeToTray: true,
  onboarded: false,
  steamKey: '', // Steam Web API key (owned games list)
  steamId: '', // optional override; default = most recent login in loginusers.vdf
  couchSounds: true,

  reduceMotion: false,
};

const file = () => path.join(app.getPath('userData'), 'settings.json');

function load() {
  try {
    // Strip a UTF-8 BOM (Notepad / PowerShell add one) so a hand-edited file doesn't silently reset every setting.
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file(), 'utf8').replace(/^﻿/, '')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(patch) {
  const next = { ...load(), ...patch };
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(next, null, 2));
  return next;
}

module.exports = { load, save };
