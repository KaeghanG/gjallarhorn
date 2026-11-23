// Save-game backups. Save locations come from PCGamingWiki's "Game data/saves" rows (Windows),
// with the wiki's path placeholders expanded. Backups are versioned zips (keeps the newest N).
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { app } = require('electron');
const net = require('./net.cjs');
const { findPage } = require('./wiki.cjs');

const API = 'https://www.pcgamingwiki.com/w/api.php';
const KEEP = 10;

function steamRoot() {
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], { encoding: 'utf8' });
    const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
    if (m) return path.normalize(m[1].trim());
  } catch {}
  return 'C:\\Program Files (x86)\\Steam';
}

// Expand {{p|...}} placeholders used on PCGamingWiki.
function expand(raw, game) {
  const home = os.homedir();
  const map = {
    userprofile: home,
    'userprofile\\documents': path.join(home, 'Documents'),
    'userprofile\\appdata\\locallow': path.join(home, 'AppData', 'LocalLow'),
    appdata: process.env.APPDATA,
    localappdata: process.env.LOCALAPPDATA,
    public: process.env.PUBLIC || 'C:\\Users\\Public',
    programdata: process.env.PROGRAMDATA || 'C:\\ProgramData',
    game: game.dir,
    steam: steamRoot(),
    windir: process.env.WINDIR || 'C:\\Windows',
  };
  let unresolved = false;
  let p = raw.replace(/\{\{p\|([^}]+)\}\}/gi, (_, k) => {
    const v = map[k.trim().toLowerCase()];
    if (v) return v;
    unresolved = true;
    return `<${k}>`;
  });
  p = p.replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '').replace(/\{\{[^}]*\}\}/g, '').replace(/\//g, '\\').trim();
  // Steam user id folders: pick every numeric folder that exists.
  return { path: p, unresolved, hasUid: /<uid>|<user ?id>/i.test(p) };
}

function globExisting(p) {
  // Supports one wildcard segment like ...\<uid>\... or *
  const parts = p.split('\\');
  const idx = parts.findIndex((s) => /^<.*>$|\*/.test(s));
  if (idx < 0) return fs.existsSync(p) ? [p] : [];
  const base = parts.slice(0, idx).join('\\');
  let ents = [];
  try { ents = fs.readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { return []; }
  return ents.flatMap((e) => globExisting([base, e.name, ...parts.slice(idx + 1)].join('\\')));
}

// Split on | that are not inside nested {{ }}.
function splitTop(s) {
  const out = [];
  let depth = 0, cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s.startsWith('{{', i)) { depth++; cur += '{{'; i++; continue; }
    if (s.startsWith('}}', i)) { depth--; cur += '}}'; i++; continue; }
    if (s[i] === '|' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += s[i];
  }
  out.push(cur);
  return out;
}

async function locations(game) {
  const page = await findPage({ name: game.name });
  if (!page) return { page: null, paths: [] };
  const p = await net.get(`${API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2&redirects=1`);
  const wt = p.parse?.wikitext || '';
  const rows = [...wt.matchAll(/\{\{Game data\/saves\|Windows\|([^\n]*)\}\}\s*$/gim)].map((m) => m[1]);
  const raws = rows.flatMap((r) => splitTop(r).map((s) => s.trim().replace(/\\+$/, '')).filter((s) => s && /\{\{p\||[A-Z]:\\/i.test(s)));
  const paths = raws.map((r) => {
    const e = expand(r, game);
    const found = e.unresolved && !e.hasUid ? [] : globExisting(e.path);
    return { raw: r, path: e.path, found };
  });
  return { page, paths };
}

// ---------- backup / restore ----------
const rootFor = (settingsRoot) => settingsRoot || path.join(os.homedir(), 'Documents', 'Gjallarhorn Saves');
const safe = (s) => s.replace(/[<>:"/\\|?*™®©]/g, '').trim();

function zipDir(src, dest) {
  // Windows tar (bsdtar) writes zip when the file ends in .zip and -a is used.
  execFileSync('tar', ['-a', '-c', '-f', dest, '-C', src, '.'], { stdio: 'ignore' });
}

async function backup(game, { root, paths, tag = '' } = {}) {
  const loc = paths ? { paths: paths.map((p) => ({ found: [p] })) } : await locations(game);
  const sources = [...new Set(loc.paths.flatMap((p) => p.found))].filter((p) => fs.existsSync(p));
  if (!sources.length) throw new Error('No save folder found for this game');
  const dir = path.join(rootFor(root), safe(game.name));
  fs.mkdirSync(dir, { recursive: true });
  // Millisecond stamp + a never-overwrite check: a restore makes a safety backup right after another one.
  let stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 23);
  while (fs.readdirSync(dir).some((f) => f.startsWith(stamp))) stamp = stamp.replace(/(\d)$/, (d) => String((Number(d) + 1) % 10));
  const made = [];
  sources.forEach((src, i) => {
    const isDir = fs.statSync(src).isDirectory();
    const dest = path.join(dir, `${stamp}${tag}${sources.length > 1 ? `_${i + 1}` : ''}.zip`);
    if (isDir) zipDir(src, dest);
    else execFileSync('tar', ['-a', '-c', '-f', dest, '-C', path.dirname(src), path.basename(src)], { stdio: 'ignore' });
    fs.writeFileSync(dest + '.json', JSON.stringify({ source: src, isDir, game: game.name, at: Date.now() }));
    made.push(dest);
  });
  prune(dir);
  return { dir, files: made };
}

function prune(dir) {
  const zips = fs.readdirSync(dir).filter((f) => f.endsWith('.zip')).sort().reverse();
  for (const z of zips.slice(KEEP * 3)) {
    try { fs.unlinkSync(path.join(dir, z)); fs.unlinkSync(path.join(dir, z + '.json')); } catch {}
  }
  // Keep at most KEEP distinct timestamps.
  const stamps = [...new Set(zips.map((z) => z.slice(0, 23)))];
  for (const s of stamps.slice(KEEP)) for (const z of zips.filter((x) => x.startsWith(s))) {
    try { fs.unlinkSync(path.join(dir, z)); fs.unlinkSync(path.join(dir, z + '.json')); } catch {}
  }
}

function list(game, root) {
  const dir = path.join(rootFor(root), safe(game.name));
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.zip')).sort().reverse(); } catch {}
  return {
    dir,
    backups: files.map((f) => {
      const full = path.join(dir, f);
      let meta = {};
      try { meta = JSON.parse(fs.readFileSync(full + '.json', 'utf8')); } catch {}
      return { file: full, name: f, size: fs.statSync(full).size, at: meta.at || fs.statSync(full).mtimeMs, source: meta.source };
    }),
  };
}

// Restore: first back up what's there now (so a restore can be undone), then extract over it.
async function restore(game, file, root) {
  const meta = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
  if (fs.existsSync(meta.source)) await backup(game, { root, paths: [meta.source], tag: '_before-restore' });
  const target = meta.isDir ? meta.source : path.dirname(meta.source);
  fs.mkdirSync(target, { recursive: true });
  execFileSync('tar', ['-x', '-f', file, '-C', target], { stdio: 'ignore' });
  return { restoredTo: target };
}

module.exports = { locations, backup, list, restore, rootFor, expand };
