// Emulator catalog. First draft written by the local Ollama agent (qwen3.6:35b), checked and corrected by Claude.
export const EMULATORS = [
  {
    "id": "eden",
    "name": "Eden",
    "system": "Nintendo Switch",
    "maker": "Nintendo",
    "year": 2017,
    "accent": "#e60012",
    "blurb": "Community-driven continuation of yuzu, and the actively maintained Switch emulator.",
    "site": "https://eden-emu.dev",
    "github": null,
    "paths": [
      "%USERPROFILE%\\Emulators\\Eden\\eden.exe"
    ]
  },
  {
    "id": "rpcs3",
    "name": "RPCS3",
    "system": "PlayStation 3",
    "maker": "Sony",
    "year": 2006,
    "accent": "#3b82f6",
    "blurb": "A research-oriented PlayStation 3 emulator written in C++.",
    "site": "https://rpcs3.net",
    "github": "RPCS3/rpcs3",
    "paths": [
      "%USERPROFILE%\\Emulators\\RPCS3\\rpcs3.exe"
    ]
  },
  {
    "id": "dolphin",
    "name": "Dolphin",
    "system": "GameCube / Wii",
    "maker": "Nintendo",
    "year": 2002,
    "accent": "#7c6cf0",
    "blurb": "The GameCube and Wii emulator for Windows, macOS, and Linux.",
    "site": "https://dolphin-emu.org",
    "github": "dolphin-emu/dolphin",
    "paths": [
      "%USERPROFILE%\\Emulators\\Dolphin\\Dolphin-x64\\Dolphin.exe"
    ]
  },
  {
    "id": "shadps4",
    "name": "shadPS4",
    "system": "PlayStation 4",
    "maker": "Sony",
    "year": 2013,
    "accent": "#1d4ed8",
    "blurb": "An experimental PlayStation 4 emulator focused on game compatibility.",
    "site": "https://shadps4.com",
    "github": "shadps4-emu/shadPS4",
    "paths": [
      "%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\shadPS4.exe",
      "C:\\Program Files\\shadPS4\\shadPS4.exe"
    ]
  },
  {
    "id": "pcsx2",
    "name": "PCSX2",
    "system": "PlayStation 2",
    "maker": "Sony",
    "year": 2000,
    "accent": "#60a5fa",
    "blurb": "The fast and portable PlayStation 2 emulator.",
    "site": "https://pcsx2.net",
    "github": "PCSX2/pcsx2",
    "paths": [
      "C:\\Program Files\\PCSX2\\pcsx2-qt.exe"
    ]
  },
  {
    "id": "duckstation",
    "name": "DuckStation",
    "system": "PlayStation 1",
    "maker": "Sony",
    "year": 1994,
    "accent": "#2563eb",
    "blurb": "A fast PlayStation 1 emulator with a focus on playability and speed.",
    "site": "https://github.com/stenzek/duckstation",
    "github": "stenzek/duckstation",
    "paths": [
      "%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\DuckStation.exe",
      "C:\\Program Files\\DuckStation\\duckstation-qt-x64-release.exe"
    ]
  },
  {
    "id": "ppsspp",
    "name": "PPSSPP",
    "system": "PlayStation Portable",
    "maker": "Sony",
    "year": 2004,
    "accent": "#3b82f6",
    "blurb": "A fast and portable PlayStation Portable emulator.",
    "site": "https://www.ppsspp.org",
    "github": "hrydgard/ppsspp",
    "paths": [
      "C:\\Program Files\\PPSSPP\\PPSSPPWindows64.exe"
    ]
  },
  {
    "id": "cemu",
    "name": "Cemu",
    "system": "Wii U",
    "maker": "Nintendo",
    "year": 2012,
    "accent": "#00a2d6",
    "blurb": "A Wii U emulator with a focus on compatibility and performance.",
    "site": "https://cemu.info",
    "github": "cemu-project/Cemu",
    "paths": [
      "%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\Cemu.exe",
      "C:\\Program Files\\Cemu\\Cemu.exe"
    ]
  },
  {
    "id": "xemu",
    "name": "xemu",
    "system": "Xbox (original)",
    "maker": "Microsoft",
    "year": 2002,
    "accent": "#7fbf3f",
    "blurb": "An original Xbox emulator for Windows and Linux.",
    "site": "https://xemu.app",
    "github": "xemu-project/xemu",
    "paths": [
      "%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\xemu.exe",
      "C:\\Program Files\\xemu\\xemu.exe"
    ]
  },
  {
    "id": "xenia-canary",
    "name": "Xenia Canary",
    "system": "Xbox 360",
    "maker": "Microsoft",
    "year": 2005,
    "accent": "#107c10",
    "blurb": "The nightly build of the Xbox 360 emulator.",
    "site": "https://github.com/xenia-canary/xenia-canary",
    "github": "xenia-canary/xenia-canary",
    "paths": [
      "%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\xenia_canary.exe"
    ]
  },
  {
    "id": "vita3k",
    "name": "Vita3K",
    "system": "PlayStation Vita",
    "maker": "Sony",
    "year": 2011,
    "accent": "#d946ef",
    "blurb": "A PlayStation Vita experimental emulator for Windows.",
    "site": "https://vita3k.org",
    "github": "Vita3K/Vita3K",
    "paths": [
      "%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\Vita3K.exe",
      "%LOCALAPPDATA%\\Microsoft\\WinGet\\Packages\\Vita3K.Vita3K_Microsoft.Winget.Source_8wekyb3d8bbwe\\Vita3K.exe"
    ]
  },
  {
    "id": "melonds",
    "name": "melonDS",
    "system": "Nintendo DS",
    "maker": "Nintendo",
    "year": 2004,
    "accent": "#c9ccd4",
    "blurb": "A fast, accurate and well-developed Nintendo DS emulator.",
    "site": "https://melonds.kuribo64.net",
    "github": "melonDS-emu/melonDS",
    "paths": [
      "%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\melonDS.exe",
      "C:\\Program Files\\melonDS\\melonDS.exe"
    ]
  },
  {
    "id": "azahar",
    "name": "Azahar",
    "system": "Nintendo 3DS",
    "maker": "Nintendo",
    "year": 2011,
    "accent": "#ce181e",
    "blurb": "The merged successor to the Citra forks: actively maintained 3DS emulation.",
    "site": "https://azahar-emu.org",
    "github": "azahar-emu/azahar",
    "paths": [
      "%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\Azahar.exe",
      "C:\\Program Files\\Azahar\\Azahar.exe"
    ]
  },
  {
    "id": "retroarch",
    "name": "RetroArch",
    "system": "Multi-system",
    "maker": "Multi",
    "year": 2000,
    "accent": "#9aa4b8",
    "blurb": "The retro-gaming orchestrator for cores and emulators across many platforms.",
    "site": "https://www.retroarch.com",
    "github": "libretro/RetroArch",
    "paths": [
      "C:\\RetroArch-Win64\\retroarch.exe"
    ]
  },
  {
    "id": "flycast",
    "name": "Flycast",
    "system": "Dreamcast / NAOMI",
    "maker": "Sega",
    "year": 1998,
    "accent": "#f97316",
    "blurb": "Dreamcast, NAOMI and Atomiswave emulator with great upscaling.",
    "site": "https://github.com/flyinghead/flycast",
    "github": "flyinghead/flycast",
    "paths": [
      "%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\flycast.exe",
      "C:\\Program Files\\flycast\\flycast.exe"
    ]
  }
];
