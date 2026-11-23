// ROM library: scans the user's folders, works out the console from extension + folder names,
// matches box art from the libretro-thumbnails GitHub repos, and launches the right emulator.
// Gjallarhorn never downloads ROMs, BIOS or firmware: it only reads folders the user picks.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { app } = require('electron');
const net = require('./net.cjs');

// emu: id from src/data/emulators.js. core: RetroArch core for systems that only run there.
const SYSTEMS = [
  { id: 'switch', name: 'Nintendo Switch', ext: ['nsp', 'xci'], hint: /switch|\bns\b/, emu: 'eden', args: (r) => ['-f', '-g', r] },
  { id: 'wiiu', name: 'Wii U', ext: ['wua', 'wux', 'wud', 'rpx'], hint: /wii ?u/, emu: 'cemu', args: (r) => ['-f', '-g', r] },
  { id: 'wii', name: 'Wii', ext: ['wbfs'], hint: /\bwii\b(?! ?u)/, emu: 'dolphin', repo: 'Nintendo_-_Wii', args: (r) => ['-b', '-e', r] },
  { id: 'gc', name: 'GameCube', ext: ['gcm', 'rvz', 'gcz', 'ciso'], hint: /gamecube|\bgc\b|\bngc\b/, emu: 'dolphin', repo: 'Nintendo_-_GameCube', args: (r) => ['-b', '-e', r] },
  { id: '3ds', name: 'Nintendo 3DS', ext: ['3ds', 'cci', 'cxi', 'cia'], hint: /3ds/, emu: 'azahar', repo: 'Nintendo_-_Nintendo_3DS', args: (r) => [r] },
  { id: 'nds', name: 'Nintendo DS', ext: ['nds'], hint: /\bnds\b|\bds\b/, emu: 'melonds', repo: 'Nintendo_-_Nintendo_DS', args: (r) => [r] },
  { id: 'psp', name: 'PSP', ext: ['cso'], hint: /\bpsp\b/, emu: 'ppsspp', repo: 'Sony_-_PlayStation_Portable', args: (r) => [r] },
  { id: 'ps2', name: 'PlayStation 2', ext: ['iso'], hint: /ps2|playstation ?2/, emu: 'pcsx2', repo: 'Sony_-_PlayStation_2', args: (r) => ['-batch', '-fullscreen', '--', r] },
  { id: 'ps1', name: 'PlayStation', ext: ['cue', 'm3u', 'pbp'], hint: /\bps1\b|\bpsx\b|playstation ?1|\bplaystation\b(?! ?[2-5])/, emu: 'duckstation', repo: 'Sony_-_PlayStation', args: (r) => ['-fullscreen', r] },
  { id: 'x360', name: 'Xbox 360', ext: ['xex'], hint: /360/, emu: 'xenia-canary', repo: 'Microsoft_-_Xbox_360', args: (r) => [r] },
  { id: 'xbox', name: 'Xbox', ext: ['xiso'], hint: /\bxbox\b(?! ?360)/, emu: 'xemu', repo: 'Microsoft_-_Xbox', args: (r) => ['-dvd_path', r] },
  { id: 'dc', name: 'Dreamcast', ext: ['cdi', 'gdi'], hint: /dreamcast|\bdc\b/, emu: 'flycast', repo: 'Sega_-_Dreamcast', args: (r) => [r] },
  { id: 'n64', name: 'Nintendo 64', ext: ['z64', 'n64', 'v64'], hint: /n64|nintendo ?64/, emu: 'retroarch', core: 'mupen64plus_next_libretro', repo: 'Nintendo_-_Nintendo_64' },
  { id: 'snes', name: 'Super Nintendo', ext: ['sfc', 'smc'], hint: /snes|super ?nintendo|super ?famicom/, emu: 'retroarch', core: 'snes9x_libretro', repo: 'Nintendo_-_Super_Nintendo_Entertainment_System' },
  { id: 'nes', name: 'NES', ext: ['nes'], hint: /\bnes\b|famicom/, emu: 'retroarch', core: 'mesen_libretro', repo: 'Nintendo_-_Nintendo_Entertainment_System' },
  { id: 'gba', name: 'Game Boy Advance', ext: ['gba'], hint: /gba|advance/, emu: 'retroarch', core: 'mgba_libretro', repo: 'Nintendo_-_Game_Boy_Advance' },
  { id: 'gbc', name: 'Game Boy Color', ext: ['gbc'], hint: /gbc|color/, emu: 'retroarch', core: 'gambatte_libretro', repo: 'Nintendo_-_Game_Boy_Color' },
  { id: 'gb', name: 'Game Boy', ext: ['gb'], hint: /\bgb\b|game ?boy/, emu: 'retroarch', core: 'gambatte_libretro', repo: 'Nintendo_-_Game_Boy' },
  { id: 'md', name: 'Genesis / Mega Drive', ext: ['md', 'gen', 'smd'], hint: /genesis|mega ?drive/, emu: 'retroarch', core: 'genesis_plus_gx_libretro', repo: 'Sega_-_Mega_Drive_-_Genesis' },
];
// Extensions shared by several systems: decided by folder-name hints, else the default.
const AMBIGUOUS = { iso: 'ps2', chd: 'ps1', bin: 'ps1', zip: null, '7z': null };
const ALL_EXT = new Set([...SYSTEMS.flatMap((s) => s.ext), ...Object.keys(AMBIGUOUS)]);

function systemFor(file, root) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const rel = path.relative(root, path.dirname(file)).toLowerCase().replace(/[_.-]/g, ' ');
  const hinted = SYSTEMS.find((s) => s.hint.test(rel));
  const direct = SYSTEMS.find((s) => s.ext.includes(ext));
  if (direct && !(ext in AMBIGUOUS)) {
    // rvz/ciso etc. are shared by GC and Wii: let a Wii folder win.
    if (hinted && hinted.emu === direct.emu) return hinted;
    return direct;
  }
  if (ext in AMBIGUOUS) {
    if (hinted) return hinted;
    return AMBIGUOUS[ext] ? SYSTEMS.find((s) => s.id === AMBIGUOUS[ext]) : null;
  }
  return null;
}

const clean = (n) => n.replace(/\.[^.]+$/, '').replace(/\s*[([][^)\]]*[)\]]/g, '').replace(/_/g, ' ').trim();
const norm = (n) => clean(n).toLowerCase().replace(/^the /, '').replace(/, the\b/, '').replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');

function scan(folders) {
  const out = [];
  for (const root of folders) {
    const walk = (dir, depth) => {
      if (depth > 5 || out.length > 8000) return;
      let ents = [];
      try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      const names = new Set(ents.map((e) => e.name.toLowerCase()));
      for (const e of ents) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { walk(full, depth + 1); continue; }
        const ext = path.extname(e.name).slice(1).toLowerCase();
        if (!ALL_EXT.has(ext)) continue;
        // Prefer .cue/.m3u over the raw .bin tracks they reference.
        if (ext === 'bin' && [...names].some((n) => n.endsWith('.cue') || n.endsWith('.m3u'))) continue;
        if (ext === 'cue' && [...names].some((n) => n.endsWith('.m3u'))) continue;
        const sys = systemFor(full, root);
        if (!sys) continue;
        let size = 0;
        try { size = fs.statSync(full).size; } catch {}
        out.push({ id: Buffer.from(full).toString('base64url').slice(-48), path: full, file: e.name, title: clean(e.name), system: sys.id, systemName: sys.name, emu: sys.emu, size });
      }
    };
    walk(root, 0);
  }
  return out.sort((a, b) => a.systemName.localeCompare(b.systemName) || a.title.localeCompare(b.title));
}

// ---------- box art (libretro-thumbnails on GitHub) ----------
const thumbDir = () => path.join(app.getPath('userData'), 'thumbs');
async function thumbIndex(repo) {
  const f = path.join(thumbDir(), repo + '.json');
  try {
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (Date.now() - c.t < 14 * 864e5) return c.files;
  } catch {}
  const root = await net.get(`https://api.github.com/repos/libretro-thumbnails/${repo}/contents/`);
  const dir = root.find((x) => x.name === 'Named_Boxarts');
  if (!dir) return [];
  const tree = await net.get(`https://api.github.com/repos/libretro-thumbnails/${repo}/git/trees/${dir.sha}`);
  const files = (tree.tree || []).map((x) => x.path).filter((p) => p.endsWith('.png'));
  fs.mkdirSync(thumbDir(), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ t: Date.now(), files }));
  return files;
}

// Nintendo Switch covers: libretro has no Switch set, so use the public titledb (blawar/titledb). It is ~90 MB, downloaded once and
// reduced to a small name/id -> image index in the thumbs folder (refreshed every 30 days).
const swFile = () => path.join(thumbDir(), 'switch-index.json');
let swIndex = null, swLoading = null;
async function loadSwitchIndex() {
  if (swIndex) return swIndex;
  if (swLoading) return swLoading;
  swLoading = (async () => {
    try {
      const c = JSON.parse(fs.readFileSync(swFile(), 'utf8'));
      if (Date.now() - c.t < 30 * 864e5) return (swIndex = c);
    } catch {}
    try {
      const res = await fetch('https://raw.githubusercontent.com/blawar/titledb/master/US.en.json', { signal: AbortSignal.timeout(300000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const byId = {}, byName = {};
      for (const e of Object.values(j)) {
        const img = e.frontBoxArt || e.iconUrl || e.bannerUrl;
        if (!img || !e.name) continue;
        if (e.id) byId[String(e.id).toUpperCase()] = img;
        const k = norm(e.name);
        if (k && !byName[k]) byName[k] = img;
      }
      swIndex = { t: Date.now(), byId, byName };
      fs.mkdirSync(thumbDir(), { recursive: true });
      fs.writeFileSync(swFile(), JSON.stringify(swIndex));
      return swIndex;
    } catch { return (swIndex = { t: 0, byId: {}, byName: {} }); }
    finally { swLoading = null; }
  })();
  return swLoading;
}
async function switchArt(list) {
  const idx = await loadSwitchIndex();
  const out = {};
  for (const r of list) {
    const tid = /\[([0-9A-Fa-f]{16})\]/.exec(r.file || '')?.[1]?.toUpperCase();
    let u = tid && (idx.byId[tid] || idx.byId[tid.slice(0, 13) + '000']);
    if (!u) {
      const k = norm(r.file || r.title || '');
      u = idx.byName[k] || (k.length > 5 && Object.entries(idx.byName).find(([n]) => n.startsWith(k) || k.startsWith(n))?.[1]) || null;
    }
    if (u) out[r.id] = u;
  }
  return out;
}

async function art(roms) {
  const bySys = {};
  for (const r of roms) (bySys[r.system] ||= []).push(r);
  const result = {};
  for (const [sysId, list] of Object.entries(bySys)) {
    const sys = SYSTEMS.find((s) => s.id === sysId);
    if (!sys?.repo) continue;
    let files = [];
    try { files = await thumbIndex(sys.repo); } catch { continue; }
    const idx = new Map();
    for (const f of files) {
      const k = norm(f.replace(/\.png$/, ''));
      // Prefer USA, then World/Europe versions.
      const score = /\(USA/.test(f) ? 3 : /\(World/.test(f) ? 2 : /\(Europe/.test(f) ? 1 : 0;
      const cur = idx.get(k);
      if (!cur || score > cur.score) idx.set(k, { f, score });
    }
    for (const r of list) {
      const hit = idx.get(norm(r.file));
      if (hit) result[r.id] = `https://raw.githubusercontent.com/libretro-thumbnails/${sys.repo}/master/Named_Boxarts/${encodeURIComponent(hit.f.replace(/\.png$/, ''))}.png`;
    }
  }
  const sw = roms.filter((r) => r.system === 'switch' && !result[r.id]);
  if (sw.length) Object.assign(result, await switchArt(sw));
  return result;
}

// ---------- launch ----------
function retroarchCore(exe, core) {
  const p = path.join(path.dirname(exe), 'cores', `${core}.dll`);
  return fs.existsSync(p) ? p : null;
}

function launch(rom, exe) {
  const sys = SYSTEMS.find((s) => s.id === rom.system);
  if (!sys) throw new Error('Unknown system');
  if (!exe || !fs.existsSync(exe)) throw new Error(`Install or locate the ${sys.emu} emulator first (Emulators page)`);
  if (!fs.existsSync(rom.path)) throw new Error('ROM file is missing');
  let args;
  if (sys.emu === 'retroarch') {
    const core = retroarchCore(exe, sys.core);
    if (!core) throw new Error(`RetroArch needs the "${sys.core.replace('_libretro', '')}" core: open RetroArch → Online Updater → Core Downloader`);
    args = ['-L', core, rom.path];
  } else args = sys.args(rom.path);
  const child = spawn(exe, args, { cwd: path.dirname(exe), detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
  return true;
}

module.exports = { scan, art, launch, SYSTEMS: SYSTEMS.map(({ id, name, emu, core }) => ({ id, name, emu, core: core || null })) };
