# Getting started

A walkthrough from download to your first couch-mode session. About ten minutes.

## 1. Install

1. Download `Gjallarhorn-Setup-x.y.z.exe` from the [latest release](https://github.com/KaeghanG/gjallarhorn/releases/latest).
2. Run it. Windows SmartScreen may say "Windows protected your PC" because the installer is **not code-signed yet**. Click **More info → Run anyway**.
3. Choose an install folder (it installs for your user; no administrator rights are needed) and finish. Gjallarhorn starts, and also lives in the system tray so the quick-launcher hotkey keeps working.

**Requirements:** Windows 10 or 11. For Steam games, Steam must be installed and running; for Epic games, the Epic Games Launcher. Gjallarhorn is a front end: games still start through their own stores.

## 2. First launch

A short welcome screen asks a few questions (such as your region for prices). After that, Gjallarhorn scans your PC and fills the **Library** with everything it finds:

| Store | How it's found |
|---|---|
| Steam | Every Steam library folder, from Steam's own app manifests |
| Epic Games | The classic launcher's manifests **and** the newer per-user launcher's install list |
| GOG, Ubisoft Connect, EA app, Battle.net | Their installers' entries in the Windows registry |
| Riot (League and others) | Riot's own client install file |
| Non-Steam shortcuts | Your Steam `shortcuts.vdf` |
| Custom | Games you add yourself (Library → *Add a game*) |

If a game is missing, click **Rescan** on the Library page.

## 3. Optional but recommended: a Steam Web API key

A free key unlocks the *Not installed* row (games you own but have not installed) and the **Workshop browser**.

1. Open <https://steamcommunity.com/dev/apikey>, sign in, enter any domain name (for example `localhost`), and copy the key.
2. In Gjallarhorn open **Settings → Store accounts** and paste it. It is stored only on your PC.
3. Make sure your Steam profile's **Game details** privacy is **Public**, otherwise Steam hides your owned games from the API.

## 4. Enter couch mode

1. Plug in a controller (Xbox or PlayStation; wired, Bluetooth or the Xbox wireless adapter all work).
2. Click **Couch mode** at the bottom of the desktop sidebar, **or** hold **Back + Start** (Share + Options on PlayStation) for about a second from anywhere.
3. Move with the stick or D-pad, **A** selects, **B** goes back, **LB / RB** switch tabs. Press **Left** on the first tile to open the sidebar. The full list is in [CONTROLS.md](CONTROLS.md).

Couch mode takes over the screen, hides the Windows taskbar and puts itself above Steam. Leave it with **System tab → Exit couch mode** or the sidebar **Power → Exit couch mode**.

## 5. Play something

Highlight a game and press **A**. You get an animated launch screen, then your game. While it runs, **hold Back + Start** for the in-game menu (resume, Gjallarhorn home, friends, volume, screenshot, close game, power).

When you quit the game, Gjallarhorn comes back to the front on its own and a **play report** is saved.

## 6. Sign in to Steam chat (once)

Open the sidebar → **Friends** → **Connect**. Scan the QR code with the **Steam mobile app** and approve. Your friends appear with online status and the game they're playing. Gjallarhorn remembers the sign-in, and **chat history is saved locally**.

## 7. Add emulators and ROMs

1. Install your emulators however you like (Eden, Dolphin, PCSX2, RPCS3, Cemu, DuckStation, RetroArch...). Gjallarhorn detects them; the Emulators page and **Settings → Emulators** show where it looks.
2. On the **Retro** page click **Add folder** and choose the folders that contain your ROMs.
3. Cover art is fetched automatically. Press **A** on a ROM to launch it with the right emulator.

Gjallarhorn never downloads ROMs, BIOS files, firmware or keys. See [EMULATORS.md](EMULATORS.md) for supported systems.

## 8. Make it yours

**Settings → Theme & background** has 12 one-click presets, live backgrounds (fire, embers, aurora, your own video), accent colour, dimming and blur. **Fonts** changes the text and heading fonts and the text size. **Couch mode intro** picks the splash screen. Full reference: [SETTINGS.md](SETTINGS.md).

## Where your data lives

Everything is stored locally in `%APPDATA%\Gjallarhorn` (settings, saved chat history, play reports, cached cover art, a debug log). There is no account, analytics or telemetry. To reset Gjallarhorn completely, close it and delete that folder.

## Next steps

- [Feature guide](FEATURES.md) · [Controls](CONTROLS.md) · [FAQ](FAQ.md) · [Troubleshooting](TROUBLESHOOTING.md)
