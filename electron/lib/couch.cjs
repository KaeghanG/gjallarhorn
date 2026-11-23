// Couch-mode backends: quick settings (volume / brightness / Do Not Disturb / Wi-Fi), Steam download progress, screenshots,
// display list, and dominant colour of game art (for the dynamic accent).
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { app, screen, desktopCapturer, nativeImage } = require('electron');
const net = require('./net.cjs');
const library = require('./library.cjs');

const run = (cmd, args) => new Promise((r) => execFile(cmd, args, { windowsHide: true, timeout: 15000 }, (e, out) => r(e ? '' : String(out))));
const ps = (script) => run('powershell', ['-NoProfile', '-NonInteractive', '-Command', script]).then((s) => s.trim());

// ---------- Quick settings ----------
// Volume: media keys (the same thing a keyboard's volume buttons send). 5 presses = ±10%.
function volume(action) {
  const key = { up: 175, down: 174, mute: 173 }[action];
  if (!key) return Promise.resolve('');
  const reps = action === 'mute' ? 1 : 5;
  return ps(`$w = New-Object -ComObject WScript.Shell; 1..${reps} | ForEach-Object { $w.SendKeys([char]${key}) }`);
}
// Brightness: the built-in laptop panel via WMI (external monitors can't be set this way).
async function brightnessGet() {
  const n = parseInt(await ps('(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue | Select-Object -First 1).CurrentBrightness'), 10);
  return Number.isFinite(n) ? n : null;
}
async function brightnessSet(v) {
  const b = Math.max(5, Math.min(100, Math.round(v)));
  await ps(`$m = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue | Select-Object -First 1; if ($m) { Invoke-CimMethod -InputObject $m -MethodName WmiSetBrightness -Arguments @{Timeout=1; Brightness=${b}} | Out-Null }`);
  return brightnessGet();
}
// Do Not Disturb: hides notification banners for this user (reversible; nothing is deleted).
const TOAST_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications';
async function dndGet() {
  const out = await run('reg', ['query', TOAST_KEY, '/v', 'ToastEnabled']);
  const m = out.match(/ToastEnabled\s+REG_DWORD\s+0x([0-9a-f]+)/i);
  return m ? parseInt(m[1], 16) === 0 : false; // no value = banners on
}
async function dndSet(on) {
  await run('reg', ['add', TOAST_KEY, '/v', 'ToastEnabled', '/t', 'REG_DWORD', '/d', on ? '0' : '1', '/f']);
  return dndGet();
}
async function wifi() {
  const out = await run('netsh', ['wlan', 'show', 'interfaces']);
  const ssid = out.match(/^\s*SSID\s*:\s*(.+)$/m)?.[1]?.trim();
  const sig = out.match(/Signal\s*:\s*(\d+)%/)?.[1];
  return ssid ? { ssid, signal: sig ? Number(sig) : null } : null;
}
async function quickGet() {
  const [brightness, dnd, w] = await Promise.all([brightnessGet(), dndGet(), wifi()]);
  return { brightness, dnd, wifi: w };
}

// ---------- Steam downloads (read from the library's appmanifest files) ----------
function steamLibraries() {
  const root = library.steamRoot();
  if (!root) return [];
  let libs = [root];
  try {
    const vdf = library.parseVdf(fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8'));
    const l = Object.values(vdf.libraryfolders || {}).map((v) => (typeof v === 'object' ? v.path : null)).filter(Boolean);
    if (l.length) libs = l;
  } catch {}
  return libs;
}
// StateFlags bits: 4 fully installed, 2 update required, 256 update running, 512 paused, 1024 update started, 1048576 downloading, 2097152 staging, 4194304 committing.
function downloads() {
  const out = [];
  for (const lib of steamLibraries()) {
    const sa = path.join(lib, 'steamapps');
    let files = [];
    try { files = fs.readdirSync(sa).filter((f) => /^appmanifest_\d+\.acf$/.test(f)); } catch { continue; }
    for (const f of files) {
      try {
        const st = library.parseVdf(fs.readFileSync(path.join(sa, f), 'utf8')).AppState;
        if (!st) continue;
        const flags = Number(st.StateFlags) || 0;
        const total = Number(st.BytesToDownload) || 0;
        const done = Number(st.BytesDownloaded) || 0;
        const running = (flags & (256 | 1024 | 1048576 | 2097152 | 4194304)) !== 0;
        const paused = (flags & 512) !== 0;
        const pending = (flags & 4) === 0 && (flags & 2) !== 0; // update required / queued
        if (!running && !paused && !pending) continue;
        out.push({
          appid: st.appid, name: st.name, state: paused ? 'Paused' : running ? (flags & 1048576 ? 'Downloading' : 'Updating') : 'Queued',
          downloaded: done, total, percent: total ? Math.min(1, done / total) : null,
          cover: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${st.appid}/library_600x900_2x.jpg`,
        });
      } catch {}
    }
  }
  return out;
}

// ---------- Displays ----------
// DIP size × scale can be off by one (1707 × 1.5 = 2560.5): snap to the nearest standard resolution for display.
const STD_W = [1280, 1366, 1440, 1600, 1680, 1920, 2048, 2560, 2880, 3000, 3200, 3440, 3840, 5120];
const STD_H = [720, 768, 800, 900, 1050, 1080, 1200, 1440, 1600, 1800, 2000, 2160, 2400, 2880];
const snapTo = (v, list) => list.find((s) => Math.abs(s - v) <= 1.5) ?? Math.round(v);
function displays() {
  const all = screen.getAllDisplays();
  return all.map((d, i) => ({
    id: d.id, primary: d.id === screen.getPrimaryDisplay().id, bounds: d.bounds,
    label: `${d.internal ? 'Built-in' : `Display ${i + 1}`} ${snapTo(d.size.width * d.scaleFactor, STD_W)}×${snapTo(d.size.height * d.scaleFactor, STD_H)}`,
  }));
}

// ---------- Screenshot of one display (best effort: exclusive-fullscreen games may come out black) ----------
async function screenshot(displayId) {
  const d = screen.getAllDisplays().find((x) => x.id === displayId) || screen.getPrimaryDisplay();
  const size = { width: Math.round(d.size.width * d.scaleFactor), height: Math.round(d.size.height * d.scaleFactor) };
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: size });
  const src = sources.find((s) => String(s.display_id) === String(d.id)) || sources[0];
  if (!src) throw new Error('Could not capture the screen');
  const dir = path.join(app.getPath('pictures'), 'Gjallarhorn');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `Gjallarhorn ${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`);
  fs.writeFileSync(file, src.thumbnail.toPNG());
  return file;
}

// ---------- Dominant colour of an image (for the couch-mode accent) ----------
const colorCache = new Map();
function hslToHex(h, s, l) {
  const f = (n) => { const k = (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}
async function dominantColor(url) {
  if (colorCache.has(url)) return colorCache.get(url);
  const buf = await net.getBuffer(url);
  const img = nativeImage.createFromBuffer(buf).resize({ width: 32, height: 32, quality: 'good' });
  const bmp = img.toBitmap(); // BGRA
  let R = 0, G = 0, B = 0, W = 0, r0 = 0, g0 = 0, b0 = 0;
  for (let i = 0; i + 3 < bmp.length; i += 4) {
    const b = bmp[i], g = bmp[i + 1], r = bmp[i + 2];
    r0 += r; g0 += g; b0 += b;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const v = max / 255, s = max ? (max - min) / max : 0;
    if (v < 0.18 || v > 0.97) continue;
    const w = s * s * v + 0.0001; // favour vivid, bright pixels over murky ones
    R += r * w; G += g * w; B += b * w; W += w;
  }
  const n = bmp.length / 4 || 1;
  let r = W > 0.05 ? R / W : r0 / n, g = W > 0.05 ? G / W : g0 / n, b = W > 0.05 ? B / W : b0 / n;
  // Convert to HSL, then force a readable accent on a dark background.
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0; const l = (max + min) / 2; const d = max - min;
  if (d) { h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  const hex = hslToHex(h, Math.max(0.55, Math.min(0.9, s)), Math.max(0.52, Math.min(0.68, l + 0.15)));
  colorCache.set(url, hex);
  return hex;
}

module.exports = { volume, brightnessGet, brightnessSet, dndGet, dndSet, wifi, quickGet, downloads, displays, screenshot, dominantColor };
