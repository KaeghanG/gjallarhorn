# Frequently asked questions

## The basics

**What is Gjallarhorn?**
A free, open-source Windows game launcher with a Big-Picture-style couch mode. It shows your Steam, Epic, GOG, Ubisoft, EA, Battle.net and Riot games plus emulated games in one controller-friendly interface.

**Does it replace Steam?**
It replaces Steam's *front end* (Big Picture), not Steam itself. Steam games still launch, update and run through Steam, so Steam must be running. Gjallarhorn adds the things Big Picture lacks: other stores, emulators, themes, fonts, animated backgrounds, play reports and a menu you can open anywhere.

**Why the name?**
Gjallarhorn is Heimdall's horn in Norse myth, and the legendary rocket launcher in Destiny. The author loved "the best launcher named Gjallarhorn" so much that they built a fire launcher with the same name. It is an independent fan project, not affiliated with Bungie, Valve, Epic or any store, and it uses no Bungie assets.

**Is it free? Is it safe?**
Yes, it is free and MIT-licensed, and the source is public so you can read exactly what it does. It has no account, no ads and no telemetry. The installer is **not code-signed yet**, so Windows SmartScreen shows a warning the first time.

**Which Windows versions work?**
Windows 10 and 11. It uses PowerShell, XInput and Win32, so macOS and Linux (including SteamOS) are not supported.

## Games and stores

**Do I need to log in to Epic, GOG, Ubisoft, EA or Battle.net inside Gjallarhorn?**
No. Gjallarhorn reads what those launchers already installed on your PC, and starts games through them. You stay signed in to each launcher as usual.

**Why is a game missing from my library?**
Click **Rescan** on the Library page. Games must be installed through their normal launcher. Epic's new per-user launcher is supported; very old or portable installs may need to be added with **Add a game**.

**How do I install a game I own?**
Open the *Not installed* row and press **A**. Steam games open Gjallarhorn's install screen; if Steam does not start the download on its own within a few seconds, Gjallarhorn opens Steam's own install dialog and you click Install there. Epic games open the Epic launcher's install page. Fortnite is always listed for Epic.

**Does it work with anti-cheat games?**
Yes. Games are launched by their own store, exactly as if you clicked Play there; Gjallarhorn does not inject into or modify games.

**What about the GPU on my laptop?**
Gjallarhorn sets Windows' *High performance* GPU preference for itself and for each game and emulator it launches, so a hybrid laptop uses the discrete GPU.

## Couch mode and controllers

**Which controllers work?**
Xbox controllers (any XInput pad) and PlayStation DualSense/DualShock. Generic pads work to the extent Windows exposes them. Battery level is shown where Windows reports it (not for PlayStation pads).

**How do I open the menu while a game is running?**
Hold **Back + Start** (Share + Options on PlayStation) for about a second. It works with any controller plugged in, in a game, on the desktop, or over an emulator.

**Why not the Home / Guide button?**
Steam grabs the Guide button for itself (it opens Steam's Big Picture or overlay). Back + Start is something Steam does not intercept, so it always works. Gjallarhorn also closes Steam's Big Picture window if the Guide button opens it.

**Why does Steam ask about "Steam Input" or controller setup for some games?**
That prompt comes from Steam, not Gjallarhorn. Steam asks once per game and remembers your answer; you can also turn it off in Steam's controller settings.

**Does it hide the taskbar?**
Yes, while couch mode is open, and it shows it again when you leave couch mode or close the app.

## Friends, Workshop, achievements

**Do I need the Steam mobile app?**
Only once, to sign in to Steam chat by scanning a QR code.

**Why is the Workshop empty for my game?**
Either the game has no Workshop (many do not; Elden Ring is one), or you have not added your Steam Web API key (Settings → Store accounts).

**Subscribing opens Steam instead of doing it in one press. Why?**
One-press subscribe needs your Steam chat sign-in. Without it, or if Steam refuses, Gjallarhorn opens the item in Steam as a fallback. Steam does the actual download, usually the next time it checks.

**Do achievements need an API key?**
No. They come from your public Steam profile; set your profile's *Game details* to Public.

## Emulators

**Does it include ROMs, BIOS or firmware?**
Never. Gjallarhorn does not download, host or help find ROMs, BIOS files, firmware or keys. Bring your own legally dumped copies.

**Where does the cover art come from?**
The libretro-thumbnails project for most systems, and the public Nintendo title database for Switch games. Both are cached on your PC.

**My Switch game won't start or the Mii maker hangs.**
That is the emulator, not Gjallarhorn. Make sure your Switch firmware and `prod.keys` are from the same console and the same firmware generation (new firmware needs a matching, newer key file).

## Privacy

**What data leaves my PC?**
Only normal requests to services you use: Steam (library, Workshop, store), CheapShark (prices), libretro-thumbnails and a GitHub-hosted Switch title list (cover art). Your settings, chat history and play reports stay in `%APPDATA%\Gjallarhorn`.

**Where are my API keys stored?**
Locally, in the app's settings file. Do not share that folder.

## Contributing

**How can I help?**
Read [CONTRIBUTING.md](../CONTRIBUTING.md) and [ARCHITECTURE.md](ARCHITECTURE.md), then open an issue or pull request. Bug reports with the steps to reproduce and your Windows version are the most useful thing you can send.
