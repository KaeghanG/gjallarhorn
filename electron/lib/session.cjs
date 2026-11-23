// Game sessions: after a launch, wait for the game's process, apply Game Boost, track playtime,
// and when it exits undo the boost and (optionally) back up saves.
const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');
const { app } = require('electron');

const ptFile = () => path.join(app.getPath('userData'), 'playtime.json');
const loadPt = () => { try { return JSON.parse(fs.readFileSync(ptFile(), 'utf8')); } catch { return {}; } };
const savePt = (d) => fs.writeFileSync(ptFile(), JSON.stringify(d, null, 1));

function processes() {
  return new Promise((resolve) => {
    execFile('tasklist', ['/fo', 'csv', '/nh'], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (err, out) => {
      if (err) return resolve([]);
      resolve(out.split(/\r?\n/).map((l) => l.match(/^"([^"]+)","(\d+)"/)).filter(Boolean).map((m) => ({ name: m[1].toLowerCase(), pid: Number(m[2]) })));
    });
  });
}

const ps = (cmd) => new Promise((r) => execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true }, () => r()));

function wallpaperExe(libraryDirs) {
  const cands = [...libraryDirs.map((d) => path.join(d, 'wallpaper64.exe')), 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\wallpaper_engine\\wallpaper64.exe'];
  return cands.find((p) => fs.existsSync(p)) || null;
}

// ---- Debug log (so a launch/placement that misbehaves can be diagnosed): <userData>/launch-debug.log ----
function dbg(msg) {
  try {
    const f = path.join(app.getPath('userData'), 'launch-debug.log');
    let old = '';
    try { old = fs.readFileSync(f, 'utf8'); } catch {}
    if (old.length > 150000) old = old.slice(-80000);
    fs.writeFileSync(f, old + `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

// ---- Which processes belong to a game? By install FOLDER, not only by a guessed exe name (launchers, anti-cheat stubs, wrong guesses). ----
const HELPER = /(crash|report|helper|unins|easyanticheat|redist|dxsetup|webhelper|updater)/i;
function dirProcesses(dir) {
  return new Promise((resolve) => {
    if (!dir) return resolve([]);
    const d = dir.replace(/[\\/]+$/, '') + '\\';
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command',
      '$d = $env:GJ_DIR; Get-Process | Where-Object { $_.Path -and $_.Path.StartsWith($d, [StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { $_.Id.ToString() + "," + $_.ProcessName }'],
    { windowsHide: true, env: { ...process.env, GJ_DIR: d }, timeout: 20000 }, (err, out) => {
      if (err) return resolve([]);
      resolve(String(out).split(/\r?\n/).map((l) => l.trim().split(',')).filter((p) => p.length === 2 && p[0]).map((p) => ({ pid: Number(p[0]), name: p[1].toLowerCase() + '.exe' })));
    });
  });
}

// ---- Open the game on the monitor the user launched it from ----
// A PowerShell script (a file: here-strings don't survive -Command) finds every visible window of the game's processes (matched by install
// folder, or by exe name for emulators) and moves any that are on another monitor to the target monitor. Windows that fill their monitor
// (fullscreen / borderless) are resized to the target monitor; normal windows keep their size and are centered on it. It keeps watching until
// the window has stayed on the target for 75 s (Elden Ring, for one, jumps back to the main monitor ~45 s in, when its menu finishes loading)
// or the timeout passes; it gives up after 8 moves so it never fights a game. Splash windows
// (< 640x360) and minimized windows are ignored. Best effort: exclusive-fullscreen games that ignore window moves stay where they are.
// target = { x, y, w, h } in physical pixels (from Electron's screen.dipToScreenRect).
// NOTE: PowerShell variable names are case-insensitive: parameters are TX/TY/TW/TH so they can't collide with other variables.
const PLACE_PS1 = `param([string]$Name,[string]$Dir,[int]$TX,[int]$TY,[int]$TW,[int]$TH,[int]$Timeout=240)
Add-Type -TypeDefinition @"
using System; using System.Collections.Generic; using System.Runtime.InteropServices;
public static class GjW {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr v);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr h, uint f);
  [DllImport("user32.dll")] public static extern bool GetMonitorInfo(IntPtr m, ref MI mi);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct MI { public int size; public RECT mon; public RECT work; public uint flags; }
  public static List<IntPtr> WindowsOf(uint pid) {
    var list = new List<IntPtr>();
    EnumWindows(delegate (IntPtr h, IntPtr l) { uint p; GetWindowThreadProcessId(h, out p); if (p == pid && IsWindowVisible(h)) list.Add(h); return true; }, IntPtr.Zero);
    return list;
  }
}
"@
[GjW]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null
try { [System.Diagnostics.Process]::GetCurrentProcess().PriorityClass = 'BelowNormal' } catch {}   # never compete with the game for CPU
$deadline = (Get-Date).AddSeconds($Timeout)
$okSince = $null
$settled = $false
$moves = 0
while ((Get-Date) -lt $deadline) {
  # By exe name (works for anti-cheat-protected games, whose path Windows hides) AND by install folder (catches renamed/launched helpers).
  $procs = @()
  if ($Name -and $Name -ne 'none') { $procs += @(Get-Process -Name $Name -ErrorAction SilentlyContinue) }
  if ($Dir) { $procs += @(Get-Process | Where-Object { $_.Path -and $_.Path.StartsWith($Dir, [StringComparison]::OrdinalIgnoreCase) }) }
  $procs = @($procs | Sort-Object Id -Unique)
  $moved = $false; $seenOk = $false
  foreach ($pr in $procs) {
    foreach ($hwnd in [GjW]::WindowsOf([uint32]$pr.Id)) {
      $r = New-Object GjW+RECT
      [GjW]::GetWindowRect($hwnd, [ref]$r) | Out-Null
      $winW = $r.R - $r.L; $winH = $r.B - $r.T
      if ($winW -lt 640 -or $winH -lt 360 -or $r.L -le -30000) { continue }
      $cx = $r.L + [int]($winW / 2); $cy = $r.T + [int]($winH / 2)
      if ($cx -ge $TX -and $cx -lt ($TX + $TW) -and $cy -ge $TY -and $cy -lt ($TY + $TH)) { $seenOk = $true; continue }
      $mon = [GjW]::MonitorFromWindow($hwnd, 2)
      $mi = New-Object GjW+MI
      $mi.size = [Runtime.InteropServices.Marshal]::SizeOf($mi)
      [GjW]::GetMonitorInfo($mon, [ref]$mi) | Out-Null
      $monW = $mi.mon.R - $mi.mon.L; $monH = $mi.mon.B - $mi.mon.T
      if (($winW -ge $monW - 8) -and ($winH -ge $monH - 8)) { $nx = $TX; $ny = $TY; $nw = $TW; $nh = $TH }
      else { $nw = [Math]::Min($winW, $TW); $nh = [Math]::Min($winH, $TH); $nx = $TX + [int](($TW - $nw) / 2); $ny = $TY + [int](($TH - $nh) / 2) }
      $okMove = [GjW]::SetWindowPos($hwnd, [IntPtr]::Zero, $nx, $ny, $nw, $nh, 0x0204)
      $moved = $true; $moves++
      Write-Output ("MOVED " + $pr.ProcessName + " from " + $r.L + "," + $r.T + " " + $winW + "x" + $winH + " to " + $nx + "," + $ny + " " + $nw + "x" + $nh + " ok=" + $okMove)
    }
  }
  if ($moved) { $okSince = $null }
  elseif ($seenOk) {
    if ($null -eq $okSince) { $okSince = Get-Date }
    elseif (((Get-Date) - $okSince).TotalSeconds -gt 75) { $settled = $true; Write-Output 'SETTLED on target'; break }
  }
  if ($moves -gt 8) { Write-Output 'GAVE UP: the game keeps moving itself back'; break }
  Start-Sleep -Milliseconds 800
}
if (-not $settled) { Write-Output ('ENDED without settling; processes seen at the end: ' + $procs.Count) }
`;
function placeWindow(exeName, target, timeoutSec = 120, dir = null) {
  if (!target || (!exeName && !dir)) return Promise.resolve('');
  return new Promise((resolve) => {
    const file = path.join(app.getPath('userData'), 'place-window.ps1');
    try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, PLACE_PS1); } catch { return resolve(''); }
    const name = (exeName || '').replace(/\.exe$/i, '');
    const d = dir ? dir.replace(/[\\/]+$/, '') + '\\' : '';
    const child = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file,
      '-Name', name || 'none', '-Dir', d, '-TX', String(Math.round(target.x)), '-TY', String(Math.round(target.y)), '-TW', String(Math.round(target.w)), '-TH', String(Math.round(target.h)), '-Timeout', String(timeoutSec)],
    { windowsHide: true });
    let out = '';
    child.stdout.on('data', (x) => (out += x));
    child.stderr.on('data', (x) => (out += 'ERR ' + x));
    child.on('error', () => resolve(''));
    child.on('exit', () => resolve(out.trim()));
  });
}

// ---- GPU sampling for session reports (nvidia-smi; silently does nothing on non-NVIDIA PCs) ----
function startSampler() {
  const samples = [];
  let child = null;
  try {
    child = spawn('nvidia-smi', ['--query-gpu=temperature.gpu,utilization.gpu,power.draw,memory.used,clocks.gr', '--format=csv,noheader,nounits', '-l', '5'], { windowsHide: true });
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const l of lines) {
        const [temp, util, power, vram, clock] = l.split(',').map((x) => Number(x.trim()));
        if (isFinite(temp)) samples.push({ t: Date.now(), temp, util, power: isFinite(power) ? power : null, vram, clock });
        if (samples.length > 20000) samples.shift();
      }
    });
    child.on('error', () => {});
  } catch {}
  return { stop: () => { try { child?.kill(); } catch {} return samples; } };
}

const repFile = () => path.join(app.getPath('userData'), 'session-reports.json');
const loadReports = () => { try { return JSON.parse(fs.readFileSync(repFile(), 'utf8')); } catch { return []; } };
function saveReport(game, start, samples) {
  const avg = (k) => (samples.length ? Math.round((samples.reduce((a, s) => a + (s[k] || 0), 0) / samples.length) * 10) / 10 : null);
  const max = (k) => (samples.length ? Math.max(...samples.map((s) => s[k] || 0)) : null);
  // Thin long sessions to ~600 points so the file stays small.
  const step = Math.max(1, Math.ceil(samples.length / 600));
  const r = {
    id: `${start}-${game.key}`, key: game.key, name: game.name, start, end: Date.now(), minutes: Math.round((Date.now() - start) / 60000),
    samples: samples.filter((_, i) => i % step === 0),
    summary: { avgTemp: avg('temp'), maxTemp: max('temp'), avgUtil: avg('util'), avgPower: avg('power'), maxVram: max('vram') },
  };
  const all = [r, ...loadReports()].slice(0, 50);
  fs.writeFileSync(repFile(), JSON.stringify(all));
  return r.id;
}

let current = null;

function start(game, exe, opts, hooks) {
  // opts: { boostPriority, pauseWallpaper, autoBackup, wallpaperDir }
  if (current) current.cancel = true;
  // The game's install folder is the reliable way to recognise its processes; the exe guess alone often misses (launchers, EAC stubs).
  const dir = game.dir || (exe ? path.dirname(exe) : null);
  if (!exe && !dir) return null;
  const name = exe ? path.basename(exe).toLowerCase() : null;
  const s = { game, exe, name, names: new Set(), startedAt: null, pid: null, cancel: false, actions: [] };
  current = s;
  hooks.emit({ state: 'waiting', key: game.key, name: game.name });
  dbg(`launch "${game.name}": exe=${exe} dir=${dir} target=${JSON.stringify(opts.target || null)}`);

  const loop = async () => {
    const t0 = Date.now();
    const deadline = t0 + 4 * 60 * 1000; // games behind launchers can take a while
    while (!s.cancel && Date.now() < deadline) {
      let found = null;
      if (name) { const p = (await processes()).find((x) => x.name === name); if (p) found = { pid: p.pid, names: [name] }; }
      // Folder matching is a fallback: anti-cheat launcher stubs (start_protected_game.exe) show up in the folder first, but the real game
      // is the exe we expect, so give that 30 s to appear before settling for whatever else is running from the folder.
      if (!found && dir && (!name || Date.now() - t0 > 30000)) {
        const list = (await dirProcesses(dir)).filter((x) => !HELPER.test(x.name));
        if (list.length) found = { pid: list[0].pid, names: [...new Set(list.map((x) => x.name))] };
      }
      // Always watch for the expected exe too: protected games hide their path, so the folder check can never see them.
      if (found) { s.pid = found.pid; s.names = new Set(found.names); if (name) s.names.add(name); break; }
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (s.cancel || !s.pid) { dbg(`"${game.name}": process not found (cancel=${s.cancel})`); hooks.emit({ state: 'gave-up', key: game.key, name: game.name }); if (current === s) current = null; return; }
    s.startedAt = Date.now();
    dbg(`"${game.name}": running as ${[...s.names].join(', ')} (pid ${s.pid})`);
    if (opts.target) placeWindow(name || '', opts.target, 240, dir).then((out) => dbg(`placement "${game.name}": ${out.split(/\r?\n/).slice(-6).join(' | ') || '(no output)'}`));

    // ---- Boost ----
    if (opts.boostPriority) {
      await ps(`try { (Get-Process -Id ${s.pid}).PriorityClass = 'High' } catch {}`);
      s.actions.push('High CPU priority');
    }
    const we = opts.pauseWallpaper ? wallpaperExe([opts.wallpaperDir].filter(Boolean)) : null;
    if (we && (await processes()).some((x) => x.name === 'wallpaper64.exe' || x.name === 'wallpaper32.exe')) {
      execFile(we, ['-control', 'pause'], { windowsHide: true }, () => {});
      s.weExe = we;
      s.actions.push('Wallpaper Engine paused');
    }
    hooks.emit({ state: 'running', key: game.key, name: game.name, actions: s.actions });
    const sampler = startSampler();

    // ---- Wait for exit ----
    while (!s.cancel) {
      await new Promise((r) => setTimeout(r, 5000));
      if ((await processes()).some((x) => s.names.has(x.name))) continue;
      // Known processes are gone: make sure nothing else from the game's folder is still running (launcher stubs hand off to the real exe).
      const more = dir ? (await dirProcesses(dir)).filter((x) => !HELPER.test(x.name)) : [];
      if (!more.length) break;
      more.forEach((x) => s.names.add(x.name));
    }
    dbg(`"${game.name}": ended after ${Math.round((Date.now() - s.startedAt) / 60000)} min`);
    const ms = Date.now() - s.startedAt;
    const reportId = saveReport(game, s.startedAt, sampler.stop());
    if (s.weExe) execFile(s.weExe, ['-control', 'play'], { windowsHide: true }, () => {});
    const pt = loadPt();
    const e = (pt[game.key] ||= { total: 0, sessions: 0 });
    e.total += ms; e.sessions += 1; e.last = Date.now(); e.name = game.name;
    savePt(pt);
    let backup = null;
    if (opts.autoBackup) {
      try { backup = await hooks.backup(game); } catch (err) { backup = { error: err.message }; }
    }
    hooks.emit({ state: 'ended', key: game.key, name: game.name, minutes: Math.round(ms / 60000), backup, reportId });
    if (current === s) current = null;
  };
  loop();
  return true;
}

// Close the game started from Gjallarhorn: politely first (like clicking the window's X), or forcefully.
// Bring the running game's window to the front (restore if minimised). Used by "Resume game" in the in-game menu.
const FOCUS_CS = `Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public static class GjFocus {
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte sc, uint fl, UIntPtr ex);
  [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr h);
  public static void Go(IntPtr h) {
    keybd_event(0x12, 0, 0, UIntPtr.Zero); keybd_event(0x12, 0, 2, UIntPtr.Zero); // a tapped Alt lifts Windows' foreground lock
    if (IsIconic(h)) ShowWindow(h, 9);
    BringWindowToTop(h); SetForegroundWindow(h);
  }
}
"@
`;
function focusGame() {
  if (!current?.startedAt) return Promise.resolve(false);
  const names = [...current.names].map((n) => n.replace(/\.exe$/i, '')).filter(Boolean);
  if (!names.length) return Promise.resolve(false);
  const list = names.map((n) => `'${n.replace(/'/g, "''")}'`).join(',');
  return ps(FOCUS_CS + `Get-Process -Name ${list} -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object { [GjFocus]::Go($_.MainWindowHandle) }`).then(() => true);
}

function closeCurrent(force = false) {
  if (!current?.startedAt) return Promise.resolve(false);
  const names = [...current.names].map((n) => n.replace(/\.exe$/i, '')).filter(Boolean);
  if (!names.length) return Promise.resolve(false);
  dbg(`closing "${current.game.name}" (${force ? 'force' : 'graceful'}): ${names.join(', ')}`);
  const list = names.map((n) => `'${n.replace(/'/g, "''")}'`).join(',');
  const action = force ? 'Stop-Process -Id $_.Id -Force' : '$_.CloseMainWindow() | Out-Null';
  const finish = force ? '' : `; Start-Sleep 6; Get-Process -Name ${list} -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue`; // graceful first, force if it ignored us
  ps(`Get-Process -Name ${list} -ErrorAction SilentlyContinue | ForEach-Object { ${action} }${finish}`);
  return Promise.resolve(true);
}

module.exports = { start, placeWindow, closeCurrent, focusGame, playtime: loadPt, reports: loadReports, processes, status: () => (current ? { key: current.game.key, name: current.game.name, running: !!current.startedAt, actions: current.actions } : null) };
