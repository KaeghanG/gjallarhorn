# Performance: what Gjallarhorn does, and what is just internet folklore

Most "sick launch arguments" posted online do nothing. We went through community threads, vendor documentation and tests and kept only the things Windows actually supports and that are safe to undo. Everything below is optional and reversible, and nothing is hardcoded to a particular PC: your CPU, refresh rate and GPU are detected at runtime.

## Applied to every game automatically (Settings → Game Boost)

| What | Why it helps | Can I turn it off? |
|---|---|---|
| **High-performance GPU** | On laptops with integrated + discrete graphics, Windows sometimes starts a game on the weak GPU. Gjallarhorn sets the *High performance* preference for each game and emulator it launches. | Windows Settings → Display → Graphics |
| **High CPU priority** | Background apps yield to the game process. | Yes |
| **Windows power throttling off (EcoQoS)** | Windows 11 can put a process in *Efficiency mode*, which makes a game brake. Gjallarhorn opts the game process out. | Yes |
| **Wallpaper Engine paused** | Stops an animated wallpaper using the GPU while you play. | Yes |
| **Background animations pause** | Gjallarhorn's own animated backgrounds stop drawing while another window has focus. | Reduce motion in Settings |

## Per game (Library → open a game → Performance)

- **Prefer performance cores** (only shown on hybrid Intel CPUs). Several Intel-forum and Steam threads report stutter in games such as Elden Ring and World of Warcraft when Windows places them on efficiency cores ([Intel community: Elden Ring E-cores stuttering](https://community.intel.com/t5/Graphics/Elden-ring-e-cores-stuttering/td-p/1602422), [Intel's own developer guidance](https://www.intel.com/content/www/us/en/developer/articles/technical/optimizing-threading-for-gaming-performance.html)). Intel recommends *soft* hints over hard pinning, so Gjallarhorn uses a Windows **CPU set** (a scheduler preference), not a hard affinity mask. Evidence is mixed; try it only if a game stutters.
- **Disable fullscreen optimizations.** A per-game Windows compatibility flag stored under your user registry key. Reports are mixed ([Windows Central tests](https://www.windowscentral.com/microsoft/windows-11/my-top-21-ways-to-improve-windows-11-to-increase-gaming-performance-without-hardware-upgrade)); skip it if you use overlays or Auto HDR.
- **Game notes.** A short, honest list for specific games, each tagged with how strong the evidence is.

## Launch arguments that are actually worth trying

| Engine | Argument | Notes |
|---|---|---|
| Any | `-dx11` / `-dx12` / `-vulkan` | Switch the renderer when one stutters or crashes. The biggest real lever for many games. |
| Unreal | `-NoVerifyGC` | Reported to reduce hitching on GPUs with 8 GB+ VRAM in some UE5 games. Can hide crashes. |
| Unreal | `-norhithread` | Often suggested for Unreal games on DirectX 11 that stutter. |
| Unreal | `-nothreadtimeout` | Prevents some crashes during shader compilation. Not an FPS gain. |
| Unity | `-force-d3d11` / `-force-d3d12` | Renderer switch ([Unity docs](https://docs.unity.com/en-us/engine/6000.0/manual/unity-editor/command-line-arguments/player)). |

## What we deliberately did not do

- **Registry "gaming tweaks"** (MMCSS *GPU Priority 8*, *Priority 6*, *Scheduling Category High*): Microsoft's own documentation says some of those values are ignored, and no independent test shows a gain ([MMCSS documentation](https://learn.microsoft.com/en-us/windows/win32/procthread/multimedia-class-scheduler-service)).
- **`-novid`, `-nojoy`, `-high`, `-threads` as "FPS boosts" for Counter-Strike 2.** Guides repeatedly describe these as placebo or obsolete after CS:GO; `-novid` does nothing because CS2 has no intro video ([SteamAnalyst](https://www.steamanalyst.com/guides/cs2-launch-options), [Refrag](https://refrag.gg/blog/best-launch-options-for-cs2)). In-game graphics settings matter more.
- **Disabling Windows security features** (Memory Integrity / VBS) for FPS. The gain is hardware-dependent and it lowers protection.
- **Hard CPU affinity or disabling E-cores.** Intel advises against it for most cases.
- **GPU driver settings** (shader cache size *Unlimited*, per-game power mode, Low Latency / Reflex). They are real and widely reported to help stutter ([NVIDIA forum on shader cache limits](https://forums.developer.nvidia.com/t/opengl-shader-disk-cache-max-size-garbage-collection/60056)), but they live in the NVIDIA / AMD control panels and Gjallarhorn does not change driver settings. The Game notes remind you.

## How to test a change

1. Note average FPS and 1% lows (the Play reports page records GPU load, temperature and power for every session).
2. Change **one** thing.
3. Play the same scene again and compare. Keep it only if it helped.
