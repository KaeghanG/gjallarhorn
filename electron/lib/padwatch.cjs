// Native controller watcher: one small background PowerShell process that reads controllers directly, with NO window-focus requirement
// (a web page only receives gamepad input while it is focused, which is why couch mode died when you clicked another window).
//  1. Xbox-style pads: XInput (XInputGetState).
//  2. Everything else (PlayStation DualShock/DualSense, Switch Pro, generic HID pads): the Windows joystick API (winmm joyGetPosEx),
//     mapped onto the same Xbox-style button bits. Sony pads (vendor id 0x054C) use PlayStation button order.
// It prints "COMBO" when the chosen buttons are held ~0.9 s (opens couch mode from anywhere), and "S <buttons> <lx> <ly>" on every state change.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { app } = require('electron');

// XInput button bits (also used for the HID mapping)
const BITS = { up: 0x1, down: 0x2, left: 0x4, right: 0x8, start: 0x10, back: 0x20, ls: 0x40, rs: 0x80, lb: 0x100, rb: 0x200, a: 0x1000, b: 0x2000, x: 0x4000, y: 0x8000 };
const COMBOS = {
  'back+start': BITS.back | BITS.start, // View + Menu on Xbox; Create/Share + Options on PlayStation
  'lb+rb+start': BITS.lb | BITS.rb | BITS.start,
  'ls+rs': BITS.ls | BITS.rs,
  none: 0, // combo disabled (state streaming only)
};

// Written to a file (not -Command) so it stays readable. NOTE: PowerShell variable names are case-insensitive.
// 25 ms poll; the combo needs 36 polls (~0.9 s).
const SCRIPT = `param([int]$Mask, [string]$TbFlag)
Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public static class GjP {
  [StructLayout(LayoutKind.Sequential)] public struct GP { public ushort Buttons; public byte LT; public byte RT; public short LX; public short LY; public short RX; public short RY; }
  [StructLayout(LayoutKind.Sequential)] public struct ST { public uint Packet; public GP Pad; }
  [DllImport("xinput1_4.dll")] public static extern int XInputGetState(int i, ref ST s);
  [DllImport("xinput1_4.dll", EntryPoint = "#100")] public static extern int XInputGetStateEx(int i, ref ST s);
  [StructLayout(LayoutKind.Sequential)] public struct JI { public uint size, flags, x, y, z, r, u, v, buttons, buttonNumber, pov, res1, res2; }
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] public struct JC {
    public ushort mid, pid;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string name;
    public uint xmin, xmax, ymin, ymax, zmin, zmax, nbuttons, pmin, pmax, rmin, rmax, umin, umax, vmin, vmax, caps, maxaxes, numaxes, maxbuttons;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string regkey;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)] public string oem;
  }
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
  [DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  // Steam opens its Big Picture window when the Guide button is pressed; ask any such window to close (WM_CLOSE) so Gjallarhorn stays in front.
  public static int MinSteam() {
    int n = 0;
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new System.Text.StringBuilder(128); GetWindowText(h, sb, 128);
      if (sb.ToString() == "Steam") { ShowWindow(h, 6); n++; }
      return true;
    }, IntPtr.Zero);
    return n;
  }
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string c, string t);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string t);
  public static void Taskbar(bool show) {
    int cmd = show ? 5 : 0;
    IntPtr h = FindWindow("Shell_TrayWnd", null);
    if (h != IntPtr.Zero) ShowWindow(h, cmd);
    IntPtr s = IntPtr.Zero;
    while ((s = FindWindowEx(IntPtr.Zero, s, "Shell_SecondaryTrayWnd", null)) != IntPtr.Zero) ShowWindow(s, cmd);
  }
  public static int CloseBpm() {
    int n = 0;
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h)) return true;
      var sb = new System.Text.StringBuilder(128); GetWindowText(h, sb, 128);
      if (sb.ToString() == "Steam Big Picture Mode") { PostMessage(h, 0x10, IntPtr.Zero, IntPtr.Zero); n++; }
      return true;
    }, IntPtr.Zero);
    return n;
  }
  [DllImport("winmm.dll")] public static extern int joyGetPosEx(uint id, ref JI info);
  [DllImport("winmm.dll", CharSet = CharSet.Unicode)] public static extern int joyGetDevCapsW(uint id, ref JC caps, uint size);
}
"@
$tbHidden = $false; $tbTick = 0; $sw = 0; $bpm = 0; $held = 0; $gheld = 0; $useEx = $true; $last = ''; $sony = @{}; $fam = ''; $lastFam = ''
while ($true) {
  $btn = 0; $lx = 0; $ly = 0; $any = $false; $fam = ''
  for ($i = 0; $i -lt 4; $i++) {
    $st = New-Object GjP+ST
    # XInputGetStateEx (ordinal 100) also reports the Guide/Xbox button; fall back to the plain call if it isn't available.
    if ($useEx) { try { $rc = [GjP]::XInputGetStateEx($i, [ref]$st) } catch { $useEx = $false; $rc = [GjP]::XInputGetState($i, [ref]$st) } } else { $rc = [GjP]::XInputGetState($i, [ref]$st) }
    if ($rc -eq 0) {
      $any = $true; $fam = 'xbox'
      $btn = $btn -bor $st.Pad.Buttons
      if ($st.Pad.LT -gt 100) { $btn = $btn -bor 0x10000 }
      if ($st.Pad.RT -gt 100) { $btn = $btn -bor 0x20000 }
      if ([Math]::Abs([int]$st.Pad.LX) + [Math]::Abs([int]$st.Pad.LY) -gt [Math]::Abs($lx) + [Math]::Abs($ly)) { $lx = [int]$st.Pad.LX / 3277; $ly = [int]$st.Pad.LY / 3277 }
    }
  }
  if (-not $any) {
    for ($j = 0; $j -lt 16; $j++) {
      $ji = New-Object GjP+JI
      $ji.size = 52; $ji.flags = 255
      if ([GjP]::joyGetPosEx($j, [ref]$ji) -ne 0) { continue }
      if (-not $sony.ContainsKey($j)) {
        $jc = New-Object GjP+JC
        [GjP]::joyGetDevCapsW($j, [ref]$jc, [uint32][Runtime.InteropServices.Marshal]::SizeOf($jc)) | Out-Null
        $sony[$j] = ($jc.mid -eq 1356)
      }
      $any = $true
      $bt = [int]$ji.buttons
      if ($sony[$j]) {
        $fam = 'playstation'
        if ($bt -band 1) { $btn = $btn -bor 0x4000 }; if ($bt -band 2) { $btn = $btn -bor 0x1000 }
        if ($bt -band 4) { $btn = $btn -bor 0x2000 }; if ($bt -band 8) { $btn = $btn -bor 0x8000 }
        if ($bt -band 16) { $btn = $btn -bor 0x100 }; if ($bt -band 32) { $btn = $btn -bor 0x200 }
        if ($bt -band 256) { $btn = $btn -bor 0x20 }; if ($bt -band 512) { $btn = $btn -bor 0x10 }
        if ($bt -band 1024) { $btn = $btn -bor 0x40 }; if ($bt -band 2048) { $btn = $btn -bor 0x80 }
        if ($bt -band 64) { $btn = $btn -bor 0x10000 }; if ($bt -band 128) { $btn = $btn -bor 0x20000 }   # L2 / R2
        if ($bt -band 4096) { $btn = $btn -bor 0x400 }                                                      # PS button = Guide
      } else {
        $fam = 'generic'
        if ($bt -band 1) { $btn = $btn -bor 0x1000 }; if ($bt -band 2) { $btn = $btn -bor 0x2000 }
        if ($bt -band 4) { $btn = $btn -bor 0x4000 }; if ($bt -band 8) { $btn = $btn -bor 0x8000 }
        if ($bt -band 16) { $btn = $btn -bor 0x100 }; if ($bt -band 32) { $btn = $btn -bor 0x200 }
        if ($bt -band 64) { $btn = $btn -bor 0x20 }; if ($bt -band 128) { $btn = $btn -bor 0x10 }
        if ($bt -band 256) { $btn = $btn -bor 0x40 }; if ($bt -band 512) { $btn = $btn -bor 0x80 }
      }
      $pv = [int]$ji.pov
      if ($pv -ne 65535 -and $pv -lt 36000) {
        if ($pv -ge 31500 -or $pv -le 4500) { $btn = $btn -bor 0x1 }
        if ($pv -ge 4500 -and $pv -le 13500) { $btn = $btn -bor 0x8 }
        if ($pv -ge 13500 -and $pv -le 22500) { $btn = $btn -bor 0x2 }
        if ($pv -ge 22500 -and $pv -le 31500) { $btn = $btn -bor 0x4 }
      }
      $lx = ([int]$ji.x - 32767) / 3277
      $ly = -(([int]$ji.y - 32767) / 3277)
      break
    }
  }
  if ($Mask -ne 0 -and $any -and (($btn -band $Mask) -eq $Mask)) { $held++ } else { $held = 0 }
  if ($held -eq 36) { [Console]::Out.WriteLine('COMBO'); [Console]::Out.Flush() }
  if ($btn -band 0x400) { $gheld++ } else { $gheld = 0 }
  if ($gheld -eq 1) { [Console]::Out.WriteLine('GUIDE'); [Console]::Out.Flush(); $sw = 80 }   # watch ~1.5 s for Steam's Big Picture window and close it
  if ($sw -gt 0) { $sw--; if (($sw % 5) -eq 0) { if ([GjP]::MinSteam() -gt 0) { [Console]::Out.WriteLine('BPMCLOSED'); [Console]::Out.Flush() } } }   # ~2 s after Guide/Home: minimise Steam's main window if it grabbed focus
  $tbTick++; if (($tbTick % 40) -eq 0) { $want = Test-Path -LiteralPath $TbFlag; if ($want) { [GjP]::Taskbar($false); $tbHidden = $true } elseif ($tbHidden) { [GjP]::Taskbar($true); $tbHidden = $false } }   # couch mode keeps the taskbar hidden even when another window has focus
  $bpm++; if (($bpm % 8) -eq 0) { $c = [GjP]::CloseBpm(); if ($c -gt 0) { [Console]::Out.WriteLine('BPMCLOSED'); [Console]::Out.Flush() } }   # always on: Gjallarhorn replaces Steam's Big Picture, so any Big Picture window is closed within ~200 ms
  if ($any -and $fam -ne $lastFam) { [Console]::Out.WriteLine('TYPE ' + $fam); [Console]::Out.Flush(); $lastFam = $fam }
  if ($any) { $line = 'S ' + $btn + ' ' + [int]$lx + ' ' + [int]$ly } else { $line = 'S none' }
  if ($line -ne $last) { [Console]::Out.WriteLine($line); [Console]::Out.Flush(); $last = $line }
  Start-Sleep -Milliseconds 25
}
`;

let child = null;
// Taskbar: while couch mode is open a flag file exists and the watcher keeps the Windows taskbar hidden (even when another window has focus).
const tbFlagFile = () => path.join(app.getPath('userData'), 'hide-taskbar.flag');
const TB_SHOW = "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public static class T{[DllImport(\"user32.dll\")]static extern IntPtr FindWindow(string c,string t);[DllImport(\"user32.dll\")]static extern IntPtr FindWindowEx(IntPtr p,IntPtr a,string c,string t);[DllImport(\"user32.dll\")]static extern bool ShowWindow(IntPtr h,int c);public static void S(int cmd){IntPtr h=FindWindow(\"Shell_TrayWnd\",null);if(h!=IntPtr.Zero)ShowWindow(h,cmd);IntPtr s=IntPtr.Zero;while((s=FindWindowEx(IntPtr.Zero,s,\"Shell_SecondaryTrayWnd\",null))!=IntPtr.Zero)ShowWindow(s,cmd);}}'; [T]::S(5)";
function setTaskbarHidden(hide) {
  try {
    if (hide) fs.writeFileSync(tbFlagFile(), '1');
    else { try { fs.unlinkSync(tbFlagFile()); } catch {} showTaskbar(); }
  } catch {}
}
// Always safe to call: forces the taskbar visible (startup, couch exit, app quit).
function showTaskbar(sync) {
  const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', TB_SHOW];
  try { if (sync) require('child_process').execFileSync('powershell', args, { windowsHide: true, timeout: 8000 }); else require('child_process').execFile('powershell', args, { windowsHide: true }, () => {}); } catch {}
}
let currentCombo = null;
// onState({ connected, buttons, lx, ly }) with lx/ly in -10..10 (up is positive).
function start(combo, onCombo, onState, onGuide, onType, onBpm) {
  if (child && currentCombo === combo) return; // already running with these settings: don't pay the PowerShell start-up again
  stop();
  currentCombo = combo;
  const mask = COMBOS[combo] ?? COMBOS['back+start'];
  const file = path.join(app.getPath('userData'), 'padwatch.ps1');
  try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, SCRIPT); } catch { return; }
  const me = spawn('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file, '-Mask', String(mask), '-TbFlag', tbFlagFile()], { windowsHide: true });
  child = me;
  let buf = '';
  child.stdout.on('data', (d) => {
    buf += d;
    const lines = buf.split(/\r?\n/);
    buf = lines.pop();
    for (const l of lines) {
      if (l === 'COMBO') onCombo();
      else if (l === 'BPMCLOSED') { if (onBpm) onBpm(); }
      else if (l === 'GUIDE') { if (onGuide) onGuide(); }
      else if (l.startsWith('TYPE ') && onType) onType(l.slice(5).trim());
      else if (l.startsWith('S ') && onState) {
        const p = l.split(' ');
        onState(p[1] === 'none' ? { connected: false, buttons: 0, lx: 0, ly: 0 } : { connected: true, buttons: Number(p[1]), lx: Number(p[2]), ly: Number(p[3]) });
      }
    }
  });
  child.on('error', () => {});
  child.on('exit', () => {
    if (child === me) { child = null; showTaskbar(false); } // the watcher died on its own (not via stop()): never leave the taskbar hidden
    if (onState) onState({ connected: false, buttons: 0, lx: 0, ly: 0 }); // never leave a stale "held" state behind
  });
}
function stop() {
  try { child?.kill(); } catch {}
  child = null;
  currentCombo = null;
}
module.exports = { setTaskbarHidden, showTaskbar, start, stop, COMBOS: Object.keys(COMBOS) };
