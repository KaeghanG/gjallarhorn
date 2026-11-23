# Gjallarhorn — Architecture Overview

A Windows desktop game hub built with **Electron + React 19 + Vite**. Unifies games from Steam, Epic, GOG, Ubisoft, EA, Battle.net, Riot, and emulators into one controller-friendly interface. Ships as an unsigned NSIS installer on Windows 10/11.

---

## Process Model

Gjallarhorn runs a **single Electron window** (`electron/main.cjs`) with a React renderer served by Vite (dev) or `dist/index.html` (production). A small "quick launcher" window appears as an always-on-top overlay; an in-game menu window floats transparently over the game's monitor. No workers or separate browser views. Single-instance lock (`app.requestSingleInstanceLock()`) — launching again brings the existing window forward.

---

## IPC Pattern

**Main process** wraps handlers to return `{ data }` or `{ error }` (never leaks stacks):

```js
// main.cjs
const handle = (ch, fn) =>
  ipcMain.handle(ch, async (_e, ...args) => {
    try { return { data: await fn(...args) }; }
    catch (e)   { return { error: e.message || String(e) }; }
  });

handle('library:scan', () => library.scanAll(settings.load().customGames));
```

**Preload** unwraps and exposes on `window.gjallar`:

```js
// preload.cjs
const call = async (ch, ...args) => {
  const r = await ipcRenderer.invoke(ch, ...args);
  if (r.error) throw new Error(r.error);
  return r.data;
};
contextBridge.exposeInMainWorld('gjallar', { scanLibrary: () => call('library:scan') });
```

**Events flow bottom-up** via `win.webContents.send(channel, payload)`. Preload subscribes and returns an unsubscribe function (`onSession`, `onPadState`, etc.).

---

## Folder Map

| Path | Role |
|------|------|
| `electron/main.cjs` | Entry; window, IPC handlers, tray, padwatch, chat |
| `electron/preload.cjs` | `contextBridge → window.gjallar.*` API surface |
| `electron/lib/net.cjs` | Fetch helper with host allowlist + disk cache |
| `electron/lib/library.cjs` | Steam/Epic/custom game scan; VDF parser |
| `electron/lib/launchers.cjs` | Riot/GOG/Ubisoft/EA/Battle.net scanners |
| `electron/lib/storefront.cjs` | Steam store API (featured, search) |
| `electron/lib/steamchat.cjs` | steam-user + steam-session; QR login, chat |
| `electron/lib/couch.cjs` | Screenshot, dominant color, brightness, volume |
| `electron/lib/system.cjs` | Downloads queue, sysinfo, volume/mute, achievements |
| `electron/lib/padwatch.cjs` | Controller input (XInput + winmm fallback) |
| `electron/lib/session.cjs` | Session tracking; nvidia-smi sampling, save backup |
| `electron/lib/extras.cjs` | Hardware detection, achievements, deck status |
| `electron/lib/tweaks.cjs` | Engine tweaks (Unreal/Unity), apply/revert with backups |
| `electron/lib/wiki.cjs` | PCGamingWiki lookup via MediaWiki API |
| `electron/lib/saves.cjs` | Save locations from PCGamingWiki, versioned zips |
| `electron/lib/prices.cjs` | IsThereAnyDeal price history + local log |
| `electron/lib/roms.cjs` | ROM scanner (19 systems), cover art |
| `electron/lib/emulators.cjs` | Emulator detection, install, version checks |
| `electron/lib/installer.cjs` | Steam appmanifest writing; install status polling |
| `electron/lib/workshop.cjs` | Steam Workshop browse/subscribe |
| `electron/lib/screenshots.cjs` | Screenshot gallery (Steam + Gjallarhorn folders) |
| `electron/lib/optiscaler.cjs` | GitHub release download, 7-Zip extract, dxgi.dll install |
| `electron/lib/humble.cjs` | Humble Bundle HTML parser |
| `electron/lib/owned.cjs` | Not-installed game detection (Steam Web API / Epic cache) |
| `electron/lib/round4.cjs` | Key shops, Steam news, storage info, Ollama unload |
| `src/App.jsx` | State-based page routing, couch toggle, theme init |
| `src/components/Shell.jsx` | TitleBar + Sidebar (NAV with 15 items) |
| `src/components/CouchMode.jsx` | Full couch mode shell; tab rows, overlays |
| `src/components/couch/` | Couch sub-pages: GamePage, Workshop, PlayReports, etc. |
| `src/pages/` | Desktop pages: Home, Store, Library, Settings, … |
| `src/hooks/usePadInput.js` | Controller input hook for couch pages |

---

## Desktop App Layout

`App.jsx` maintains a single `page` state string rendered as a keyed `<motion.div>` with spring animations. Navigation comes from the Sidebar (`Shell.jsx`) — 15 items in `NAV`, each with a lucide icon, label, and runic accent.

Couch mode is a **separate React tree** (`<CouchMode>`) conditionally rendered; it is not a routed page but an overlay component.

---

## Couch Mode Input Routing

### `usePadInput` Hook

`src/hooks/usePadInput.js` subscribes to `window.gjallar.onPadState()` (fed by the main-process padwatch) and normalizes gamepad button codes into events: `'up'`, `'down'`, `'left'`, `'right'`, `'a'`, `'b'`, `'x'`, `'y'`, `'lb'`, `'rb'`, `'lt'`, `'rt'`, `'back'`, `'start'`, `'char'`. An `onActivity()` callback resets the idle timer; a `charMode` predicate enables virtual-keyboard mode during search.

### Page Input (`bind`)

Each couch sub-page receives `bind`:

```jsx
<PlayReports bind={(fn) => { pageInput.current = fn; }} onClose={() => setRepOpen(false)} />
```

`CouchMode.jsx` stores it in `pageInput.current`. When open, incoming button events are forwarded to the sub-page **before** main navigation. The sub-page returns `'up'`/`'down'`/`'b'` for scroll/dismiss — a stack-like overlay with no nesting.

### Navigation

Two zones: `tabs` (top bar) and `rows` (game shelves). Arrowing up from row 0 enters tab focus; down enters the grid. `pos` state `{ r, c }` tracks current tile. L2/R2 jump to adjacent letters alphabetically; LB/RB cycles tabs.

---

## padwatch: Controller Input

`electron/lib/padwatch.cjs` launches a **PowerShell process** that reads XInput states via cmdlets (falls back to `winmm.dll` joystick API for DualSense). Polls every ~16 ms and forwards state changes:

```
padwatch.start(padCombo, onComboPressed, onStateChange, onGuidePress, onPadType, onCloseBpm);
```

| Callback | Emits |
|----------|-------|
| `onStateChange` | `{ connected, buttons (bitmask), lx, ly }` |
| `onComboPressed` | Back+Start hold detected |
| `onGuidePress` | Guide/PS button pressed |
| `onPadType` | `'xbox'` or `'playstation'` |

Main.cjs runs a **gate** (`gatePad`) distinguishing taps from combo holds, debouncing and sending one-frame pulses. The in-game menu window receives pad input directly while open.

---

## Library Scanning

`electron/lib/library.cjs` exports `scanAll(customGames)`:

1. **Steam**: reads `libraryfolders.vdf` + each `appmanifest_<appid>.acf` (StateFlags 1026 = installed, 5 = ready-to-update).
2. **Epic**: launcher manifests from classic and per-user paths; Fortnite always offered.
3. **GOG / Ubisoft / EA / Battle.net**: registry uninstall entries by publisher.
4. **Riot**: `RiotClientInstalls.json` + metadata YAML.
5. **Steam shortcuts**: `shortcuts.vdf` for non-Steam executables.
6. **Custom games**: from `settings.customGames`.

Each returns `{ key, source, appid, name, dir, cover, hero, header, lastPlayed, sizeBytes }`.

---

## Sessions and Play Reports

On `launchGame(game)`: high-performance GPU set per-executable, controller suspended, session started in `session.cjs` (boost priority, wallpaper pause, exe watching). Every 5 s, `nvidia-smi` samples GPU temp/util/power/VRAM/clock. Playtime updates in `<userData>/playtime.json`. On exit: auto save-backup (if enabled), session ends, couch mode restored.

Events (`state: waiting|running|ended|gave-up`) emit via `win.webContents.send('session', ev)`.

**Play reports** (`session.reports()`) return newest-first from `<userData>/session-reports.json` — each with sample array and summary (`avgTemp, maxTemp, avgUtil, avgPower, maxVram`).

---

## Theming

Theming uses CSS custom properties on `<html>`. `src/themes.css` defines realm overrides (Asgard/Niflheim/Muspelheim/Vanaheim). Per-user settings in `settings.json`:

| Key | Values | Effect |
|-----|--------|--------|
| `realm` | asgard/niflheim/muspelheim/vanaheim | Sets `data-realm`, switches token palette |
| `bgMode` | aurora/fire/embers/image/color | Animated background type |
| `accent` | hex (#f0c869) | Primary accent color |
| `bgDim` | 0…0.8 | Background dimming intensity |
| `uiBlur` | 0…24 | Frosted-glass blur radius |
| `bgColor1/2` | hex strings | Gradient endpoints (color mode) |
| `uiFont` | font-family name | Body text font |
| `headFont` | font-family name | Heading font |
| `splashStyle` | bifrost/forge/runes/terminal/minimal/cinematic/none | Intro splash style |
| `uiScale / couchScale` | number | Zoom multiplier (desktop / couch) |

Fonts loaded via `src/data/fonts.js` (`applyFonts(settings)`), which fetches variable fonts (Manrope/Cinzel). Realm set as `document.documentElement.dataset.realm`.

---

## Testing Harness

| Env var | Purpose |
|---------|---------|
| `GJ_USERDATA=<path>` | Runs a second copy with isolated data folder |
| `GJ_SHOTS="home,store"` | Captures page PNGs to `GJ_SHOT_DIR`; auto-quits. Supports JS injection: `home:window.__gjNav('store')` |
| `GJ_DISPLAY=<index>` | Moves window onto a specific monitor |
| `GJ_OVERLAY_TEST=1` | Opens in-game overlay with fake controller input |

Console output saved alongside screenshots in `console.log`.

---

## Build and Package

| Script | Command | Output |
|--------|---------|--------|
| `npm install` | — | Dependencies |
| `npm run dev` | `node scripts/dev.mjs` | Vite + Electron with hot reload |
| `npm run build` | `vite build` | Renderer → `dist/` |
| `npm start` | `electron .` | Runs on `dist/index.html` |
| `npm run package` | `vite build && electron-builder --win nsis` | NSIS installer in `release/` |

electron-builder targets `dist/**`, `electron/**`, `public/**`, `package.json`. NSIS: per-user install, desktop/start shortcuts.

---

## How to Add a Desktop Page

1. Create `src/pages/<Name>.jsx` (default export).
2. Import in `App.jsx`: `import Name from './pages/Name.jsx';`
3. Add to the `pages` map: `name: <Name {...ctx} />`.
4. Add sidebar entry in `Shell.jsx` NAV: `{ id: 'name', label: 'Name', icon: Icon, rune: 'ᚾ' }`.

Couch-mode pages use a different pattern (sub-pages inside `CouchMode.jsx` with `bind`/`onClose`).

## How to Add an IPC Call

1. **Implement** in an existing `electron/lib/*.cjs` or create a new module.
2. **Register handler** in `main.cjs`: `handle('my:action', (a, b) => mylib.doSomething(a, b));`
3. **Expose in preload** (`preload.cjs`): `myAction: (a, b) => call('my:action', a, b),`
4. **Call from renderer**: `const result = await window.gjallar.myAction(a, b);`

Channel naming convention: `<module>:<verb>` (e.g. `library:scan`, `net:json`).

---

## Key Design Decisions

- **Renderer never fetches the internet** — all HTTP through `window.gjallar.fetchJson/fetchText` → `net.cjs` (avoids CORS, enables host allowlist and disk cache).
- **Single-window architecture** — couch mode is fullscreen within it; quick launcher and in-game menu are separate always-on-top windows sharing the renderer URL with query params (`?quick=1`, `?overlay=1`).
- **Padwatch runs outside the window** — browser gamepad API only fires while focused; PowerShell monitors globally so couch mode works over desktop.
- **Error safety first** — every IPC handler wraps in try/catch returning `{ error }`; preload throws; renderer catches with `await`.
- **Hardware-aware** — all GPU/CPU/VRAM specs come from `extras.hardware()` / `nvidia-smi` at runtime; never hardcoded.
