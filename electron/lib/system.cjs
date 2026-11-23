// Round 7 backends: Steam downloads list, system info (battery/wifi/CPU/GPU/RAM/volume), power actions, achievements via the public profile.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const library = require('./library.cjs');
const installer = require('./installer.cjs');
const net = require('./net.cjs');
const { steamUsers } = require('./owned.cjs');

const ps = (script, ms = 8000) => new Promise((resolve) => {
  execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script], { windowsHide: true, timeout: ms }, (err, out) => resolve(err ? '' : String(out)));
});

// ---------- Downloads: every Steam appmanifest that is not fully installed ----------
const dirSize = (d) => { let t = 0; try { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) t += dirSize(p); else { try { t += fs.statSync(p).size; } catch {} } } } catch {} return t; };
const lastSample = new Map(); // appid -> { t, bytes }
function downloads() {
  const out = [];
  for (const lib of installer.libraries()) {
    const dir = path.join(lib.path, 'steamapps');
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => /^appmanifest_\d+\.acf$/.test(f)); } catch { continue; }
    for (const f of files) {
      let m;
      try { m = library.parseVdf(fs.readFileSync(path.join(dir, f), 'utf8')).AppState; } catch { continue; }
      if (!m) continue;
      const flags = Number(m.StateFlags) || 0;
      const total = Number(m.BytesToDownload) || 0;
      const appid = String(m.appid || m.AppID);
      const done = Math.min(total || Infinity, Number(m.BytesDownloaded) || 0);
      if (flags === 4) continue; // fully installed and idle: nothing to show
      const prev = lastSample.get(appid), now = Date.now();
      let bytesPerSec = null;
      if (prev && now > prev.t && done >= prev.bytes) bytesPerSec = Math.round(((done - prev.bytes) / (now - prev.t)) * 1000);
      if (!prev || done !== prev.bytes || now - prev.t > 20000) lastSample.set(appid, { t: now, bytes: done });
      const stateFlagPaused = (flags & 512) !== 0;
      const active = (flags & (256 | 1024 | 1048576 | 2097152 | 4194304)) !== 0;
      const phase = stateFlagPaused ? 'paused' : bytesPerSec > 0 ? 'downloading' : active && done > 0 ? 'downloading' : active ? 'downloading' : 'queued';
      out.push({ appid, name: m.name || `App ${appid}`, phase, percent: total && done > 0 ? Math.min(1, done / total) : null, downloaded: done, total, bytesPerSec, library: lib.path });
    }
  }
  return out;
}
const openDownloads = () => require('electron').shell.openExternal('steam://nav/downloads');

// ---------- System info ----------
let cpuPrev = null;
function cpuPercent() {
  const c = os.cpus().reduce((a, x) => { const t = Object.values(x.times).reduce((s, v) => s + v, 0); return { idle: a.idle + x.times.idle, total: a.total + t }; }, { idle: 0, total: 0 });
  const r = cpuPrev ? Math.round((1 - (c.idle - cpuPrev.idle) / Math.max(1, c.total - cpuPrev.total)) * 100) : 0;
  cpuPrev = c;
  return Math.max(0, Math.min(100, r));
}
const cache = {}; // slow probes, refreshed at most every N ms
async function cached(key, ms, fn) {
  const c = cache[key];
  if (c && Date.now() - c.t < ms) return c.v;
  const v = await fn().catch(() => null);
  cache[key] = { t: Date.now(), v };
  return v;
}
const battery = () => cached('bat', 15000, async () => {
  const o = (await ps('$b=Get-CimInstance Win32_Battery; if($b){"$($b.EstimatedChargeRemaining),$($b.BatteryStatus)"}')).trim();
  if (!o) return null;
  const [p, s] = o.split(',').map(Number);
  return { percent: p, charging: s === 2 || s === 6 || s === 7 || s === 8 };
});
const wifi = () => cached('wifi', 6000, () => new Promise((resolve) => {
  execFile('netsh', ['wlan', 'show', 'interfaces'], { windowsHide: true, timeout: 4000 }, (err, out) => {
    if (err) return resolve(null);
    const ssid = /^\s*SSID\s*:\s*(.+)$/m.exec(out), sig = /^\s*Signal\s*:\s*(\d+)%/m.exec(out);
    resolve(ssid ? { name: ssid[1].trim(), signal: sig ? Number(sig[1]) : 0 } : null);
  });
}));
const gpu = () => cached('gpu', 3000, () => new Promise((resolve) => {
  execFile('nvidia-smi', ['--query-gpu=utilization.gpu', '--format=csv,noheader,nounits'], { windowsHide: true, timeout: 3000 }, (err, out) => resolve(err ? null : Number(String(out).trim().split('\n')[0]) || 0));
}));

// Core Audio master volume through a tiny inline C# class (no extra packages).
const VOL_CS = `Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IAEV { int f(); int g(); int h(); int SetMasterVolumeLevelScalar(float l, Guid c); int i(); int GetMasterVolumeLevelScalar(out float l); int j(); int k(); int l(); int m(); int SetMute([MarshalAs(UnmanagedType.Bool)] bool b, Guid c); int GetMute(out bool b); }
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMD { int Activate(ref Guid id, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object o); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDE { int n(); int GetDefaultAudioEndpoint(int a, int b, out IMMD d); }
[ComImport, Guid("BCDE0395-E52F-49B1-8E42-1C2B1ABF4D8A")] class MMDEC { }
public static class GjVol {
  static IAEV Ep() { var e = (IMMDE)new MMDEC(); IMMD d; e.GetDefaultAudioEndpoint(0, 1, out d); object o; Guid g = typeof(IAEV).GUID; d.Activate(ref g, 23, IntPtr.Zero, out o); return (IAEV)o; }
  public static string Get() { var v = Ep(); float l; bool m; v.GetMasterVolumeLevelScalar(out l); v.GetMute(out m); return Math.Round(l * 100) + "," + (m ? 1 : 0); }
  public static void Set(int p) { Ep().SetMasterVolumeLevelScalar(Math.Max(0, Math.Min(100, p)) / 100f, Guid.Empty); }
  public static void Mute(bool b) { Ep().SetMute(b, Guid.Empty); }
}
"@
`;
const volume = () => cached('vol', 4000, async () => {
  const o = (await ps(VOL_CS + '[GjVol]::Get()', 10000)).trim();
  const [v, m] = o.split(',').map(Number);
  return Number.isFinite(v) ? { volume: v, muted: m === 1 } : null;
});
async function setVolume(n) { delete cache.vol; await ps(VOL_CS + `[GjVol]::Set(${Math.round(Number(n)) || 0})`, 10000); return volume(); }
async function setMute(b) { delete cache.vol; await ps(VOL_CS + `[GjVol]::Mute($${b ? 'true' : 'false'})`, 10000); return volume(); }

async function sysinfo() {
  const [bat, w, g, v] = await Promise.all([battery(), wifi(), gpu(), volume()]);
  const total = os.totalmem(), used = total - os.freemem();
  return { battery: bat, cpu: cpuPercent(), gpu: g, ramUsedGb: +(used / 1073741824).toFixed(1), ramTotalGb: +(total / 1073741824).toFixed(1), wifi: w, volume: v?.volume ?? null, muted: v?.muted ?? null };
}

// ---------- Power ----------
function power(action) {
  const run = (cmd, args) => new Promise((res, rej) => execFile(cmd, args, { windowsHide: true }, (e) => (e ? rej(e) : res(true))));
  if (action === 'sleep') return run('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']);
  if (action === 'restart') return run('shutdown', ['/r', '/t', '5']);
  if (action === 'shutdown') return run('shutdown', ['/s', '/t', '5']);
  return Promise.reject(new Error('Unknown power action'));
}

// ---------- Achievements without an API key: the public community profile XML (works when Game details are public) ----------
async function achievementsPublic(appid, steamId) {
  const id = steamId || steamUsers().find((u) => u.recent)?.id || steamUsers()[0]?.id;
  if (!id) return { unlocked: 0, total: 0, list: [], error: 'No Steam account found' };
  let xml = '';
  try { xml = await net.get(`https://steamcommunity.com/profiles/${id}/stats/${String(appid).replace(/\D/g, '')}/?xml=1&l=english`, { asText: true, fresh: true }); } catch (e) { return { unlocked: 0, total: 0, list: [], error: e.message }; }
  if (typeof xml !== 'string') return { unlocked: 0, total: 0, list: [], error: 'Unexpected response' };
  const tag = (s, t) => { const m = new RegExp(`<${t}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${t}>`).exec(s); return m ? m[1].trim() : ''; };
  const list = [...xml.matchAll(/<achievement closed="(\d)">([\s\S]*?)<\/achievement>/g)].map((m) => {
    const unlocked = m[1] === '1', b = m[2], ts = Number(tag(b, 'unlockTimestamp'));
    return { id: tag(b, 'apiname') || tag(b, 'name'), name: tag(b, 'name'), desc: tag(b, 'description'), icon: tag(b, unlocked ? 'iconClosed' : 'iconOpen') || null, unlocked, unlockTime: ts ? ts * 1000 : null, percent: null };
  });
  return { unlocked: list.filter((a) => a.unlocked).length, total: list.length, list, error: list.length ? null : 'No achievements available' };
}

module.exports = { downloads, openDownloads, sysinfo, setVolume, setMute, power, achievementsPublic };
