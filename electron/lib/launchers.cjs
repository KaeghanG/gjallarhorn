// Games from other stores/launchers, read from where each launcher records its installs (read-only, nothing is modified):
//   Riot Games (League of Legends, VALORANT, ...), GOG (Galaxy registry entries), Ubisoft Connect (registry).
// Each game has the same shape as library.cjs entries. Launch is either a protocol link (`launch`) or an executable (`launchExe` + `launchArgs`).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const reg = (key) => {
  try { return execFileSync('reg', ['query', key, '/s'], { encoding: 'utf8', windowsHide: true, timeout: 20000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; }
};
// `reg query /s` prints blocks: a key header line followed by indented "Name    REG_SZ    Value" lines.
function parseRegBlocks(out) {
  const blocks = [];
  let cur = null;
  for (const line of out.split(/\r?\n/)) {
    if (/^HKEY_/i.test(line.trim())) { cur = { key: line.trim(), values: {} }; blocks.push(cur); continue; }
    const m = line.match(/^\s+(.+?)\s+REG_\w+\s+(.*)$/);
    if (m && cur) cur.values[m[1]] = m[2].trim();
  }
  return blocks;
}

// ---------- Riot Games ----------
const RIOT_PRODUCTS = {
  league_of_legends: { name: 'League of Legends', process: 'League of Legends.exe', sub: 'Game' },
  valorant: { name: 'VALORANT', process: 'VALORANT.exe', sub: '' },
  bacon: { name: 'Legends of Runeterra', process: 'LoR.exe', sub: '' },
  '2xko': { name: '2XKO', process: '2XKO.exe', sub: '' },
};
function scanRiot(root = process.env.ProgramData ? path.join(process.env.ProgramData, 'Riot Games') : null) {
  if (!root) return [];
  let client = null;
  try {
    const j = JSON.parse(fs.readFileSync(path.join(root, 'RiotClientInstalls.json'), 'utf8'));
    client = j.rc_default || j.rc_live || Object.values(j).find((v) => typeof v === 'string' && /RiotClientServices\.exe$/i.test(v)) || null;
  } catch { return []; }
  if (!client || !fs.existsSync(client)) return [];
  const meta = path.join(root, 'Metadata');
  let dirs = [];
  try { dirs = fs.readdirSync(meta); } catch { return []; }
  const games = [];
  for (const d of dirs) {
    const m = d.match(/^(.+)\.(live|pbe)$/i);
    if (!m || m[2].toLowerCase() !== 'live') continue;
    const product = m[1].toLowerCase();
    let dir = null;
    try {
      const y = fs.readFileSync(path.join(meta, d, `${d}.product_settings.yaml`), 'utf8');
      dir = y.match(/product_install_full_path:\s*"?([^"\r\n]+)"?/)?.[1]?.trim().replace(/\//g, '\\') || null;
    } catch { continue; }
    if (!dir || !fs.existsSync(dir)) continue; // uninstalled products leave metadata behind
    const info = RIOT_PRODUCTS[product] || { name: product.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), process: null, sub: '' };
    games.push({
      key: `riot-${product}`, source: 'riot', appid: null, name: info.name, dir,
      exe: info.process ? path.join(dir, info.sub, info.process) : null, // used only to recognise the running game
      launchExe: client, launchArgs: [`--launch-product=${product}`, '--launch-patchline=live'],
      sizeBytes: 0, lastPlayed: 0, cover: null, hero: null, header: null,
    });
  }
  return games;
}

// ---------- GOG ----------
function scanGog() {
  const games = [];
  for (const b of parseRegBlocks(reg('HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games'))) {
    const v = b.values;
    const id = b.key.split('\\').pop();
    if (!/^\d+$/.test(id) || !v.gameName || !v.exe || !fs.existsSync(v.exe)) continue;
    games.push({
      key: `gog-${id}`, source: 'gog', appid: null, name: v.gameName, dir: v.path || path.dirname(v.exe), exe: v.exe,
      launchExe: v.exe, launchArgs: v.launchParam ? v.launchParam.split(/\s+/).filter(Boolean) : [],
      sizeBytes: 0, lastPlayed: 0, cover: null, hero: null, header: null,
    });
  }
  return games;
}

// ---------- Ubisoft Connect ----------
function scanUbisoft() {
  const games = [];
  for (const b of parseRegBlocks(reg('HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs'))) {
    const id = b.key.split('\\').pop();
    const dir = (b.values.InstallDir || '').replace(/\//g, '\\').replace(/\\$/, '');
    if (!/^\d+$/.test(id) || !dir || !fs.existsSync(dir)) continue;
    games.push({
      key: `ubisoft-${id}`, source: 'ubisoft', appid: null, name: path.basename(dir), dir, exe: null,
      launch: `uplay://launch/${id}/0`,
      sizeBytes: 0, lastPlayed: 0, cover: null, hero: null, header: null,
    });
  }
  return games;
}

// ---------- Battle.net / EA app (via Windows "installed programs" entries; launches the game's own exe) ----------
function biggestExe(dir) {
  try {
    const skip = /unins|crash|redist|setup|install|launcher_|vc_|dxsetup|cleanup/i;
    return fs.readdirSync(dir).filter((n) => /\.exe$/i.test(n) && !skip.test(n)).map((n) => ({ n, s: fs.statSync(path.join(dir, n)).size })).sort((a, b) => b.s - a.s)[0]?.n || null;
  } catch { return null; }
}
function scanByPublisher(publisher, source, skipName) {
  const games = [], seen = new Set();
  for (const root of ['HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall']) {
    for (const b of parseRegBlocks(reg(root))) {
      const v = b.values;
      const dir = (v.InstallLocation || '').replace(/\//g, '\\').replace(/\\$/, '');
      if (!publisher.test(v.Publisher || '') || !v.DisplayName || !dir || !fs.existsSync(dir) || skipName.test(v.DisplayName) || seen.has(dir.toLowerCase())) continue;
      const exe = biggestExe(dir);
      if (!exe) continue;
      seen.add(dir.toLowerCase());
      games.push({ key: `${source}-${v.DisplayName}`, source, appid: null, name: v.DisplayName, dir, exe: path.join(dir, exe), launchExe: path.join(dir, exe), launchArgs: [], sizeBytes: 0, lastPlayed: 0, cover: null, hero: null, header: null });
    }
  }
  return games;
}
const scanBattlenet = () => scanByPublisher(/blizzard/i, 'battlenet', /battle\.net|agent/i);
const scanEA = () => scanByPublisher(/electronic arts/i, 'ea', /^ea app|^origin|ea desktop|anticheat/i);

function scanOthers() { return [...scanRiot(), ...scanGog(), ...scanUbisoft(), ...scanBattlenet(), ...scanEA()]; }

// Launch a game that has `launchExe` (Riot, GOG). Returns true or throws.
function launchExe(game) {
  const { spawn } = require('child_process');
  if (!game.launchExe || !fs.existsSync(game.launchExe)) throw new Error('Launcher not found. Is the game still installed?');
  const child = spawn(game.launchExe, game.launchArgs || [], { cwd: path.dirname(game.launchExe), detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
  return true;
}

module.exports = { scanOthers, scanRiot, scanGog, scanUbisoft, launchExe, parseRegBlocks };

// ---------- Steam "Add a Non-Steam Game" shortcuts (userdata/<id>/config/shortcuts.vdf, binary VDF) ----------
function parseBinVdf(buf) {
  let p = 0;
  const cstr = () => { const e = buf.indexOf(0, p); const s = buf.toString('utf8', p, e < 0 ? buf.length : e); p = (e < 0 ? buf.length : e) + 1; return s; };
  const obj = () => {
    const o = {};
    while (p < buf.length) {
      const t = buf[p++];
      if (t === 8) return o; // end of object
      const k = cstr();
      if (t === 0) o[k] = obj();
      else if (t === 1) o[k] = cstr();
      else if (t === 2) { o[k] = buf.readUInt32LE(p); p += 4; }
      else break; // unknown type: stop rather than mis-parse
    }
    return o;
  };
  return obj();
}
const EMU_EXE = /^(eden|yuzu|suyu|ryujinx|rpcs3|shadps4|pcsx2|duckstation|ppsspp|dolphin|cemu|xemu|melonds|mgba|flycast|xenia|vita3k|citra|lime3d|azahar|retroarch|bizhawk|mesen|snes9x|rmg|mupen)[^\/]*.exe$/i;
function scanShortcuts() {
  const root = require('./library.cjs').steamRoot?.();
  if (!root) return [];
  const games = [];
  let users = [];
  try { users = fs.readdirSync(path.join(root, 'userdata')); } catch { return []; }
  for (const u of users) {
    let data;
    try { data = parseBinVdf(fs.readFileSync(path.join(root, 'userdata', u, 'config', 'shortcuts.vdf'))); } catch { continue; }
    const list = data.shortcuts || data.Shortcuts || {};
    for (const [idx, sc] of Object.entries(list)) {
      const g = (k) => sc[k] ?? sc[k.toLowerCase()] ?? sc[k.charAt(0).toLowerCase() + k.slice(1)];
      const exe = String(g('Exe') || '').replace(/^"|"$/g, '');
      const name = g('AppName') || g('appname');
      if (!exe || !name) continue;
      if (EMU_EXE.test(path.basename(exe)) || /[\/]emulators[\/]/i.test(exe)) continue; // emulators already have their own tab; only real games here
      games.push({
        key: `shortcut-${u}-${idx}`, source: 'shortcut', appid: null, name, dir: String(g('StartDir') || path.dirname(exe)).replace(/^"|"$/g, ''), exe,
        args: String(g('LaunchOptions') || ''), sizeBytes: 0, lastPlayed: Number(g('LastPlayTime')) * 1000 || 0, cover: null, hero: null, header: null,
        missing: !fs.existsSync(exe),
      });
    }
  }
  return games;
}
module.exports.scanShortcuts = scanShortcuts;
module.exports.parseBinVdf = parseBinVdf;
const _scanOthers = module.exports.scanOthers;
module.exports.scanOthers = () => [..._scanOthers(), ...scanShortcuts()];
