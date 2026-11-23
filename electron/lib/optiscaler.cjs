// OptiScaler: download latest release, extract with 7-Zip, install into / remove from a game folder.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { app } = require('electron');
const net = require('./net.cjs');
const tweaks = require('./tweaks.cjs');

const REPO_API = 'https://api.github.com/repos/optiscaler/OptiScaler/releases/latest';
const PROXIES = ['dxgi.dll', 'winmm.dll', 'version.dll', 'dbghelp.dll', 'd3d12.dll', 'wininet.dll', 'winhttp.dll'];
const baseDir = () => path.join(app.getPath('userData'), 'optiscaler');

function sevenZip() {
  for (const p of ['C:\\Program Files\\7-Zip\\7z.exe', 'C:\\Program Files (x86)\\7-Zip\\7z.exe']) if (fs.existsSync(p)) return p;
  return null;
}

// Find the extracted folder that contains OptiScaler.dll
function findPayload(dir) {
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    if (ents.some((e) => e.isFile() && e.name.toLowerCase() === 'optiscaler.dll')) return d;
    for (const e of ents) if (e.isDirectory()) stack.push(path.join(d, e.name));
  }
  return null;
}

function localVersions() {
  try {
    return fs.readdirSync(baseDir()).filter((v) => findPayload(path.join(baseDir(), v))).sort().reverse();
  } catch {
    return [];
  }
}

async function info() {
  let latest = null;
  try {
    const r = await net.get(REPO_API);
    const asset = r.assets.find((a) => /\.(7z|zip)$/i.test(a.name));
    latest = { tag: r.tag_name, name: r.name, published: r.published_at, asset: asset && { name: asset.name, url: asset.browser_download_url, size: asset.size }, notes: (r.body || '').slice(0, 1500) };
  } catch (e) {
    latest = { error: e.message };
  }
  return { latest, local: localVersions(), sevenZip: !!sevenZip(), proxies: PROXIES };
}

async function download(onProgress) {
  const { latest } = await info();
  if (!latest?.asset) throw new Error(latest?.error || 'No release asset found');
  const dir = path.join(baseDir(), latest.tag);
  if (findPayload(dir)) return { tag: latest.tag, already: true };
  fs.mkdirSync(dir, { recursive: true });
  const archive = path.join(baseDir(), latest.asset.name);
  await net.download(latest.asset.url, archive, onProgress);
  const z = sevenZip();
  if (z) execFileSync(z, ['x', '-y', `-o${dir}`, archive], { stdio: 'ignore' });
  else execFileSync('tar', ['-xf', archive, '-C', dir], { stdio: 'ignore' }); // Windows tar handles .7z via libarchive
  fs.unlinkSync(archive);
  if (!findPayload(dir)) throw new Error('Extracted, but OptiScaler.dll was not found in the archive');
  return { tag: latest.tag };
}

function install(game, { version, proxy = 'dxgi.dll', targetDir } = {}) {
  if (!PROXIES.includes(proxy)) throw new Error('Unsupported proxy name');
  const st = tweaks.loadState(game.key);
  if (st.optiscaler) throw new Error('OptiScaler is already installed for this game');
  const ver = version || localVersions()[0];
  if (!ver) throw new Error('Download OptiScaler first');
  const src = findPayload(path.join(baseDir(), ver));
  const dest = targetDir || tweaks.detect(game).exeDir;
  if (!dest || !fs.existsSync(dest)) throw new Error('Could not find the game executable folder');

  const bdir = path.join(tweaks.stateDir(game.key), 'optiscaler-overwritten');
  const files = [];
  const copyTree = (from, to) => {
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
      // Skip docs and the helper .bat installers; we do their job.
      if (e.isFile() && /\.(bat|md|txt|url)$/i.test(e.name) && !/^OptiScaler\.ini$/i.test(e.name)) continue;
      const name = e.isFile() && e.name.toLowerCase() === 'optiscaler.dll' && from === src ? proxy : e.name;
      const s = path.join(from, e.name);
      const d = path.join(to, name);
      if (e.isDirectory()) {
        const existed = fs.existsSync(d);
        fs.mkdirSync(d, { recursive: true });
        copyTree(s, d);
        if (!existed) files.push({ path: d, dir: true });
        continue;
      }
      let backup = null;
      if (fs.existsSync(d)) {
        fs.mkdirSync(bdir, { recursive: true });
        backup = path.join(bdir, path.relative(dest, d).replace(/[\\/]/g, '__'));
        fs.copyFileSync(d, backup);
      }
      fs.copyFileSync(s, d);
      files.push({ path: d, backup });
    }
  };
  copyTree(src, dest);
  st.optiscaler = { version: ver, proxy, dir: dest, files, installedAt: Date.now() };
  tweaks.saveState(game.key, st);
  return st.optiscaler;
}

function uninstall(game) {
  const st = tweaks.loadState(game.key);
  if (!st.optiscaler) return { ok: true };
  const errors = [];
  for (const f of [...st.optiscaler.files].reverse()) {
    try {
      if (f.dir) {
        if (fs.existsSync(f.path) && !fs.readdirSync(f.path).length) fs.rmdirSync(f.path);
      } else if (f.backup && fs.existsSync(f.backup)) {
        fs.copyFileSync(f.backup, f.path);
        fs.unlinkSync(f.backup);
      } else if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    } catch (e) {
      errors.push(`${path.basename(f.path)}: ${e.message}`);
    }
  }
  if (!errors.length) {
    st.optiscaler = null;
    tweaks.saveState(game.key, st);
  }
  return { ok: !errors.length, errors };
}

module.exports = { info, download, install, uninstall };
