# How Gjallarhorn compares

A fair comparison, not a sales pitch. Gjallarhorn is new, Windows-only and built by one person with a lot of help, so it is **not** better than everything at everything. Other launchers are ahead in places, and we say where. Feature notes about other products reflect what we know at the time of writing; check their sites for the latest.

## At a glance

| | Gjallarhorn | Steam Big Picture | Playnite | GOG Galaxy 2.0 | LaunchBox / Big Box | Heroic |
|---|---|---|---|---|---|---|
| Free | **Yes** | Yes | **Yes** | Yes | Core free; Big Box needs Premium | **Yes** |
| Open source | **Yes (MIT)** | No | **Yes** | No | No | **Yes** |
| Controller-first full-screen mode | **Yes** | **Yes** | Yes (Fullscreen mode) | No | Yes (Big Box) | No |
| Steam + Epic + GOG + Ubisoft + EA + Battle.net in one library | **Built in, no logins** | Steam (+ manual shortcuts) | Yes, via plugins | Yes, via integrations | Mostly emulation / imported | Epic, GOG, Amazon |
| Emulator detection, ROM scan, auto cover art | **Built in** | Manual shortcuts | Via plugins | Limited | **Excellent** (large metadata database) | No |
| Menu over a *running* game or emulator from the controller | **Hold Back + Start, anywhere** | Guide button (Steam overlay, Steam games) | No | No | Limited | No |
| Steam friends and chat on a controller | **Yes** | Yes | No | Friends list only | No | No |
| Steam Workshop browser | **Couch and desktop** | In Steam | No | No | No | No |
| Per-game launch profiles and a menu layout per game | **Yes** | Steam launch options | Via scripts | No | Per-game settings | Per-game settings |
| Play reports (GPU temperature, use, power, VRAM per session) | **Yes** | No | Playtime only | Playtime | Playtime | Playtime |
| Per-game performance panel (power throttling, core preference, notes) | **Yes** | No | No | No | No | Wine / proton options |
| Themes, fonts, animated backgrounds, 12 launch screens | **Yes** | Limited | **Yes (large theme ecosystem)** | Limited | Yes (themes) | Limited |
| Plugin / extension ecosystem | Not yet | No | **Large** | Moderate | Yes | Moderate |
| Platforms | Windows | Windows, macOS, Linux | Windows | Windows, macOS | Windows | Windows, macOS, Linux |

## Where Gjallarhorn is genuinely different

1. **One menu on top of everything.** Hold **Back + Start** and you get resume, home, friends, downloads, volume, screenshot, clip recording and close game, on top of a running game, an emulator or the desktop. Steam's overlay does a version of this only inside Steam games, and only through the Guide button that Steam itself owns.
2. **No store logins.** Gjallarhorn reads what your launchers already installed, so there is no account to connect, no token to store and nothing to break when a store changes its API.
3. **A real couch experience for non-Steam games.** Friends, chat, downloads, Workshop, screenshots, clips and an on-screen keyboard all work from a controller in one place.
4. **It cares about the PC as much as the UI.** The right GPU on hybrid laptops, Windows power-throttling opt-out, optional performance-core preference on hybrid CPUs, and per-session GPU reports. See [PERFORMANCE.md](PERFORMANCE.md) for what is proven and what is placebo.
5. **It is yours.** Open source (MIT), local data only, no telemetry.

## Where others are ahead

- **Playnite** has a much bigger plugin and theme ecosystem, a long track record, and far wider import coverage through community extensions. If you want to script and extend your launcher, Playnite is the safer choice today.
- **LaunchBox / Big Box** has an unmatched emulation metadata database (box art, videos, manuals, scraping) and years of polish for retro collections.
- **Steam** owns downloads, DRM, cloud saves, Remote Play and Steam Input. Gjallarhorn is a front end and does not replace any of that.
- **Heroic** runs on Linux and macOS and installs Epic / GOG games without the official launchers.
- **GOG Galaxy** merges friends lists and achievements across stores.

## Honest limits

Windows only (it uses PowerShell, XInput and Win32). The installer is not code-signed yet, so SmartScreen warns once. There is no plugin system yet. Some behaviour (the in-game menu with every controller, one-press Workshop subscribe, the Epic install flow) has had less real-world testing than we would like: please [open an issue](https://github.com/KaeghanG/gjallarhorn/issues) if something misbehaves.
