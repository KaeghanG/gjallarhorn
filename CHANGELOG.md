# Changelog

## Unreleased

**New**
- Discord Rich Presence (Settings > Discord): shows "Playing X" on your Discord profile while you play. Needs a free one-time Discord application ID (instructions in Settings); sets only your own status, never reads friends, servers or messages
- "Find me a game" in Store & Deals: pick a genre plus any mood/feature tags (Souls-like, Roguelike, Cozy, Co-op, 50+ more) and get matching games straight from Steam's own tag search
- Launch profiles: save named sets of launch arguments per game; the active one is added on Play (desktop: Library > game > Launch profiles; couch: Options > Launch profile)
- Desktop Screenshots page with lightbox, per-game filter, copy and show in folder
- Play reports: a Compare games table (time, GPU use, temperature, power, VRAM per game)
- GitHub Actions workflow that builds the installer
- Per-game controller layout for Gjallarhorn's own menu: turn the Back + Start menu off for one game, swap A and B, tune stick sensitivity (desktop: Library > game > Controller layout; couch: Options > Controller layout)
- Video clips: the shelf now shows Game Bar, NVIDIA and Steam recordings with in-app playback, and the in-game menu can start / stop a Game Bar recording
- Interface cleanup: grouped desktop sidebar (Play, Captures, Social, Manage, System), consistent page headers, tidier couch hint bar

- Five more launch screens: Aurora, Embers, Warp, Glitch and Horn call (12 styles in all)

- Hide games everywhere: hidden games disappear from Home, couch mode, search and the Not installed list (hide from the game page, a Not installed tile, or the couch Options menu; unhide from the Library's "hidden" chip)

- Performance panel per game: prefer performance cores on hybrid Intel CPUs (soft CPU set), per-game fullscreen-optimizations flag, and evidence-tagged notes for specific games
- Windows power throttling (EcoQoS) is switched off for games Gjallarhorn launches (Settings > Game Boost)
- New docs/PERFORMANCE.md: what helps, what is placebo, with sources; new Unreal launch-arg chips (-NoVerifyGC, -norhithread, -nothreadtimeout)

- New docs/COMPARISON.md: an honest comparison with Steam Big Picture, Playnite, GOG Galaxy, LaunchBox and Heroic

**Fixed**
- Game invites sent in a Friends chat now show a working "Accept & join" button on the message itself, instead of only in the popup toast (which disappears after 15 minutes) - the real invite text carries no join link at all (it's just "Invited you to play a game!"), so the button now joins via the friend's live rich presence, the same reliable path the header's Join game button already used
- One launch screen instead of two: the couch-mode intro is skipped when the app-start splash just played, and the splash now covers the very first frame
- Settings > Couch mode intro > Preview now shows over the whole window even when the page is scrolled
- Back + Start always opens the in-game menu (the controller shortcut is no longer user-selectable, so a stale setting cannot disable it) and the press is logged
- Downloads: no more false "Paused" or dead progress bar; shows an animated bar when Steam has not reported progress
- Workshop one-press subscribe now uses Steam's Web API first, with the website route as a fallback

**Faster**
- Pages, couch mode and dialogs load on demand: the main script shrank by about 40%
- Background animations pause while another window (such as a game) has focus
- GPU rasterisation enabled; the tray refresh no longer scans disks while a game runs

## 0.1.0 (first public release)

**Couch mode**
- Full-screen, controller-first interface with trailers, shelves, collections and an on-screen keyboard
- Big-Picture-style slide-out sidebar, Quick access, Downloads, Controllers, Power menu, Play reports
- Animated launch screen, taskbar hiding, and automatic return to the front when a game closes

**Libraries**
- Steam, Epic (classic and per-user launcher), GOG, Ubisoft, EA, Battle.net, Riot, non-Steam shortcuts, custom games, emulated games
- Owned-but-not-installed row with install flow; Fortnite always offered for Epic
- Per-game launch options and performance flags; high-performance GPU preference for everything it launches

**In-game menu**
- Hold Back + Start anywhere: resume (brings the game forward), home, friends, downloads, volume, brightness, Do Not Disturb, screenshot, close game, sleep, restart / shut down, invites

**Social and mods**
- Steam friends and chat (QR sign-in, saved chat history, real game names, friend requests, join game)
- Steam Workshop browser on couch and desktop, with one-press subscribe
- Achievements from the public Steam profile

**Emulation**
- Detection for Eden/yuzu family, Dolphin, PCSX2, RPCS3, Cemu, Ryujinx, DuckStation, RetroArch and more
- Automatic cover art (libretro-thumbnails, plus a cached title database for Switch)

**Customisation**
- 12 theme presets, animated backgrounds (fire, embers, aurora, your own image/video, gradients), accent colour, dimming, glass blur
- 12 text fonts, 14 heading fonts, text size
- Five selectable splash screens plus the classic cinematic intro

**Insight**
- Play reports (GPU temperature, use, power, VRAM), playtime tracking, save backups
