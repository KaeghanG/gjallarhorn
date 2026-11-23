// Launch argument catalog. Written for T8 (round 3).
// All flags are widely documented, real launch args used by Steam/UE/Source games.

export const LAUNCH_ARGS = [
  // --- any engine ---
  { arg: '-novid', label: 'Skip intro videos', desc: 'Skips intro cinematic sequences on startup (does nothing in Counter-Strike 2, which has no intro video).', engines: ['source'], kind: 'convenience', caution: null },
  { arg: '-fullscreen', label: 'Fullscreen', desc: 'Force exclusive fullscreen mode.', engines: ['any'], kind: 'quality', caution: null },
  { arg: '-windowed', label: 'Windowed', desc: 'Force windowed mode at startup.', engines: ['any'], kind: 'convenience', caution: null },
  { arg: '-dx11', label: 'DirectX 11', desc: 'Force DirectX 11 renderer.', engines: ['any'], kind: 'compat', caution: null },
  { arg: '-dx12', label: 'DirectX 12', desc: 'Force DirectX 12 renderer.', engines: ['any'], kind: 'compat', caution: null },
  { arg: '-vulkan', label: 'Vulkan', desc: 'Force Vulkan renderer.', engines: ['any'], kind: 'compat', caution: 'Only works if the game supports Vulkan.' },

  // --- Unreal Engine ---
  { arg: '-USEALLAVAILABLECORES', label: 'Use all cores', desc: 'Tell the engine to use every available CPU core (UE3-era games benefit most).', engines: ['unreal'], kind: 'perf', caution: null },
  { arg: '-NOSPLASH', label: 'No splash screen', desc: 'Skips the Unreal Engine splash screen on startup.', engines: ['unreal'], kind: 'convenience', caution: null },
  { arg: '-nomoviestartup', label: 'No startup movies', desc: 'Skips startup movie playback in some UE games.', engines: ['unreal'], kind: 'convenience', caution: 'Not all games respect this flag.' },

  // --- Unity ---
  { arg: '-force-d3d12', label: 'Force DirectX 12', desc: 'Force Unity to use the DirectX 12 rendering path.', engines: ['unity'], kind: 'compat', caution: null },
  { arg: '-force-d3d11', label: 'Force DirectX 11', desc: 'Force Unity to use the DirectX 11 rendering path.', engines: ['unity'], kind: 'compat', caution: null },
  { arg: '-force-vulkan', label: 'Force Vulkan', desc: 'Force Unity to use the Vulkan rendering path.', engines: ['unity'], kind: 'compat', caution: null },
  { arg: '-screen-fullscreen 1', label: 'Fullscreen', desc: 'Set fullscreen mode in Unity (0 = windowed).', engines: ['unity'], kind: 'quality', caution: null },
  { arg: '-window-mode exclusive', label: 'Exclusive fullscreen', desc: 'Force exclusive fullscreen for lower latency.', engines: ['unity'], kind: 'quality', caution: null },
  { arg: '-popupwindow', label: 'Borderless window', desc: 'Launch as a borderless popup window.', engines: ['unity'], kind: 'convenience', caution: null },

  // --- Source engine ---
  { arg: '-high', label: 'High process priority', desc: 'Set the game process to high CPU priority.', engines: ['source'], kind: 'perf', caution: 'Can cause stutter on modern CPUs; prefer leaving off.' },
  { arg: '+fps_max 0', label: 'Uncapped framerate', desc: 'Remove the FPS cap in Source engine games (+ is a CVars command, not an arg).', engines: ['source'], kind: 'perf', caution: null },
  { arg: '-forcenovsync', label: 'Force V-Sync off', desc: 'Ignores the driver/in-game V-Sync setting so frames are not held back (can tear).', engines: ['source'], kind: 'perf', caution: 'Screen tearing without G-Sync/FreeSync.' },
  { arg: '-softparticlesdefaultoff', label: 'Soft particles off', desc: 'Starts with soft particles disabled, a cheap FPS gain in Source games.', engines: ['source'], kind: 'perf', caution: null },
  { arg: '-novr', label: 'Disable VR', desc: 'Skips loading VR support (Dota 2 and other Source 2 games).', engines: ['source'], kind: 'perf', caution: null },
  // --- more Unreal ---
  { arg: '-NoTextureStreaming', label: 'No texture streaming', desc: 'Loads full textures up front: removes texture pop-in but uses much more VRAM.', engines: ['unreal'], kind: 'quality', caution: 'Needs plenty of VRAM; can hurt on 6-8 GB cards.' },
  { arg: '-NoVerifyGC', label: 'Skip GC verification', desc: 'Community-reported to reduce hitching on GPUs with 8 GB+ of VRAM in some UE5 games. Evidence: mixed.', engines: ['unreal'], kind: 'perf', caution: 'Disables a garbage-collection safety check; it can hide crashes.' },
  { arg: '-norhithread', label: 'No RHI thread (DX11)', desc: 'Often suggested for Unreal games running DirectX 11 that stutter. Evidence: mixed.', engines: ['unreal'], kind: 'perf', caution: 'Only for DX11 games; can lower FPS on others.' },
  { arg: '-nothreadtimeout', label: 'No thread timeout', desc: 'Stops the engine killing a slow render thread: prevents some crashes during shader compilation. Not an FPS gain.', engines: ['unreal'], kind: 'compat', caution: null },
  { arg: '-lowmemory', label: 'Low memory mode', desc: 'Tells the engine to use less RAM, for systems that are short on memory.', engines: ['unreal'], kind: 'perf', caution: 'Only helps low-RAM PCs; not every UE game honors it.' },
  { arg: '-onethread', label: 'Single thread (debug)', desc: 'Forces single-threaded rendering. Only for diagnosing crashes and hangs, it is slower.', engines: ['unreal'], kind: 'compat', caution: 'Large FPS loss; use only to troubleshoot.' },
  // --- more Unity ---
  { arg: '-force-gfx-mt', label: 'Multithreaded rendering', desc: 'Forces multithreaded rendering where the game defaults to single-threaded.', engines: ['unity'], kind: 'perf', caution: null },
  { arg: '-force-d3d11-singlethreaded', label: 'DX11 single-threaded', desc: 'Fixes some DirectX 11 crashes and flicker at a small speed cost.', engines: ['unity'], kind: 'compat', caution: null },
  { arg: '-nolog', label: 'No log file', desc: 'Stops Unity writing its output log, saving a little disk I/O.', engines: ['unity'], kind: 'perf', caution: 'Makes crash troubleshooting harder.' },
  { arg: '-force-low-power-device', label: 'Use the low-power GPU', desc: 'Prefers the integrated GPU. Useful to save battery on a laptop.', engines: ['unity'], kind: 'compat', caution: 'Lowers FPS on laptops with a dedicated GPU.' },
  // --- any engine ---
  { arg: '-nosplash', label: 'Skip splash screen', desc: 'Skips the startup splash screen in many engines.', engines: ['any'], kind: 'convenience', caution: 'Not every game supports it.' },
  { arg: '-nojoy', label: 'Disable joystick', desc: 'Disable joystick support to get a small startup speedup.', engines: ['source'], kind: 'perf', caution: null },
];

const KIND_ORDER = { perf: 0, compat: 1, quality: 2, convenience: 3 };

export function suggestArgs(engine) {
  return LAUNCH_ARGS
    .filter(entry => entry.engines.includes('any') || entry.engines.includes(engine))
    .sort((a, b) => {
      const ka = KIND_ORDER[a.kind] ?? 9;
      const kb = KIND_ORDER[b.kind] ?? 9;
      if (ka !== kb) return ka - kb;
      return 0;
    });
}

// Per-user flags generated from THIS PC's primary monitor (hw from window.gjallar.hardware()).
// Added by Claude: values must come from the user's hardware, never be hardcoded.
export function hardwareArgs(engine, hw) {
  const d = hw?.primary;
  if (!d?.width) return [];
  const res = `${d.width}×${d.height}`;
  const out = [];
  if (engine === 'unreal') {
    out.push({ arg: `-ResX=${d.width} -ResY=${d.height}`, label: `Resolution ${res}`, desc: `Start at your monitor's native resolution (${res}).`, engines: ['unreal'], kind: 'quality', caution: null, yours: true });
  }
  if (engine === 'unity') {
    out.push({ arg: `-screen-width ${d.width} -screen-height ${d.height}`, label: `Resolution ${res}`, desc: `Start at your monitor's native resolution (${res}).`, engines: ['unity'], kind: 'quality', caution: null, yours: true });
  }
  if (engine === 'source') {
    out.push({ arg: `-w ${d.width} -h ${d.height}`, label: `Resolution ${res}`, desc: `Start at your monitor's native resolution (${res}).`, engines: ['source'], kind: 'quality', caution: null, yours: true });
    if (d.refresh > 60) out.push({ arg: `-refresh ${d.refresh}`, label: `${d.refresh} Hz`, desc: `Run fullscreen at your monitor's ${d.refresh} Hz instead of the 60 Hz default.`, engines: ['source'], kind: 'perf', caution: null, yours: true });
  }
  return out;
}
