# Contributing to Gjallarhorn

Thanks for helping! Gjallarhorn is a Windows Electron app (React + Vite). Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a map of the code.

## Set up
```bash
git clone https://github.com/KaeghanG/gjallarhorn.git
cd gjallarhorn
npm install
npm run dev        # Electron + Vite with hot reload
npm run package    # build the Windows installer into release/
```
Node.js 20+ and Windows 10/11 are required.

## Ground rules
- **Test in both modes.** Check the desktop app *and* couch mode (with a controller or the keyboard shortcuts in [docs/CONTROLS.md](docs/CONTROLS.md)).
- **Keep it local-first.** No telemetry, accounts or tracking. New network calls must go through `electron/lib/net.cjs` (it has a host allow-list); add the host there and mention it in the PR.
- **Never commit secrets or personal data:** API keys, your Steam ID, local paths, screenshots with your name or friends.
- **No piracy support.** Do not add code that downloads or locates ROMs, BIOS files, firmware or keys, and do not add copyrighted game assets.
- **Never hard-code a machine.** Anything about hardware (GPU, monitors, paths) must be detected at run time.
- **Couch mode pages** receive a `bind(fn)` prop and must handle `up/down/left/right/a/b/x/y/lb/rb`; always handle `b` to go back.
- **New IPC calls:** add the handler with `handle('channel', fn)` in `electron/main.cjs`, expose it in `electron/preload.cjs` under a unique key (a duplicate key silently overrides another), and call it from React through `window.gjallar`.

## Pull requests
1. Fork, create a branch, make focused changes.
2. Run `npm run build` to make sure it compiles.
3. Describe what changed and how you tested it. Screenshots are welcome.
4. Keep the tone of the UI: short, friendly, no jargon.

## Reporting bugs
Open an issue with the steps to reproduce, your Windows version, and the end of `%APPDATA%\Gjallarhorn\launch-debug.log` (remove private info first).
