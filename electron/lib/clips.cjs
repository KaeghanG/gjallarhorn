'use strict';
// Video clips: lists recordings made by Windows Game Bar, NVIDIA ShadowPlay / Instant Replay, Steam and Gjallarhorn's own folder,
// and can start/stop a Game Bar recording (Win + Alt + R) for the running game.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const VID = /\.(mp4|mkv|webm|mov)$/i;

function walk(dir, depth, out, limit) {
  if (depth < 0 || out.length >= limit) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, depth - 1, out, limit);
    else if (VID.test(e.name)) {
      try {
        const st = fs.statSync(p);
        if (st.size < 100 * 1024) continue; // skip stubs
        // Game name = the parent folder when it is not the generic capture folder (ShadowPlay uses one folder per game).
        const parent = path.basename(dir);
        out.push({ file: p, name: e.name, game: /^(captures|videos|gjallarhorn)$/i.test(parent) ? null : parent, mtime: st.mtimeMs, size: st.size, video: true });
      } catch {}
    }
  }
}

/** @param {{ videosDir: string, extraDirs?: string[], steamRoot?: string, limit?: number }} o */
function list({ videosDir, extraDirs = [], steamRoot, limit = 150 }) {
  const out = [];
  const roots = [path.join(videosDir, 'Captures'), path.join(videosDir, 'Gjallarhorn'), path.join(videosDir, 'NVIDIA'), ...extraDirs];
  if (steamRoot) roots.push(path.join(steamRoot, 'userdata'));
  for (const r of roots) walk(r, r.endsWith('userdata') ? 6 : 3, out, 2000);
  const seen = new Set();
  return out.filter((x) => (seen.has(x.file) ? false : seen.add(x.file))).sort((a, b) => b.mtime - a.mtime).slice(0, limit);
}

// Win + Alt + R toggles Game Bar recording. Needs Xbox Game Bar enabled (Windows default) and a game in the foreground.
const KEYS_PS = `Add-Type -TypeDefinition @"
using System; using System.Runtime.InteropServices;
public class GjK { [DllImport("user32.dll")] public static extern void keybd_event(byte b, byte s, uint f, UIntPtr e); }
"@
$d=@(0x5B,0x12,0x52); foreach($k in $d){[GjK]::keybd_event($k,0,0,[UIntPtr]::Zero)}; Start-Sleep -Milliseconds 80; foreach($k in @(0x52,0x12,0x5B)){[GjK]::keybd_event($k,0,2,[UIntPtr]::Zero)}`;
function toggleRecording() {
  return new Promise((resolve) => execFile('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', KEYS_PS], { windowsHide: true, timeout: 8000 }, (err) => resolve(!err)));
}

module.exports = { list, toggleRecording };
