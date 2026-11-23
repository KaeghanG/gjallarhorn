// Finds installed games from Steam and Epic.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Minimal parser for Valve's text KeyValues (VDF/ACF) format.
function parseVdf(text) {
  const root = {};
  const stack = [root];
  const re = /"((?:\\.|[^"\\])*)"|([{}])/g;
  let key = null;
  let m;
  while ((m = re.exec(text))) {
    const cur = stack[stack.length - 1];
    if (m[2] === '{') {
      const obj = {};
      cur[key] = obj;
      stack.push(obj);
      key = null;
    } else if (m[2] === '}') {
      stack.pop();
    } else {
      const s = m[1].replace(/\\\\/g, '\\');
      if (key === null) key = s;
      else {
        cur[key] = s;
        key = null;
      }
    }
  }
  return root;
}

function steamRoot() {
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], {
      encoding: 'utf8',
    });
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    if (m) return path.normalize(m[1].trim());
  } catch {}
  const def = 'C:\\Program Files (x86)\\Steam';
  return fs.existsSync(def) ? def : null;
}

const SKIP_APPS = new Set(['228980', '1070560', '1391110', '1628350', '1493710', '2180100']); // redistributables / runtimes

function scanSteam() {
  const root = steamRoot();
  if (!root) return [];
  const games = [];
  let libs = [root];
  try {
    const vdf = parseVdf(fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8'));
    const lf = vdf.libraryfolders || {};
    libs = Object.values(lf)
      .map((v) => (typeof v === 'object' ? v.path : null))
      .filter(Boolean);
    if (!libs.length) libs = [root];
  } catch {}
  for (const lib of libs) {
    const sa = path.join(lib, 'steamapps');
    let files = [];
    try {
      files = fs.readdirSync(sa).filter((f) => /^appmanifest_\d+\.acf$/.test(f));
    } catch {
      continue;
    }
    for (const f of files) {
      try {
        const st = parseVdf(fs.readFileSync(path.join(sa, f), 'utf8')).AppState;
        if (!st || SKIP_APPS.has(st.appid) || /redist|proton|steamworks/i.test(st.name || '')) continue;
        // A manifest we wrote ourselves for a queued install has no name (and an `AppID` key) until Steam fills it in: keep it out of the library, never break the scan.
        if (!st.appid && st.AppID) st.appid = st.AppID;
        if (!st.name) continue;
        games.push({
          key: `steam-${st.appid}`,
          source: 'steam',
          appid: st.appid,
          name: st.name,
          dir: path.join(sa, 'common', st.installdir),
          sizeBytes: Number(st.SizeOnDisk) || 0,
          installed: ((Number(st.StateFlags) || 0) & 4) !== 0,        // StateFlags bit 4 = fully installed
          updateRequired: ((Number(st.StateFlags) || 0) & 2) !== 0,   // bit 2 = Steam has an update queued
          lastPlayed: Number(st.LastPlayed) * 1000 || 0,
          cover: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${st.appid}/library_600x900_2x.jpg`,
          hero: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${st.appid}/library_hero.jpg`,
          header: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${st.appid}/header.jpg`,
          launch: `steam://rungameid/${st.appid}`,
        });
      } catch {}
    }
  }
  return games;
}

// New-style Epic launcher ("eglv2", per-user): installs are listed in installations.jsonl, titles/art in the catalog cache.
function scanEpicV2() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'com.epicgames.eglv2');
  let lines = [];
  try { lines = fs.readFileSync(path.join(base, 'installations.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean); } catch { return []; }
  const latest = new Map(); // installationId -> newest record (later lines supersede earlier ones)
  for (const l of lines) {
    try { const j = JSON.parse(l); if (j.installationId) latest.set(j.installationId, j); } catch {}
  }
  let items = {};
  try { items = JSON.parse(fs.readFileSync(path.join(base, 'cache', 'prod', 'catalog-cache.json'), 'utf8')).items || {}; } catch {}
  const games = [];
  for (const j of latest.values()) {
    if (!j.complete || !j.dir || !fs.existsSync(j.dir)) continue;
    const it = items[j.itemId]?.item;
    const img = (t) => it?.keyImages?.find((k) => k.type === t)?.url || null;
    const exe = j.launchExecutable ? path.join(j.dir, j.launchExecutable) : null;
    games.push({
      key: `epic-${j.artifactId}`,
      source: 'epic',
      appid: null,
      name: it?.title || path.basename(j.dir),
      dir: j.dir,
      exe,
      sizeBytes: 0,
      lastPlayed: 0,
      cover: img('DieselGameBoxTall') || img('OfferImageTall'),
      hero: img('DieselGameBox') || img('OfferImageWide'),
      header: img('DieselGameBox') || img('Thumbnail'),
      launch: `com.epicgames.launcher://apps/${encodeURIComponent(`${j.namespace}:${j.itemId}:${j.artifactId}`)}?action=launch&silent=true`,
    });
  }
  return games;
}

function scanEpic() {
  const dir = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';
  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.item'));
  } catch {
    return scanEpicV2();
  }
  const games = [];
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (!j.bIsApplication || j.bIsIncompleteInstall) continue;
      games.push({
        key: `epic-${j.AppName}`,
        source: 'epic',
        appid: null,
        name: j.DisplayName,
        dir: j.InstallLocation,
        exe: j.LaunchExecutable ? path.join(j.InstallLocation, j.LaunchExecutable) : null,
        sizeBytes: Number(j.InstallSize) || 0,
        lastPlayed: 0,
        cover: null,
        hero: null,
        header: null,
        launch: `com.epicgames.launcher://apps/${encodeURIComponent(
          `${j.CatalogNamespace}:${j.CatalogItemId}:${j.AppName}`
        )}?action=launch&silent=true`,
      });
    } catch {}
  }
  for (const g of scanEpicV2()) if (!games.some((x) => x.key === g.key)) games.push(g);
  return games;
}

// User-added games (any .exe), like Steam's "Add a non-Steam game".
function customGames(list = []) {
  return list.map((c) => ({
    key: `custom-${c.id}`,
    source: 'custom',
    customId: c.id,
    appid: c.steamAppID || null,
    name: c.name,
    dir: path.dirname(c.exe),
    exe: c.exe,
    args: c.args || '',
    sizeBytes: 0,
    lastPlayed: c.lastPlayed || 0,
    cover: c.cover || null,
    hero: c.hero || null,
    header: null,
    missing: !fs.existsSync(c.exe),
  }));
}

function splitArgs(s) {
  const out = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(s || ''))) out.push(m[1] ?? m[2]);
  return out;
}

function launchCustom(game) {
  const { spawn } = require('child_process');
  if (!/\.(exe|bat|cmd|lnk)$/i.test(game.exe) || !fs.existsSync(game.exe)) throw new Error('Executable not found');
  const child = spawn(game.exe, splitArgs(game.args), { cwd: path.dirname(game.exe), detached: true, stdio: 'ignore', shell: /\.(bat|cmd|lnk)$/i.test(game.exe) });
  child.on('error', () => {});
  child.unref();
  return true;
}

const launchers = require('./launchers.cjs');
function scanAll(custom = []) {
  let others = [];
  try { others = launchers.scanOthers(); } catch {} // other stores must never break the Steam/Epic scan
  const all = [...scanSteam(), ...scanEpic(), ...others, ...customGames(custom)];
  return all.sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || String(a.name || '').localeCompare(String(b.name || '')));
}

module.exports = { scanAll, parseVdf, launchCustom, splitArgs, steamRoot };
