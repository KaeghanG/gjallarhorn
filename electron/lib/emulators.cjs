// One-click emulator installer. Downloads the latest official Windows x64 build of each emulator
// from its own release page into Gjallarhorn's managed folder:
//   dev / git checkout:  <repo>/emulators/<id>/        (gitignored)
//   packaged app:        %APPDATA%\Gjallarhorn\emulators\<id>\
// Nothing is redistributed by this repo; users download straight from each project.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { app } = require('electron');
const net = require('./net.cjs');

// Install specs live in the main process so the renderer can't make us download arbitrary URLs.
const SPECS = {
  eden: { source: 'forgejo', repo: 'eden-emu/eden', asset: /^Eden-Windows-.*-amd64-clang-pgo\.zip$/i, exe: /^eden\.exe$/i },
  rpcs3: { source: 'github', repo: 'RPCS3/rpcs3-binaries-win', asset: /_win64.*\.7z$/i, exe: /^rpcs3\.exe$/i },
  shadps4: { source: 'github', repo: 'shadps4-emu/shadPS4', asset: /win64.*\.zip$/i, exe: /^shadps4\.exe$/i },
  pcsx2: { source: 'github', repo: 'PCSX2/pcsx2', asset: /windows-x64-Qt\.7z$/i, exe: /^pcsx2-qt\.exe$/i },
  duckstation: { source: 'github', repo: 'stenzek/duckstation', asset: /^duckstation-windows-x64-release\.zip$/i, exe: /^duckstation-qt.*\.exe$/i },
  ppsspp: { source: 'github', repo: 'hrydgard/ppsspp', asset: /Windows-x64\.zip$/i, exe: /^PPSSPPWindows64\.exe$/i },
  cemu: { source: 'github', repo: 'cemu-project/Cemu', asset: /windows-x64\.zip$/i, exe: /^Cemu\.exe$/i },
  xemu: { source: 'github', repo: 'xemu-project/xemu', asset: /^xemu-[\d.]+-windows-x86_64\.zip$/i, exe: /^xemu\.exe$/i },
  'xenia-canary': { source: 'github', repo: 'xenia-canary/xenia-canary-releases', asset: /windows.*\.zip$/i, exe: /^xenia_canary\.exe$/i },
  vita3k: { source: 'github', repo: 'Vita3K/Vita3K', asset: /^windows-latest\.zip$/i, exe: /^Vita3K\.exe$/i },
  melonds: { source: 'github', repo: 'melonDS-emu/melonDS', asset: /windows-x86_64\.zip$/i, exe: /^melonDS\.exe$/i },
  azahar: { source: 'github', repo: 'azahar-emu/azahar', asset: /^azahar-windows-msvc-[\d.]+\.zip$/i, exe: /^azahar\.exe$/i },
  flycast: { source: 'github', repo: 'flyinghead/flycast', asset: /win64.*\.zip$/i, exe: /^flycast\.exe$/i },
  retroarch: { source: 'retroarch', repo: 'libretro/RetroArch', exe: /^retroarch\.exe$/i },
  // dolphin: no GitHub release binaries; the UI links to dolphin-emu.org instead.
};

function managedRoot() {
  return app.isPackaged ? path.join(app.getPath('userData'), 'emulators') : path.join(app.getAppPath(), 'emulators');
}

function findExe(dir, re, depth = 0) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
  const hit = ents.find((e) => e.isFile() && re.test(e.name));
  if (hit) return path.join(dir, hit.name);
  if (depth > 3) return null;
  for (const e of ents) {
    if (e.isDirectory() && e.name !== '_download') {
      const r = findExe(path.join(dir, e.name), re, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

function installed(id) {
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(managedRoot(), id, 'gjallarhorn.json'), 'utf8'));
    if (meta.exe && fs.existsSync(meta.exe)) return meta;
  } catch {}
  return null;
}

async function resolveLatest(id) {
  const spec = SPECS[id];
  if (!spec) throw new Error('This emulator has no automatic installer');
  if (spec.source === 'github' || spec.source === 'retroarch') {
    const r = await net.get(`https://api.github.com/repos/${spec.repo}/releases/latest`);
    if (spec.source === 'retroarch') {
      const ver = r.tag_name.replace(/^v/, '');
      return { version: ver, name: 'RetroArch.7z', notes: (r.body || '').slice(0, 3000), page: r.html_url, url: `https://buildbot.libretro.com/stable/${ver}/windows/x86_64/RetroArch.7z` };
    }
    const a = r.assets.find((x) => spec.asset.test(x.name));
    if (!a) throw new Error(`No Windows build found in ${spec.repo} ${r.tag_name}`);
    return { version: r.tag_name, notes: (r.body || '').slice(0, 3000), page: r.html_url, name: a.name, url: a.browser_download_url, size: a.size };
  }
  if (spec.source === 'forgejo') {
    const list = await net.get(`https://git.eden-emu.dev/api/v1/repos/${spec.repo}/releases?limit=5`);
    for (const r of list) {
      if (r.prerelease || r.draft) continue;
      const a = (r.assets || []).find((x) => spec.asset.test(x.name));
      if (a) return { version: r.tag_name, notes: (r.body || '').slice(0, 3000), page: r.html_url, name: a.name, url: a.browser_download_url, size: a.size };
    }
    throw new Error('No Windows build found for Eden');
  }
  throw new Error('Unknown source');
}

function sevenZip() {
  for (const p of ['C:\\Program Files\\7-Zip\\7z.exe', 'C:\\Program Files (x86)\\7-Zip\\7z.exe']) if (fs.existsSync(p)) return p;
  return null;
}

function extract(archive, dest) {
  const z = sevenZip();
  if (z) execFileSync(z, ['x', '-y', `-o${dest}`, archive], { stdio: 'ignore' });
  else execFileSync('tar', ['-xf', archive, '-C', dest], { stdio: 'ignore' }); // Windows bsdtar reads zip + 7z
}

const busy = new Set();

async function install(id, onProgress = () => {}) {
  if (busy.has(id)) throw new Error('Already installing');
  busy.add(id);
  try {
    const spec = SPECS[id];
    const rel = await resolveLatest(id);
    const dir = path.join(managedRoot(), id);
    const dl = path.join(dir, '_download');
    fs.mkdirSync(dl, { recursive: true });
    const archive = path.join(dl, rel.name);
    onProgress({ id, phase: 'download', p: 0 });
    await net.download(rel.url, archive, (p) => onProgress({ id, phase: 'download', p }));
    onProgress({ id, phase: 'extract', p: 1 });
    extract(archive, dir);
    fs.rmSync(dl, { recursive: true, force: true });
    const exe = findExe(dir, spec.exe);
    if (!exe) throw new Error('Installed, but could not find the emulator executable');
    // Portable mode where supported, so settings stay next to the emulator.
    if (id === 'pcsx2' || id === 'duckstation') fs.writeFileSync(path.join(path.dirname(exe), 'portable.txt'), '');
    const meta = { id, version: rel.version, exe, installedAt: Date.now() };
    fs.writeFileSync(path.join(dir, 'gjallarhorn.json'), JSON.stringify(meta, null, 2));
    onProgress({ id, phase: 'done', p: 1 });
    return meta;
  } finally {
    busy.delete(id);
  }
}

function uninstall(id) {
  const dir = path.join(managedRoot(), id);
  if (!dir.startsWith(managedRoot()) || !fs.existsSync(dir)) return true;
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

// Updates for emulators Gjallarhorn installed itself.
async function checkUpdates() {
  const out = [];
  for (const id of Object.keys(SPECS)) {
    const cur = installed(id);
    if (!cur) continue;
    try {
      const rel = await resolveLatest(id);
      if (rel.version && rel.version !== cur.version) out.push({ id, current: cur.version, latest: rel.version, notes: rel.notes || '', url: rel.page || null });
    } catch {}
  }
  return out;
}

module.exports = { checkUpdates, install, uninstall, installed, resolveLatest, managedRoot, hasInstaller: (id) => !!SPECS[id] };
