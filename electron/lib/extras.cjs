// Round 3 backends: achievements (Steam + RetroAchievements), hardware info, Steam Deck status, XInput controller batteries.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { app } = require('electron');
const net = require('./net.cjs');
const { steamUsers } = require('./owned.cjs');

const STEAM = 'https://api.steampowered.com';

// ---------- Steam achievements ----------
async function achievements(game, { steamKey, steamId }) {
  if (game.source !== 'steam' || !game.appid) return { steam: null, error: 'Achievements are available for Steam games.' };
  if (!steamKey) return { steam: null, error: 'Add your Steam Web API key in Settings → Store accounts to see your achievements.' };
  const id = steamId || steamUsers().find((u) => u.recent)?.id || steamUsers()[0]?.id;
  if (!id) return { steam: null, error: 'Could not find your SteamID.' };
  const k = encodeURIComponent(steamKey);
  const [schema, mine, global] = await Promise.all([
    net.get(`${STEAM}/ISteamUserStats/GetSchemaForGame/v2/?key=${k}&appid=${game.appid}&l=english`).catch(() => null),
    net.get(`${STEAM}/ISteamUserStats/GetPlayerAchievements/v1/?key=${k}&steamid=${id}&appid=${game.appid}&l=english`, { fresh: true }).catch(() => null),
    net.get(`${STEAM}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${game.appid}`).catch(() => null),
  ]);
  const defs = schema?.game?.availableGameStats?.achievements || [];
  if (!defs.length) return { steam: null, error: 'This game has no Steam achievements.' };
  const got = new Map((mine?.playerstats?.achievements || []).map((a) => [a.apiname, a]));
  const pct = new Map((global?.achievementpercentages?.achievements || []).map((a) => [a.name, Number(a.percent)]));
  const items = defs.map((d) => {
    const g = got.get(d.name);
    return {
      id: d.name, name: d.displayName, desc: d.description || '', icon: d.icon, iconGray: d.icongray,
      achieved: !!g?.achieved, unlockTime: g?.unlocktime ? g.unlocktime * 1000 : null,
      globalPct: pct.has(d.name) ? pct.get(d.name) : null, hidden: !!d.hidden,
    };
  });
  return {
    steam: { total: items.length, unlocked: items.filter((i) => i.achieved).length, items },
    error: mine?.playerstats?.success === false ? 'Steam hides your achievements: set Profile → Privacy → Game details to Public.' : null,
  };
}

// ---------- RetroAchievements ----------
// TODO(verify): response field names are from RA's public API docs as remembered; parsed defensively.
async function raSummary({ raUser, raKey }) {
  if (!raUser || !raKey) throw new Error('Add your RetroAchievements username and web API key in Settings');
  const r = await net.get(`https://retroachievements.org/API/API_GetUserSummary.php?u=${encodeURIComponent(raUser)}&y=${encodeURIComponent(raKey)}&g=10&a=0`, { fresh: true });
  const awarded = r.Awarded || {};
  const recent = (r.RecentlyPlayed || []).map((g) => {
    const a = awarded[g.GameID] || {};
    return {
      title: g.Title, console: g.ConsoleName, image: g.ImageIcon ? `https://media.retroachievements.org${g.ImageIcon}` : null,
      achieved: Number(a.NumAchieved ?? a.NumAchievedHardcore ?? 0), total: Number(a.NumPossibleAchievements ?? g.NumPossibleAchievements ?? 0),
      lastPlayed: g.LastPlayed ? Date.parse(g.LastPlayed) : null,
    };
  });
  return { user: r.User || raUser, points: Number(r.TotalPoints ?? 0), recent };
}

// ---------- hardware profile (every optimization is tuned from this, per user) ----------
const run = (cmd, args) => new Promise((r) => execFile(cmd, args, { windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (e, out) => r(e ? '' : out)));
const vendorOf = (n = '') => (/nvidia|geforce|rtx|gtx|quadro/i.test(n) ? 'nvidia' : /amd|radeon|\brx\b/i.test(n) ? 'amd' : /intel|arc|iris|uhd/i.test(n) ? 'intel' : 'other');
const integrated = (n = '') => /intel\(r\) (uhd|iris|hd)|uhd graphics|iris xe|radeon\(tm\) graphics$|radeon graphics$|vega \d+ graphics|780m|680m|880m|890m/i.test(n);

let hwCache = null;
async function hardware({ fresh = false } = {}) {
  if (hwCache && !fresh) return hwCache;
  const cpus = os.cpus();
  const ps = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command',
    '$g=Get-CimInstance Win32_VideoController|Select-Object Name,AdapterRAM,DriverVersion;' +
    '$c=Get-CimInstance Win32_Processor|Select-Object -First 1 Name,NumberOfCores,NumberOfLogicalProcessors;' +
    '$b=@(Get-CimInstance Win32_Battery).Count;' +
    '[pscustomobject]@{gpus=@($g);cpu=$c;battery=$b}|ConvertTo-Json -Depth 4 -Compress']);
  let w = {};
  try { w = JSON.parse(ps); } catch {}
  // Windows' AdapterRAM is a 32-bit field (caps at 4 GB); nvidia-smi gives the real VRAM for NVIDIA cards.
  const smi = (await run('nvidia-smi', ['--query-gpu=name,memory.total,driver_version', '--format=csv,noheader,nounits'])).trim();
  const smiRows = smi ? smi.split(/\r?\n/).map((l) => l.split(',').map((s) => s.trim())) : [];
  const gpus = [].concat(w.gpus || []).filter((g) => g?.Name && !/basic display|remote|virtual|parsec|meta/i.test(g.Name)).map((g) => {
    const s = smiRows.find((r) => r[0] && g.Name.toLowerCase().includes(r[0].toLowerCase().replace('nvidia ', '')));
    return {
      name: g.Name.trim(), vendor: vendorOf(g.Name), integrated: integrated(g.Name),
      vramMB: s ? Number(s[1]) : g.AdapterRAM ? Math.round(g.AdapterRAM / 2 ** 20) : null,
      driver: s ? s[2] : g.DriverVersion || null,
    };
  });
  const dedicated = gpus.filter((g) => !g.integrated);
  const main = dedicated.sort((a, b) => (b.vramMB || 0) - (a.vramMB || 0))[0] || gpus[0] || { name: null, vendor: 'other', vramMB: null };
  const { screen } = require('electron');
  // DIP size × scale can be off by one (1707 × 1.5 = 2560.5): snap to the nearest standard resolution.
  const STD_W = [1280, 1366, 1440, 1600, 1680, 1920, 2048, 2560, 2880, 3000, 3200, 3440, 3840, 5120];
  const STD_H = [720, 768, 800, 900, 1050, 1080, 1200, 1440, 1600, 1800, 2000, 2160, 2400, 2880];
  const snap = (v, list) => list.find((s) => Math.abs(s - v) <= 3) ?? Math.round(v);
  const displays = screen.getAllDisplays().map((d) => ({
    id: d.id, primary: d.id === screen.getPrimaryDisplay().id,
    width: snap(d.size.width * d.scaleFactor, STD_W), height: snap(d.size.height * d.scaleFactor, STD_H),
    refresh: Math.round(d.displayFrequency || 60), scale: d.scaleFactor, internal: !!d.internal,
  }));
  const primary = displays.find((d) => d.primary) || displays[0] || { width: 1920, height: 1080, refresh: 60 };
  hwCache = {
    gpu: { name: main.name, vendor: main.vendor, vramMB: main.vramMB, driver: main.driver || null, rtx: /rtx/i.test(main.name || '') },
    gpus,
    hybrid: gpus.some((g) => g.integrated) && dedicated.length > 0, // e.g. Intel iGPU + NVIDIA (Optimus): games can land on the weak GPU
    cpu: { name: (w.cpu?.Name || cpus[0]?.model || '').trim(), cores: w.cpu?.NumberOfCores || null, threads: w.cpu?.NumberOfLogicalProcessors || cpus.length },
    ramGB: Math.round(os.totalmem() / 2 ** 30),
    laptop: (w.battery || 0) > 0,
    displays,
    primary,
  };
  return hwCache;
}

// Derived, per-user tuning values used by the optimizer, launch options and couch mode.
function tuning(hw) {
  const vram = hw.gpu.vramMB || 4096;
  return {
    // Texture streaming pool ≈ 40% of VRAM, rounded to 512 MB, kept between 1 and 8 GB.
    poolMB: Math.max(1024, Math.min(8192, Math.round((vram * 0.4) / 512) * 512)),
    // FPS cap a few frames under refresh keeps G-Sync/FreeSync engaged and frame times smooth; no cap on 60 Hz panels.
    fpsCap: hw.primary.refresh > 75 ? hw.primary.refresh - Math.max(3, Math.round(hw.primary.refresh * 0.02)) : null,
    upscaler: hw.gpu.vendor === 'nvidia' && hw.gpu.rtx ? 'DLSS' : hw.gpu.vendor === 'intel' ? 'XeSS' : 'FSR',
    width: hw.primary.width, height: hw.primary.height, refresh: hw.primary.refresh,
  };
}

// ---------- Steam Deck compatibility ----------
async function deckStatus(appid) {
  const r = await net.get(`https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport?nAppID=${encodeURIComponent(appid)}`);
  return { 3: 'verified', 2: 'playable', 1: 'unsupported' }[r?.results?.resolved_category] || 'unknown';
}

// ---------- XInput controller batteries ----------
// One line on purpose: PowerShell here-strings break when passed through -Command.
const PS_XINPUT = "Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class GjX { [StructLayout(LayoutKind.Sequential)] public struct BAT { public byte Type; public byte Level; } [DllImport(\"xinput1_4.dll\")] public static extern int XInputGetBatteryInformation(int user, byte devType, ref BAT info); }'; " +
  "$out = @(); for ($i = 0; $i -lt 4; $i++) { $b = New-Object GjX+BAT; $r = [GjX]::XInputGetBatteryInformation($i, 0, [ref]$b); $out += \"$i,$r,$($b.Type),$($b.Level)\" }; $out -join ';'";
function controllers() {
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', PS_XINPUT], { windowsHide: true }, (err, out) => {
      if (err) return resolve([]);
      const types = { 0: 'disconnected', 1: 'wired', 2: 'alkaline', 3: 'nimh', 255: 'unknown' };
      const levels = { 0: 'empty', 1: 'low', 2: 'medium', 3: 'full' };
      resolve(out.trim().split(';').map((row) => {
        const [slot, rc, type, level] = row.split(',').map(Number);
        const connected = rc === 0 && type !== 0;
        return { slot, connected, type: connected ? types[type] || 'unknown' : 'disconnected', level: connected && type !== 1 ? levels[level] ?? null : null };
      }));
    });
  });
}

module.exports = { achievements, raSummary, hardware, tuning, deckStatus, controllers };
