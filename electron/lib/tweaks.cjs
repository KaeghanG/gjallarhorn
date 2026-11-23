// Game optimizer: engine detection, tweak catalog, apply/revert with backups.
//
// Safety model: before any key is changed, its original value (or "absent") is recorded in
// %APPDATA%\Gjallarhorn\backups\<gameKey>\state.json, and the first time a file is touched a full
// copy is saved next to it. Applying a new selection first reverts everything we changed, then
// applies the chosen tweaks, so toggling tweaks off really removes them.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { app } = require('electron');

// ---------- detection ----------
function safeReaddir(d) {
  try {
    return fs.readdirSync(d, { withFileTypes: true });
  } catch {
    return [];
  }
}

function exesIn(dir) {
  return safeReaddir(dir)
    .filter((e) => e.isFile() && /\.exe$/i.test(e.name) && !/(unins|crash|report|setup|redist|helper|launcher|easyanticheat|be_service|vc_redist|dxsetup)/i.test(e.name))
    .map((e) => {
      const p = path.join(dir, e.name);
      let size = 0;
      try {
        size = fs.statSync(p).size;
      } catch {}
      return { path: p, size };
    })
    .sort((a, b) => b.size - a.size);
}

function detect(game) {
  const dir = game.dir;
  const info = { engine: 'unknown', exe: game.exe || null, exeDir: null, project: null, ueConfigDirs: [], unityData: null };
  if (!dir || !fs.existsSync(dir)) return { ...info, missing: true };

  const top = safeReaddir(dir);
  // Unreal: <dir>/<Project>/Binaries/Win64/*.exe (and usually an Engine folder)
  for (const e of top) {
    if (!e.isDirectory() || e.name === 'Engine') continue;
    const bin = path.join(dir, e.name, 'Binaries', 'Win64');
    const ex = exesIn(bin);
    if (ex.length) {
      info.engine = 'unreal';
      info.project = e.name;
      info.exe = ex[0].path;
      info.exeDir = bin;
      break;
    }
  }
  if (info.engine === 'unreal') {
    const la = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const docs = path.join(os.homedir(), 'Documents', 'My Games');
    const cands = [];
    for (const base of [path.join(la, info.project), path.join(docs, info.project)]) {
      for (const sub of ['Windows', 'WindowsNoEditor', 'WinGDK']) cands.push(path.join(base, 'Saved', 'Config', sub));
    }
    info.ueConfigDirs = cands.filter((c) => fs.existsSync(c));
    if (!info.ueConfigDirs.length) {
      // Game never launched (or stores config elsewhere): write both UE5 and UE4 locations.
      info.ueConfigDirs = [path.join(la, info.project, 'Saved', 'Config', 'Windows'), path.join(la, info.project, 'Saved', 'Config', 'WindowsNoEditor')];
      info.ueConfigGuessed = true;
    }
    return info;
  }

  // Unity: UnityPlayer.dll next to the exe and a <Name>_Data folder
  const unityDll = top.find((e) => e.isFile() && e.name.toLowerCase() === 'unityplayer.dll');
  const dataDir = top.find((e) => e.isDirectory() && e.name.endsWith('_Data'));
  if (unityDll || (dataDir && fs.existsSync(path.join(dir, dataDir.name, 'globalgamemanagers')))) {
    info.engine = 'unity';
    if (dataDir) {
      info.unityData = path.join(dir, dataDir.name);
      const guess = path.join(dir, dataDir.name.replace(/_Data$/, '') + '.exe');
      if (fs.existsSync(guess)) info.exe = guess;
    }
    if (!info.exe) info.exe = exesIn(dir)[0]?.path || null;
    info.exeDir = dir;
    return info;
  }

  // Unknown engine: biggest exe in the top two levels.
  if (!info.exe) {
    let best = exesIn(dir);
    for (const e of top) if (e.isDirectory()) best = best.concat(exesIn(path.join(dir, e.name)));
    best.sort((a, b) => b.size - a.size);
    info.exe = best[0]?.path || null;
  }
  info.exeDir = info.exe ? path.dirname(info.exe) : dir;
  return info;
}

// ---------- tweak catalog ----------
const GPU_KEY = 'HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences';
const LAYERS_KEY = 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers';

const ue = (pairs, section = 'SystemSettings') => (ctx) =>
  ctx.ueConfigDirs.flatMap((d) => pairs.map(([key, value]) => ({ type: 'ini', file: path.join(d, 'Engine.ini'), section, key, value })));

const CATALOG = [
  {
    // Only meaningful on PCs with two GPUs (laptop iGPU + dedicated); recommended only there.
    id: 'win-gpu', engine: 'any', impact: 'fps', recommendedIf: (hw) => hw?.hybrid,
    title: (hw) => `Force the ${hw?.gpu?.name ? hw.gpu.name.replace(/^(NVIDIA|AMD|Intel\(R\))\s*/i, '').replace(/ Laptop GPU| GPU/i, '') : 'dedicated GPU'}`,
    desc: (hw) => hw?.hybrid
      ? 'Your PC has two GPUs. This tells Windows to always run the game on the fast one instead of the integrated chip.'
      : 'Tells Windows to use the high-performance GPU. Your PC has one GPU, so this changes little.',
    ops: (ctx) => (ctx.exe ? [{ type: 'reg', key: GPU_KEY, name: ctx.exe, value: 'GpuPreference=2;' }] : []),
  },
  {
    id: 'win-fso', engine: 'any', impact: 'latency',
    title: 'Disable fullscreen optimizations',
    desc: 'Sets the compatibility flag that turns off Windows fullscreen optimizations. Can fix stutter and alt-tab weirdness in older DX9/DX11 games.',
    ops: (ctx) => (ctx.exe ? [{ type: 'reg', key: LAYERS_KEY, name: ctx.exe, value: '~ DISABLEDXMAXIMIZEDWINDOWEDMODE' }] : []),
  },
  {
    id: 'ue-stutter', engine: 'unreal', impact: 'stutter', recommended: true,
    title: 'Shader & streaming stutter fix',
    desc: (hw, t) => `Enables the PSO disk cache, async loading thread and a texture pool sized for your ${hw?.gpu?.vramMB ? Math.round(hw.gpu.vramMB / 1024) + ' GB' : ''} GPU (${t ? t.poolMB : 3072} MB). The classic Unreal traversal-stutter fix.`,
    ops: (ctx) => [
      ...ue([
        ['r.Streaming.PoolSize', String(ctx.tune?.poolMB || 3072)],
        ['r.Streaming.LimitPoolSizeToVRAM', '1'],
        ['r.CreateShadersOnLoad', '1'],
        ['D3D12.PSO.DiskCache', '1'],
        ['D3D12.PSO.DriverOptimizedDiskCache', '1'],
        ['r.ShaderPipelineCache.Enabled', '1'],
      ])(ctx),
      ...ue([['s.AsyncLoadingThreadEnabled', 'True']], '/Script/Engine.StreamingSettings')(ctx),
    ],
  },
  {
    // Cap a few frames under the user's refresh rate (keeps G-Sync/FreeSync engaged, smoother frame times, cooler laptop).
    id: 'ue-fpscap', engine: 'unreal', impact: 'latency', recommendedIf: (hw, t) => !!t?.fpsCap, availableIf: (hw, t) => !!t?.fpsCap,
    title: (hw, t) => `Cap FPS at ${t?.fpsCap} for your ${t?.refresh} Hz screen`,
    desc: 'Keeps the frame rate just under your monitor refresh so variable refresh (G-Sync/FreeSync) stays active: smoother, less heat, no tearing.',
    ops: (ctx) => (ctx.tune?.fpsCap ? ue([['t.MaxFPS', String(ctx.tune.fpsCap)]])(ctx) : []),
  },
  {
    id: 'ue-motionblur', engine: 'unreal', impact: 'visual', recommended: true,
    title: 'Kill motion blur',
    desc: 'Removes camera and per-object motion blur for a sharper image in motion.',
    ops: ue([['r.MotionBlurQuality', '0'], ['r.DefaultFeature.MotionBlur', '0']]),
  },
  {
    id: 'ue-ca', engine: 'unreal', impact: 'visual',
    title: 'Remove chromatic aberration',
    desc: 'Gets rid of the colour fringing at screen edges.',
    ops: ue([['r.SceneColorFringeQuality', '0']]),
  },
  {
    id: 'ue-grain', engine: 'unreal', impact: 'visual',
    title: 'Remove film grain',
    desc: 'Disables film grain noise.',
    ops: ue([['r.Tonemapper.GrainQuantization', '0'], ['r.FilmGrain', '0']]),
  },
  {
    id: 'ue-dof', engine: 'unreal', impact: 'fps',
    title: 'Disable depth of field',
    desc: 'Turns off depth-of-field blur. Sharper backgrounds and a small FPS gain.',
    ops: ue([['r.DepthOfFieldQuality', '0']]),
  },
  {
    id: 'ue-sharpen', engine: 'unreal', impact: 'visual',
    title: 'Light sharpening',
    desc: 'Adds mild tonemapper sharpening to counter soft TAA/upscaling.',
    ops: ue([['r.Tonemapper.Sharpen', '0.5']]),
  },
  {
    id: 'unity-gfxjobs', engine: 'unity', impact: 'fps', experimental: true,
    title: 'Native graphics jobs',
    desc: 'Lets Unity spread rendering work across CPU cores via boot.config. Can boost CPU-bound games; a few crash, so it is marked experimental.',
    ops: (ctx) =>
      ctx.unityData
        ? [
            { type: 'kv', file: path.join(ctx.unityData, 'boot.config'), key: 'gfx-enable-gfx-jobs', value: '1' },
            { type: 'kv', file: path.join(ctx.unityData, 'boot.config'), key: 'gfx-enable-native-gfx-jobs', value: '1' },
          ]
        : [],
  },
];

// Titles, descriptions and recommendations are resolved against this user's hardware.
function catalogFor(info, hw, tune) {
  const val = (v) => (typeof v === 'function' ? v(hw, tune) : v);
  return CATALOG
    .filter((t) => (t.engine === 'any' || t.engine === info.engine) && (!t.availableIf || t.availableIf(hw, tune)))
    .map(({ ops, recommendedIf, availableIf, ...rest }) => ({
      ...rest, title: val(rest.title), desc: val(rest.desc),
      recommended: recommendedIf ? !!recommendedIf(hw, tune) : !!rest.recommended,
    }));
}

// ---------- file helpers ----------
function readText(file) {
  const buf = fs.readFileSync(file);
  if (buf[0] === 0xff && buf[1] === 0xfe) return { text: buf.slice(2).toString('utf16le'), enc: 'utf16le' };
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return { text: buf.slice(3).toString('utf8'), enc: 'utf8bom' };
  return { text: buf.toString('utf8'), enc: 'utf8' };
}
function writeText(file, text, enc) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (enc === 'utf16le') fs.writeFileSync(file, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]));
  else if (enc === 'utf8bom') fs.writeFileSync(file, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]));
  else fs.writeFileSync(file, text);
}

// INI: get/set a key in a [section]. value === null deletes the key.
function iniGet(text, section, key) {
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const s = line.match(/^\s*\[(.+)\]\s*$/);
    if (s) { cur = s[1]; continue; }
    if (cur !== section) continue;
    const kv = line.match(/^\s*([^=;#]+?)\s*=(.*)$/);
    if (kv && kv[1].toLowerCase() === key.toLowerCase()) return kv[2].trim();
  }
  return null;
}
function iniSet(text, section, key, value) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.length ? text.split(/\r?\n/) : [];
  let cur = null, secEnd = -1, found = -1;
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].match(/^\s*\[(.+)\]\s*$/);
    if (s) { cur = s[1]; if (cur === section) secEnd = i; continue; }
    if (cur === section) {
      if (lines[i].trim()) secEnd = i;
      const kv = lines[i].match(/^\s*([^=;#]+?)\s*=/);
      if (kv && kv[1].toLowerCase() === key.toLowerCase()) found = i;
    }
  }
  if (found >= 0) {
    if (value === null) lines.splice(found, 1);
    else lines[found] = `${key}=${value}`;
  } else if (value !== null) {
    if (secEnd >= 0) lines.splice(secEnd + 1, 0, `${key}=${value}`);
    else {
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      if (lines.length) lines.push('');
      lines.push(`[${section}]`, `${key}=${value}`);
    }
  }
  let out = lines.join(nl);
  if (!out.endsWith(nl)) out += nl;
  return out;
}
function iniHasSection(text, section) {
  return text.split(/\r?\n/).some((l) => l.trim() === `[${section}]`);
}
// Removes a [section] header (and the blank line before it) if the section has no keys left.
function iniDropEmptySection(text, section) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const i = lines.findIndex((l) => l.trim() === `[${section}]`);
  if (i < 0) return text;
  let j = i + 1;
  while (j < lines.length && !/^\s*\[/.test(lines[j])) {
    if (lines[j].trim()) return text; // still has content
    j++;
  }
  let start = i;
  while (start > 0 && !lines[start - 1].trim()) start--;
  lines.splice(start, j - start);
  let out = lines.join(nl).replace(new RegExp(`(${nl})+$`), '');
  return out ? out + nl : '';
}

// boot.config style: key=value lines, no sections.
function kvGet(text, key) {
  const m = text.split(/\r?\n/).find((l) => l.split('=')[0].trim() === key);
  return m ? m.slice(m.indexOf('=') + 1).trim() : null;
}
function kvSet(text, key, value) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  let lines = text.split(/\r?\n/).filter((l, i, a) => !(i === a.length - 1 && l === ''));
  const idx = lines.findIndex((l) => l.split('=')[0].trim() === key);
  if (idx >= 0) {
    if (value === null) lines.splice(idx, 1);
    else lines[idx] = `${key}=${value}`;
  } else if (value !== null) lines.push(`${key}=${value}`);
  return lines.join(nl) + nl;
}

// Registry via reg.exe
function regGet(key, name) {
  try {
    const out = execFileSync('reg', ['query', key, '/v', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const line = out.split(/\r?\n/).find((l) => l.includes('REG_SZ'));
    return line ? line.slice(line.indexOf('REG_SZ') + 6).trim() : null;
  } catch {
    return null;
  }
}
function regSet(key, name, value) {
  if (value === null) {
    try { execFileSync('reg', ['delete', key, '/v', name, '/f'], { stdio: 'ignore' }); } catch {}
  } else execFileSync('reg', ['add', key, '/v', name, '/t', 'REG_SZ', '/d', value, '/f'], { stdio: 'ignore' });
}

// ---------- state ----------
const stateDir = (gameKey) => path.join(app.getPath('userData'), 'backups', gameKey.replace(/[^\w.-]/g, '_'));
function loadState(gameKey) {
  try {
    return JSON.parse(fs.readFileSync(path.join(stateDir(gameKey), 'state.json'), 'utf8'));
  } catch {
    return { applied: [], originals: [], optiscaler: null };
  }
}
function saveState(gameKey, st) {
  fs.mkdirSync(stateDir(gameKey), { recursive: true });
  fs.writeFileSync(path.join(stateDir(gameKey), 'state.json'), JSON.stringify(st, null, 2));
}

function opId(op) {
  return op.type === 'reg' ? `reg|${op.key}|${op.name}` : `${op.type}|${op.file}|${op.section || ''}|${op.key}`;
}

function readOp(op) {
  if (op.type === 'reg') return regGet(op.key, op.name);
  if (!fs.existsSync(op.file)) return null;
  const { text } = readText(op.file);
  return op.type === 'ini' ? iniGet(text, op.section, op.key) : kvGet(text, op.key);
}
function writeOp(op, value) {
  if (op.type === 'reg') return regSet(op.key, op.name, value);
  const exists = fs.existsSync(op.file);
  const { text, enc } = exists ? readText(op.file) : { text: '', enc: 'utf8' };
  const next = op.type === 'ini' ? iniSet(text, op.section, op.key, value) : kvSet(text, op.key, value);
  writeText(op.file, next, enc);
}

function backupFileOnce(gameKey, file) {
  if (!fs.existsSync(file)) return;
  const dir = path.join(stateDir(gameKey), 'files');
  const name = Buffer.from(file).toString('base64url').slice(-120) + '.bak';
  const dest = path.join(dir, name);
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(file, dest);
}

function revertAll(gameKey) {
  const st = loadState(gameKey);
  const errors = [];
  for (const o of [...st.originals].reverse()) {
    try {
      writeOp(o.op, o.original);
      if (o.op.type === 'ini' && o.sectionExisted === false && fs.existsSync(o.op.file)) {
        const { text, enc } = readText(o.op.file);
        writeText(o.op.file, iniDropEmptySection(text, o.op.section), enc);
      }
    } catch (e) {
      errors.push(`${o.op.key}: ${e.message}`);
    }
  }
  // Remove ini files we created that are now empty.
  for (const o of st.originals) {
    if (o.op.file && o.fileCreated && fs.existsSync(o.op.file)) {
      try {
        if (!readText(o.op.file).text.replace(/\[[^\]]+\]|\s/g, '')) fs.unlinkSync(o.op.file);
      } catch {}
    }
  }
  st.originals = [];
  st.applied = [];
  saveState(gameKey, st);
  return { ok: errors.length === 0, errors };
}

function apply(game, ids, hw = null, tune = null) {
  const info = { ...detect(game), hw, tune };
  revertAll(game.key);
  const st = loadState(game.key);
  const errors = [];
  const changed = [];
  for (const id of ids) {
    const t = CATALOG.find((c) => c.id === id);
    if (!t) continue;
    for (const op of t.ops(info)) {
      try {
        if (!st.originals.find((o) => opId(o.op) === opId(op))) {
          const fileCreated = op.file ? !fs.existsSync(op.file) : false;
          if (op.file) backupFileOnce(game.key, op.file);
          const sectionExisted = op.type === 'ini' && !fileCreated ? iniHasSection(readText(op.file).text, op.section) : op.type === 'ini' ? false : undefined;
          st.originals.push({ op, original: readOp(op), fileCreated, sectionExisted });
        }
        writeOp(op, op.value);
        changed.push(op.type === 'reg' ? `Registry: ${op.key.split('\\').pop()}` : op.file);
      } catch (e) {
        errors.push(`${typeof t.title === "function" ? t.id : t.title}: ${e.message}`);
      }
    }
  }
  st.applied = ids;
  saveState(game.key, st);
  return { ok: errors.length === 0, errors, changed: [...new Set(changed)] };
}

function status(game, hw = null, tune = null) {
  const info = detect(game);
  const st = loadState(game.key);
  return { info, tweaks: catalogFor(info, hw, tune), hw, tune, applied: st.applied, optiscaler: st.optiscaler, backupDir: stateDir(game.key) };
}

module.exports = { detect, status, apply, revertAll, loadState, saveState, stateDir, iniSet, iniGet };
