// Install a Steam game from Gjallarhorn's own UI instead of Steam's install dialog.
// Method: write a minimal appmanifest (StateFlags 1026 = "update required/started") into the chosen Steam library folder; Steam notices it and
// starts the download (a community technique, not an official API, so it is verified by watching the manifest and falls back to steam://install).
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { shell } = require('electron');
const net = require('./net.cjs');
const library = require('./library.cjs');

function libraries() {
  const root = library.steamRoot();
  if (!root) return [];
  let libs = [root];
  try {
    const vdf = library.parseVdf(fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8'));
    const l = Object.values(vdf.libraryfolders || {}).map((v) => (typeof v === 'object' ? v.path : null)).filter(Boolean);
    if (l.length) libs = l;
  } catch {}
  return libs.filter((p) => fs.existsSync(path.join(p, 'steamapps')) || fs.existsSync(p)).map((p) => {
    let free = null, total = null;
    try { const s = fs.statfsSync(p); free = Number(s.bavail) * Number(s.bsize); total = Number(s.blocks) * Number(s.bsize); } catch {}
    return { path: p, label: `${path.parse(p).root.replace(/\\$/, '')} drive`, freeBytes: free, totalBytes: total, isSteamRoot: path.resolve(p) === path.resolve(root) };
  });
}

const safeDir = (name) => String(name || '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);

// Name of the folder Steam uses under steamapps/common, and the expected download size, from public data.
async function details(appid) {
  const id = String(appid).replace(/\D/g, '');
  if (!id) throw new Error('Invalid app id');
  let name = null, sizeBytes = null, installdir = null;
  try {
    const r = await net.get(`https://store.steampowered.com/api/appdetails?appids=${id}&filters=basic,pc_requirements`, { disk: 24 * 3600e3 });
    const d = r?.[id]?.data;
    name = d?.name || null;
    const req = `${d?.pc_requirements?.minimum || ''} ${d?.pc_requirements?.recommended || ''}`;
    const m = req.match(/(\d+(?:[.,]\d+)?)\s*(GB|MB|TB)\s*(?:available|of available)/i);
    if (m) sizeBytes = Number(m[1].replace(',', '.')) * ({ MB: 1e6, GB: 1e9, TB: 1e12 }[m[2].toUpperCase()]);
  } catch {}
  try {
    const r = await net.get(`https://api.steamcmd.net/v1/info/${id}`, { disk: 24 * 3600e3 });
    installdir = r?.data?.[id]?.config?.installdir || null;
  } catch {}
  return { appid: id, name, sizeBytes, installdir: installdir || safeDir(name) || `app_${id}` };
}

async function prepare(appid) {
  const d = await details(appid);
  return { ...d, libraries: libraries() };
}

const manifestPath = (lib, id) => path.join(lib, 'steamapps', `appmanifest_${id}.acf`);
function readManifest(id) {
  for (const l of libraries()) {
    try { return { lib: l.path, ...library.parseVdf(fs.readFileSync(manifestPath(l.path, id), 'utf8')).AppState }; } catch {}
  }
  return null;
}

function ensureSteam() {
  const steamExe = path.join(library.steamRoot() || 'C:\\Program Files (x86)\\Steam', 'steam.exe');
  if (!fs.existsSync(steamExe)) return false;
  const c = spawn(steamExe, ['-silent'], { detached: true, stdio: 'ignore' });
  c.on('error', () => {});
  c.unref();
  return true;
}

async function start(appid, libPath) {
  const id = String(appid).replace(/\D/g, '');
  const lib = libraries().find((l) => l.path === libPath);
  if (!id || !lib) throw new Error('Pick one of your Steam library folders');
  if (readManifest(id)?.StateFlags === '4') throw new Error('Already installed');
  const d = await details(id);
  const steamapps = path.join(lib.path, 'steamapps');
  fs.mkdirSync(steamapps, { recursive: true });
  const file = manifestPath(lib.path, id);
  if (!fs.existsSync(file)) {
    const q = (k, v) => `\t"${k}"\t\t"${String(v).replace(/"/g, '')}"\n`;
    fs.writeFileSync(file, `"AppState"\n{\n${q('AppID', id)}${q('Universe', 1)}${q('installdir', d.installdir)}${q('StateFlags', 1026)}}\n`);
  }
  ensureSteam();
  // Steam does not always notice a hand-written manifest while it is running. If it has not reacted after a few seconds, open Steam's own install
  // dialog for this game (one click there) so the download never just sits in the queue.
  setTimeout(() => { try { if (status(id, Date.now() - 20000).phase === 'queued' || status(id, Date.now() - 20000).phase === 'needs-steam') steamDialog(id); } catch {} }, 12000);
  return { started: true, installdir: d.installdir, library: lib.path };
}

// Where is it? 'queued' (manifest written, Steam not reacted yet), 'downloading', 'done', or 'needs-steam' (use Steam's own dialog).
function status(appid, sinceMs) {
  const id = String(appid).replace(/\D/g, '');
  const m = readManifest(id);
  if (!m) return { phase: 'none' };
  const flags = Number(m.StateFlags) || 0;
  const total = Number(m.BytesToDownload) || 0, done = Number(m.BytesDownloaded) || 0;
  if (flags === 4) return { phase: 'done' };
  if (m.name || total > 0 || (flags & (1048576 | 256 | 2097152 | 4194304))) return { phase: 'downloading', percent: total ? Math.min(1, done / total) : null, downloaded: done, total, flags };
  if (sinceMs && Date.now() - sinceMs > 30000) return { phase: 'needs-steam' };
  return { phase: 'queued' };
}

// Fallback: Steam's own install dialog (the user confirms there).
function steamDialog(appid) { return shell.openExternal(`steam://install/${String(appid).replace(/\D/g, '')}`); }

module.exports = { prepare, start, status, steamDialog, libraries };
