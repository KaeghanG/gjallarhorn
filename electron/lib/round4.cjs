// Round 4 backends: key-shop prices (GG.deals), Steam patch notes, storage, AI<->gaming switch.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const net = require('./net.cjs');

// ---------- Key shops via GG.deals ----------
// G2A and Loaded (formerly CDKeys) block automated access, so we never scrape them. GG.deals tracks official stores AND key shops
// and offers a free API key (gg.deals → Settings → API). Endpoint + params confirmed live 2026-11-22 (ids, key, region).
// TODO(verify): response field names are parsed defensively until seen with a real key.
async function keyshops(appid, { ggKey, region = 'us' }) {
  if (!ggKey) return { enabled: false };
  const r = await net.get(`https://api.gg.deals/v1/prices/by-steam-app-id/?ids=${encodeURIComponent(appid)}&key=${encodeURIComponent(ggKey)}&region=${encodeURIComponent(region.toLowerCase())}`, { disk: 6 * 3600e3 });
  if (r?.success === false) throw new Error(r?.data?.message || 'GG.deals error');
  const d = r?.data?.[appid] || r?.data?.[Number(appid)];
  if (!d) return { enabled: true, found: false };
  const p = d.prices || {};
  const n = (v) => (v == null || v === '' ? null : Number(v));
  return {
    enabled: true, found: true, title: d.title, url: d.url,
    retail: n(p.currentRetail), keyshops: n(p.currentKeyshops),
    historicalRetail: n(p.historicalRetail), historicalKeyshops: n(p.historicalKeyshops),
    currency: p.currency || 'USD',
  };
}

// ---------- Steam news / patch notes (public API, no key) ----------
async function news(appid, count = 6) {
  const base = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${encodeURIComponent(appid)}&count=${count}&maxlength=700&format=json`;
  // Prefer the developer's own announcements; fall back to everything (third-party articles) when there are none.
  let r = await net.get(`${base}&feeds=steam_community_announcements`, { disk: 3 * 3600e3 });
  if (!r?.appnews?.newsitems?.length) r = await net.get(base, { disk: 3 * 3600e3 });
  return (r?.appnews?.newsitems || []).map((n) => ({
    id: n.gid, title: n.title, url: n.url, date: n.date * 1000, author: n.author || '', feed: n.feedlabel || '',
    patch: /patch|update|hotfix|release notes|changelog/i.test(n.title) || (n.tags || []).includes('patchnotes'),
    body: String(n.contents || '').replace(/\{STEAM_CLAN_IMAGE\}\S*/g, '').replace(/\[\/?[a-z0-9*]+[^\]]*\]/gi, '').replace(/<[^>]+>/g, '').replace(/\s+\n/g, '\n').trim(),
  }));
}
// News across the user's installed Steam games, newest first (patches only by default).
async function feed(games, { patchesOnly = true, days = 21 } = {}) {
  const since = Date.now() - days * 864e5;
  const steam = games.filter((g) => g.source === 'steam' && g.appid).slice(0, 40);
  const lists = await Promise.all(steam.map((g) => news(g.appid, 4).then((l) => l.map((n) => ({ ...n, game: g.name, appid: g.appid, key: g.key }))).catch(() => [])));
  return lists.flat().filter((n) => n.date >= since && (!patchesOnly || n.patch)).sort((a, b) => b.date - a.date).slice(0, 30);
}

// ---------- Steam friends (who's online and what they're playing) ----------
async function steamFriends({ steamKey, steamId }) {
  if (!steamKey) return { enabled: false, friends: [] };
  const { steamUsers } = require('./owned.cjs');
  const id = steamId || steamUsers().find((u) => u.recent)?.id || steamUsers()[0]?.id;
  if (!id) return { enabled: true, friends: [], error: 'No Steam account found' };
  const k = encodeURIComponent(steamKey);
  try {
    const list = await net.get(`https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${k}&steamid=${id}&relationship=friend`, { fresh: true });
    const ids = (list?.friendslist?.friends || []).map((f) => f.steamid).slice(0, 100);
    if (!ids.length) return { enabled: true, friends: [] };
    const sums = await net.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${k}&steamids=${ids.join(',')}`, { fresh: true });
    const friends = (sums?.response?.players || [])
      .map((p) => ({ id: p.steamid, name: p.personaname, avatar: p.avatarfull || p.avatarmedium, state: p.personastate || 0, game: p.gameextrainfo || null, gameid: p.gameid || null, lobby: p.lobbysteamid || null }))
      .filter((f) => f.state > 0 || f.game)
      .sort((a, b) => (b.game ? 1 : 0) - (a.game ? 1 : 0) || a.name.localeCompare(b.name));
    return { enabled: true, friends };
  } catch (e) {
    return { enabled: true, friends: [], error: /40[13]/.test(e.message) ? 'Steam says your friends list is private (Profile → Privacy) or the key is invalid' : e.message };
  }
}

// ---------- Storage ----------
function storage(games) {
  const roots = [...new Set(games.map((g) => (g.dir ? path.parse(g.dir).root.toUpperCase() : null)).filter(Boolean))];
  if (!roots.includes('C:\\')) roots.unshift('C:\\');
  const drives = roots.map((root) => {
    try { const s = fs.statfsSync(root); return { root, freeBytes: s.bavail * s.bsize, totalBytes: s.blocks * s.bsize }; }
    catch { return null; }
  }).filter(Boolean);
  return {
    drives,
    games: games.map((g) => ({ key: g.key, name: g.name, source: g.source, appid: g.appid, dir: g.dir, sizeBytes: g.sizeBytes || 0, lastPlayed: g.lastPlayed || 0, drive: g.dir ? path.parse(g.dir).root.toUpperCase() : null })),
  };
}
function uninstallUri(game) {
  if (game.source === 'steam' && game.appid) return `steam://uninstall/${game.appid}`;
  if (game.source === 'epic') return 'com.epicgames.launcher://store/library'; // Epic has no documented uninstall URI: open the library
  return null;
}

// ---------- AI <-> Gaming switch: unload Ollama models from VRAM while a game runs ----------
function ollamaExe() {
  const p = path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Ollama', 'ollama.exe');
  return fs.existsSync(p) ? p : 'ollama';
}
function sh(cmd, args) {
  return new Promise((r) => execFile(cmd, args, { windowsHide: true, timeout: 15000 }, (e, out) => r(e ? null : out)));
}
async function ollamaLoaded() {
  const out = await sh(ollamaExe(), ['ps']);
  if (!out) return null; // Ollama not installed / not running
  return out.split(/\r?\n/).slice(1).map((l) => l.trim().split(/\s{2,}/)).filter((c) => c[0]).map((c) => ({ name: c[0], size: c[2] || '' }));
}
async function ollamaUnloadAll() {
  const models = await ollamaLoaded();
  if (!models?.length) return [];
  await Promise.all(models.map((m) => sh(ollamaExe(), ['stop', m.name])));
  return models;
}

module.exports = { steamFriends, keyshops, news, feed, storage, uninstallUri, ollamaLoaded, ollamaUnloadAll };
