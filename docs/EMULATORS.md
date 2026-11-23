# Emulators

This page documents Gjallarhorn's emulation support: which systems and emulators are available, how detection works, ROM scanning, cover art, and troubleshooting.

## How detection works

Gjallarhorn looks for each emulator in several places:

1. **Managed folder** — if Gjallarhorn installed the emulator itself, a `gjallarhorn.json` metadata file lives in `<repo>/emulators/<id>/` (during development) or `%APPDATA%\Gjallarhorn\emulators\<id>\` (in the packaged app). Its presence confirms an install.
2. **User-created folders** — common paths such as `%USERPROFILE%\Emulators\<name>\` are checked.
3. **WinGet symlinks** — `%LOCALAPPDATA%\Microsoft\WinGet\Links\<exe>` (WinGet creates a symlink when an app is installed via winget).
4. **Program Files** — canonical install paths like `C:\Program Files\...`.

Detection is automatic; no manual configuration is needed. The Emulators page in Gjallarhorn shows which emulators are found, their version numbers, and whether an update is available.

## Supported systems

Each row lists the system name, recognised ROM file extensions, the default emulator used to play it, and the cover-art source.

| System | ROM extensions | Default emulator | Cover-art source |
|---|---|---|---|
| Nintendo Switch | `.nsp`, `.xci` | Eden | titledb (public `blawar/titledb` index) |
| Wii U | `.wua`, `.wux`, `.wud`, `.rpx` | Cemu | none |
| Wii | `.wbfs` | Dolphin | libretro-thumbnails (`Nintendo_-_Wii`) |
| GameCube | `.gcm`, `.rvz`, `.gcz`, `.ciso` | Dolphin | libretro-thumbnails (`Nintendo_-_GameCube`) |
| Nintendo 3DS | `.3ds`, `.cci`, `.cxi`, `.cia` | Azahar | libretro-thumbnails (`Nintendo_-_Nintendo_3DS`) |
| Nintendo DS | `.nds` | melonDS | libretro-thumbnails (`Nintendo_-_Nintendo_DS`) |
| PSP | `.cso` | PPSSPP | libretro-thumbnails (`Sony_-_PlayStation_Portable`) |
| PlayStation 2 | `.iso` | PCSX2 | libretro-thumbnails (`Sony_-_PlayStation_2`) |
| PlayStation | `.cue`, `.m3u`, `.pbp` | DuckStation | libretro-thumbnails (`Sony_-_PlayStation`) |
| Xbox 360 | `.xex` | Xenia Canary | libretro-thumbnails (`Microsoft_-_Xbox_360`) |
| Xbox (original) | `.xiso` | xemu | libretro-thumbnails (`Microsoft_-_Xbox`) |
| Dreamcast | `.cdi`, `.gdi` | Flycast | libretro-thumbnails (`Sega_-_Dreamcast`) |
| Nintendo 64 | `.z64`, `.n64`, `.v64` | RetroArch (mupen64plus\_next) | libretro-thumbnails (`Nintendo_-_Nintendo_64`) |
| Super Nintendo | `.sfc`, `.smc` | RetroArch (snes9x) | libretro-thumbnails (`Nintendo_-_Super_Nintendo_Entertainment_System`) |
| NES | `.nes` | RetroArch (mesen) | libretro-thumbnails (`Nintendo_-_Nintendo_Entertainment_System`) |
| Game Boy Advance | `.gba` | RetroArch (mgba) | libretro-thumbnails (`Nintendo_-_Game_Boy_Advance`) |
| Game Boy Color | `.gbc` | RetroArch (gambatte) | libretro-thumbnails (`Nintendo_-_Game_Boy_Color`) |
| Game Boy | `.gb` | RetroArch (gambatte) | libretro-thumbnails (`Nintendo_-_Game_Boy`) |
| Genesis / Mega Drive | `.md`, `.gen`, `.smd` | RetroArch (genesis\_plus\_gx) | libretro-thumbnails (`Sega_-_Mega_Drive_-_Genesis`) |

> For systems that use RetroArch, the listed core is the specific libretro core Gjallarhorn loads. The core file must exist in `<RetroArch folder>\cores\`.

## Emulators

| Emulator | Systems handled | Notes |
|---|---|---|
| Eden | Nintendo Switch | Community continuation of yuzu; installed from `git.eden-emu.dev` (Forgejo). |
| RPCS3 | PlayStation 3 | Installed from GitHub (`RPCS3/rpcs3-binaries-win`). Output is a `.7z`. |
| shadPS4 | PlayStation 4 | Installed from GitHub (`shadps4-emu/shadPS4`). |
| PCSX2 | PlayStation 2 | Installed from GitHub (`PCSX2/pcsx2`). Creates a `portable.txt` in the install folder for portable mode. |
| DuckStation | PlayStation 1 | Installed from GitHub (`stenzek/duckstation`). Creates a `portable.txt` in the install folder for portable mode. |
| PPSSPP | PSP | Installed from GitHub (`hrydgard/ppsspp`). |
| Cemu | Wii U | Installed from GitHub (`cemu-project/Cemu`). |
| xemu | Xbox (original) | Installed from GitHub (`xemu-project/xemu`). |
| Xenia Canary | Xbox 360 | Installed from GitHub (`xenia-canary/xenia-canary-releases`); the nightly build. |
| Vita3K | PlayStation Vita | Installed from GitHub (`Vita3K/Vita3K`). |
| melonDS | Nintendo DS | Installed from GitHub (`melonDS-emu/melonDS`). |
| Azahar | Nintendo 3DS | Installed from GitHub (`azahar-emu/azahar`); the merged Citra successor. |
| Flycast | Dreamcast / NAOMI | Installed from GitHub (`flyinghead/flycast`). |
| RetroArch | N64, SNES, NES, GBA, GBC, GB, Genesis | Installed via libretro's buildbot (`buildbot.libretro.com`). Users must also download individual cores via RetroArch's Online Updater → Core Downloader if a core is missing. |
| Dolphin | Wii, GameCube | No managed installer (no GitHub releases). Users install manually from [dolphin-emu.org](https://dolphin-emu.org). |

## ROM scanning

Gjallarhorn scans folders the user selects through the Emulators page:

- Recurses up to **5 directory levels** deep.
- Stops early if more than **8 000 ROMs** are found across all watched folders.
- Matches each file by its **extension** first; shared extensions (`.iso`, `.chd`, `.bin`, `.zip`, `.7z`) are disambiguated using the **folder name** as a hint (e.g. a folder named "PS2" or "ps2" is matched to PlayStation 2).
- For `.cue`/`.m3u` playlists, the raw `.bin` file inside them is skipped to avoid duplicates.
- Each ROM entry stores: a base64 URL-safe id derived from its path, full path, file name, a cleaned title (strips extensions and parenthesised region tags), system, and file size.

## Cover art

### libretro-thumbnails

For systems that have a RetroArch core, Gjallarhorn fetches box art from the public [libretro-thumbnails](https://github.com/libretro-thumbnails) GitHub repositories:

1. On first run for a given system it downloads the directory listing of `<repo>/Named_Boxarts/` and caches the file names (with a 14-day TTL).
2. ROM titles are matched against the image file names using normalised strings (lowercased, strips punctuation, `&` → `and`, removes leading "The ").
3. When multiple matches exist (e.g. USA, World/Europe versions), **USA** is preferred, then **World**, then **Europe**.

### Nintendo Switch — titledb

No libretro set exists for Switch. Instead Gjallarhorn downloads the public titledb index (`blawar/titledb`) once (~90 MB) and caches a compressed name-to-image map under the app's `thumbs/` folder. The cache refreshes every 30 days. Cover art is matched by:

- The ROM file name (normalised, as above).
- A 16-character title ID extracted from the file name (format `[XXXXXXXXXXXXXXXX]`).

### No cover art

Some systems (Wii U in particular) have no cover-art source; they display a placeholder instead.

## Emulator installation

Gjallarhorn can download and install every emulator listed above except Dolphin (which is installed by hand):

1. Downloads the latest Windows x64 build from the project's official release page (GitHub, Forgejo, or libretro buildbot).
2. Extracts to a managed folder using 7-Zip (`C:\Program Files\7-Zip\7z.exe`) — or falls back to the system `tar`.
3. Writes a `gjallarhorn.json` metadata file tracking the installed version and executable path.
4. For PCSX2 and DuckStation, creates a `portable.txt` next to the executable so settings stay local.

The managed folder lives at:

- **Dev / git checkout**: `<repo>/emulators/<id>/` (gitignored).
- **Packaged app**: `%APPDATA%\Gjallarhorn\emulators\<id>\`.

## Background update checks

When Gjallarhorn runs, it periodically (every 6 hours) checks for new versions of any emulator that was installed through its own installer. Updates are surfaced on the Emulators page with release notes and a link to the release page. Users may also trigger a manual check.

## Troubleshooting

- **Emulator not detected** — verify the executable exists at one of the standard paths shown in the table above, or use the Emulators page to install it directly.
- **RetroArch core missing** — open RetroArch → *Online Updater* → *Core Downloader*, then find and install the required core (e.g. "mupen64plus Next" for N64).
- **Dolphin not auto-installed** — Dolphin does not distribute through GitHub releases; install manually from [dolphin-emu.org](https://dolphin-emu.org) in a location Gjallarhorn can scan, or add the folder to your ROM library paths.
- **Switch cover art missing** — titledb may not have an entry for a lesser-known title. Check that the ROM file name follows common conventions (e.g. `[0100000000000000] Game Name.nsp`).
- **Cover art is stale** — the libretro-thumbnails index is cached for 14 days and titledb for 30 days; force a refresh by deleting the cache file (`<userData>\thumbs\<repo>.json` or `switch-index.json`).
- **ROMs appear under the wrong system** — check the folder name used as a hint. You can also rename the ROM file to use a recognised extension (see the extensions table).
- **A emulator install fails** — ensure 7-Zip is installed at one of the standard locations (`C:\Program Files\7-Zip\7z.exe` or `C:\Program Files (x86)\7-Zip\7z.exe`). The download may also fail if your network blocks GitHub/Forgejo.

> Gjallarhorn **never** downloads ROMs, BIOS files, firmware, or product keys. It only reads folders the user picks and launches emulators with the ROM path as an argument.
