'use strict';
// Per-game process tuning that Windows really supports (no registry hacks, nothing hardware-specific is hardcoded):
//  - Opt the game out of EcoQoS / power throttling (SetProcessInformation, ProcessPowerThrottling)
//  - Soft-prefer the performance cores of a hybrid CPU (SetProcessDefaultCpuSets: a CPU *set* is a scheduler hint, not a hard affinity mask)
//  - Per-exe "Disable fullscreen optimizations" compatibility flag (HKCU, per user, easy to undo)
const { execFile } = require('child_process');
const path = require('path');

const CS = `Add-Type -TypeDefinition @"
using System; using System.Collections.Generic; using System.Runtime.InteropServices;
public static class GjPerf {
  [DllImport("kernel32.dll")] static extern bool GetSystemCpuSetInformation(IntPtr info, uint len, out uint ret, IntPtr proc, uint flags);
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll")] static extern bool SetProcessInformation(IntPtr h, int cls, ref PT state, int size);
  [DllImport("kernel32.dll")] static extern bool SetProcessDefaultCpuSets(IntPtr h, uint[] ids, uint count);
  [StructLayout(LayoutKind.Sequential)] struct PT { public uint Version; public uint ControlMask; public uint StateMask; }
  public static void Cpu(out List<uint> best, out List<uint> rest) {
    best = new List<uint>(); rest = new List<uint>();
    uint len; GetSystemCpuSetInformation(IntPtr.Zero, 0, out len, IntPtr.Zero, 0);
    if (len == 0) return;
    IntPtr buf = Marshal.AllocHGlobal((int)len);
    try {
      if (!GetSystemCpuSetInformation(buf, len, out len, IntPtr.Zero, 0)) return;
      var list = new List<KeyValuePair<uint, int>>(); int max = 0, min = 255; int off = 0;
      while (off < len) {
        int size = Marshal.ReadInt32(buf, off); int type = Marshal.ReadInt32(buf, off + 4);
        if (size <= 0) break;
        if (type == 0) { uint id = (uint)Marshal.ReadInt32(buf, off + 8); int eff = Marshal.ReadByte(buf, off + 18); list.Add(new KeyValuePair<uint, int>(id, eff)); if (eff > max) max = eff; if (eff < min) min = eff; }
        off += size;
      }
      foreach (var kv in list) { if (kv.Value == max) best.Add(kv.Key); else rest.Add(kv.Key); }
    } finally { Marshal.FreeHGlobal(buf); }
  }
  public static string Apply(int pid, bool noThrottle, bool bestOnly) {
    IntPtr h = OpenProcess(0x0200 | 0x2000 | 0x0400 | 0x1000, false, pid);
    if (h == IntPtr.Zero) return "denied";
    var done = new List<string>();
    try {
      if (noThrottle) { var s = new PT { Version = 1, ControlMask = 1, StateMask = 0 }; if (SetProcessInformation(h, 4, ref s, 12)) done.Add("no-throttle"); }
      if (bestOnly) { List<uint> b, r; Cpu(out b, out r); if (r.Count > 0 && b.Count > 0 && SetProcessDefaultCpuSets(h, b.ToArray(), (uint)b.Count)) done.Add("pcores"); }
    } finally { CloseHandle(h); }
    return string.Join(",", done);
  }
  public static string Info() { List<uint> b, r; Cpu(out b, out r); return b.Count + "," + r.Count; }
}
"@
`;

const ps = (script, ms = 10000) => new Promise((resolve) => {
  execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', CS + script], { windowsHide: true, timeout: ms }, (err, out) => resolve(err ? '' : String(out).trim()));
});

let cpuCache = null;
/** { hybrid, performance, efficiency, logical } for THIS machine. */
async function cpuInfo() {
  if (cpuCache) return cpuCache;
  const o = await ps('[GjPerf]::Info()');
  const [b, r] = o.split(',').map(Number);
  cpuCache = { performance: b || 0, efficiency: r || 0, hybrid: (r || 0) > 0 && (b || 0) > 0, logical: (b || 0) + (r || 0) };
  return cpuCache;
}

/** Apply the chosen tweaks to a running game process. Returns a list of human-readable actions. */
async function tune(pid, { noThrottle, performanceCores }) {
  if (!noThrottle && !performanceCores) return [];
  const o = await ps(`[GjPerf]::Apply(${Number(pid)}, $${!!noThrottle}, $${!!performanceCores})`);
  const out = [];
  if (o === 'denied') return ['Process tuning skipped (Windows denied access, usually anti-cheat)'];
  if (o.includes('no-throttle')) out.push('Windows power throttling off for the game');
  if (o.includes('pcores')) out.push('Prefers performance cores');
  return out;
}

// ---- per-exe "Disable fullscreen optimizations" ----
const KEY = 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers';
const FLAG = 'DISABLEDXMAXIMIZEDWINDOWEDMODE';
function regRun(args) { return new Promise((resolve) => execFile('reg.exe', args, { windowsHide: true }, (err, out) => resolve(err ? null : String(out)))); }
async function fsoGet(exe) {
  if (!exe) return false;
  const o = await regRun(['query', KEY, '/v', path.resolve(exe)]);
  return !!o && o.includes(FLAG);
}
async function fsoSet(exe, on) {
  if (!exe) throw new Error('Game executable not found');
  const full = path.resolve(exe);
  const cur = (await regRun(['query', KEY, '/v', full])) || '';
  const m = /REG_SZ\s+(.*)$/m.exec(cur);
  const flags = (m ? m[1].trim() : '').split(/\s+/).filter((f) => f && f !== '~' && f !== FLAG);
  if (on) flags.push(FLAG);
  if (!flags.length) { await regRun(['delete', KEY, '/v', full, '/f']); return false; }
  await regRun(['add', KEY, '/v', full, '/t', 'REG_SZ', '/d', `~ ${flags.join(' ')}`, '/f']);
  return on;
}

module.exports = { cpuInfo, tune, fsoGet, fsoSet };
