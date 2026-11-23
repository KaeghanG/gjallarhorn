# Troubleshooting

Find your symptom, try the fixes in order. If none help, open an issue and include your Windows version and the last lines of `%APPDATA%\Gjallarhorn\launch-debug.log`.

## Install and start-up

| Symptom | Fix |
|---|---|
| SmartScreen says "Windows protected your PC" | The installer is not code-signed yet. **More info → Run anyway.** |
| Antivirus flags the app | Gjallarhorn starts a small PowerShell process to read controllers and manage the taskbar. Some antivirus tools dislike that. Add `%LOCALAPPDATA%\Programs\Gjallarhorn` to the exclusions, or build from source and review the code. |
| App won't start a second time | It is a single-instance app and lives in the tray. Look for the horn icon near the clock and click it. |
| Everything looks empty | Close Gjallarhorn, delete `%APPDATA%\Gjallarhorn\settings.json` only if it is corrupt, and restart. (Your games are not stored there.) |

## Library

| Symptom | Fix |
|---|---|
| A Steam game is missing | Click **Rescan**. Check the game is fully installed in Steam. |
| An Epic game is missing | Open the Epic Games Launcher once and let it finish loading its library, then **Rescan**. |
| "Not installed" row is empty | Add your Steam Web API key (Settings → Store accounts) and set your Steam profile's *Game details* to Public. |
| Installing from Not installed just says "queued" | Steam did not notice the request. Within a few seconds Gjallarhorn opens Steam's install dialog; click **Install** there. |

## Controllers and couch mode

| Symptom | Fix |
|---|---|
| Controller not detected | Reconnect it, then open **Sidebar → Controllers** to see what Windows reports. PlayStation pads must be connected before the page loads. |
| Pressing the Home / Guide button opens Steam's Big Picture | Gjallarhorn closes that window within a fraction of a second and brings itself back. To stop it for good, turn off *Use the Guide button to focus Steam* in Steam's controller settings. |
| The Windows taskbar still shows | Leave couch mode and re-enter it. If it was left hidden after a crash, restart Gjallarhorn: it always restores the taskbar on start-up. |
| Hold Back + Start does nothing | The menu needs a controller that Windows sees as XInput or a PlayStation pad. Check **Settings** for the controller shortcut setting, and make sure the in-game menu option is on. |
| Buttons do the wrong thing | Open **Controllers → button test (X)** to see which button Windows reports. |
| Steam shows a "controller setup" prompt when launching a game | That prompt is Steam's own and appears once per game. Tick *Don't ask again* in it. |

## Games

| Symptom | Fix |
|---|---|
| A game starts on the wrong GPU | Gjallarhorn sets *High performance* for games it launches. Check **Windows Settings → System → Display → Graphics** to confirm the game's entry. |
| Resume doesn't bring the game to the front | Some exclusive-fullscreen games ignore focus requests. Switch the game to borderless fullscreen. |
| Close game does nothing | It asks the game to close, then force-closes it after 6 seconds. If the game was started outside Gjallarhorn, it is not tracked; use Task Manager. |
| No play report after a session | Reports are recorded only for games started from Gjallarhorn, and GPU numbers need an NVIDIA GPU. |
| No save backups, or "No save location known" | PCGamingWiki has no entry for this game, or the save folder has not been created yet (play once first). Check the path shown on the game's **Saves & playtime** panel. |
| Restore button is missing for a backup I copied in | Restore needs the backup's matching `.zip.json` file (next to the `.zip`, same name) — Gjallarhorn writes that itself and reads it to know where to restore to. See [Saves and backups](FEATURES.md#saves-and-backups) for moving backups to a new PC. |

## Friends and Workshop

| Symptom | Fix |
|---|---|
| Friends page asks to connect every time | Make sure Steam is running and approve the QR login in the Steam mobile app. |
| Friends show "Playing a game" without a name | Names are looked up from the Steam store; give it a moment, or the game has no store page. |
| Workshop is empty | The game may have no Workshop, or no API key is set. |
| Subscribe opened Steam instead | Sign in to Steam chat in Gjallarhorn for one-press subscribe; otherwise press Subscribe in Steam. |
| Subscribed item not downloaded | Steam downloads Workshop items when it next checks; restart Steam to force it. |

## Emulators and covers

| Symptom | Fix |
|---|---|
| Emulator not found | Open **Settings → Emulators** to see the folder Gjallarhorn scans, and put or install the emulator there. |
| No cover art for a ROM | Art matches by game name. Rename the file to the plain title (for example `Mario Kart 8 Deluxe.xci`). Switch games also match by the title ID in brackets. The first Switch lookup downloads a large title list once, so give it a minute. |
| Switch game hangs on a Mii maker or applet screen | That is the emulator: check your Switch firmware and `prod.keys` match each other. |

## Appearance

| Symptom | Fix |
|---|---|
| Animated background is slow | **Settings → Theme & background**: choose Aurora or a colour gradient, or turn on **Reduce motion**. |
| Fonts look unchanged | The chosen font must be installed on your PC; otherwise Windows falls back to the default. |
| Splash plays every time and you don't want it | **Settings → Couch mode intro → None**. |

## Still stuck?

Open an issue at <https://github.com/KaeghanG/gjallarhorn/issues> with: what you did, what you expected, what happened, your Windows version, and the end of `launch-debug.log`. **Remove anything private** (API keys, usernames) before pasting.
