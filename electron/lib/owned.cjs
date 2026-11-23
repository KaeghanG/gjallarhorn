// Games you OWN but haven't installed, with install hand-off to the real launcher.
// Steam: Web API GetOwnedGames (user's free key from steamcommunity.com/dev/apikey + SteamID64 from loginusers.vdf).
// Epic: the launcher's local catalog cache (catcache.bin = base64 JSON), when Epic is installed.
const fs = require('fs');
const path = require('path');
const net = require('./net.cjs');
const { parseVdf } = require('./library.cjs');

function steamUsers(steamRoot = 'C:\\Program Files (x86)\\Steam') {
  try {
    const v = parseVdf(fs.readFileSync(path.join(steamRoot, 'config', 'loginusers.vdf'), 'utf8')).users || {};
    return Object.entries(v).map(([id, u]) => ({ id, name: u.PersonaName, recent: u.MostRecent === '1' }));
  } catch {
    return [];
  }
}

async function steamOwned(key, steamId) {
  const id = steamId || steamUsers().find((u) => u.recent)?.id || steamUsers()[0]?.id;
  if (!key) throw new Error('Add your Steam Web API key in Settings');
  if (!id) throw new Error('Could not find your SteamID: sign in to Steam once, or enter it in Settings');
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(key)}&steamid=${id}&include_appinfo=1&include_played_free_games=1&format=json`;
  let r;
  try { r = await net.get(url, { fresh: true }); }
  catch (e) { throw new Error(/40[13]/.test(e.message) ? 'Steam rejected the API key' : e.message); }
  const games = r?.response?.games;
  if (!games) throw new Error('Steam returned no games: set Profile → Privacy → Game details to Public, or check the SteamID');
  return games.map((g) => ({
    key: `steam-${g.appid}`, source: 'steam', appid: String(g.appid), name: g.name,
    playtimeMin: g.playtime_forever || 0, lastPlayed: (g.rtime_last_played || 0) * 1000,
    install: `steam://install/${g.appid}`,
  }));
}

// New-style Epic launcher: everything the account owns is cached in library-cache.json (it fills in as the launcher is used).
// Fortnite is free to play, so it is always offered even before the launcher has listed it.
const FORTNITE = { ns: 'fn', item: '4fe75bbc5a674f4f9b17af666c3d3cb4', app: 'Fortnite', title: 'Fortnite' };
function epicOwnedV2() {
  const base = path.join(process.env.LOCALAPPDATA || '', 'com.epicgames.eglv2', 'cache', 'prod');
  const out = [];
  const link = (ns, item, app) => `com.epicgames.launcher://apps/${encodeURIComponent(`${ns}:${item}:${app}`)}?action=install`;
  let cat = {};
  try { cat = JSON.parse(fs.readFileSync(path.join(base, 'catalog-cache.json'), 'utf8')).items || {}; } catch {}
  let dirs = [];
  try { dirs = fs.readdirSync(path.join(base, 'account')); } catch {}
  for (const d of dirs) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(base, 'account', d, 'library-cache.json'), 'utf8'));
      for (const i of j.items || []) {
        if (i.recordType !== 'APPLICATION' || i.owned === false || !i.appId) continue;
        const { namespaceId, itemId, appName } = i.appId;
        const img = (cat[itemId]?.item?.keyImages || []).find((k) => k.type === 'DieselGameBoxTall') || (cat[itemId]?.item?.keyImages || [])[0];
        out.push({ key: `epic-${appName}`, source: 'epic', appid: null, name: i.title, cover: img?.url || null, install: link(namespaceId, itemId, appName) });
      }
    } catch {}
  }
  if (!out.some((g) => g.key === `epic-${FORTNITE.app}`)) {
    out.push({ key: `epic-${FORTNITE.app}`, source: 'epic', appid: null, name: FORTNITE.title, install: link(FORTNITE.ns, FORTNITE.item, FORTNITE.app) });
  }
  return out;
}

function epicOwned() {
  const v2 = epicOwnedV2();
  if (fs.existsSync(path.join(process.env.LOCALAPPDATA || '', 'com.epicgames.eglv2'))) return v2;
  const f = path.join(process.env.LOCALAPPDATA || '', 'EpicGamesLauncher', 'Saved', 'Data', 'Catalog', 'catcache.bin');
  if (!fs.existsSync(f)) return [];
  try {
    const items = JSON.parse(Buffer.from(fs.readFileSync(f, 'utf8'), 'base64').toString('utf8'));
    return items
      .filter((i) => !i.mainGameItem && (i.categories || []).some((c) => c.path === 'games') && i.releaseInfo?.[0]?.appId)
      .map((i) => {
        const appName = i.releaseInfo[0].appId;
        const img = (i.keyImages || []).find((k) => k.type === 'DieselGameBoxTall') || (i.keyImages || [])[0];
        return {
          key: `epic-${appName}`, source: 'epic', appid: null, name: i.title, cover: img?.url || null,
          install: `com.epicgames.launcher://apps/${encodeURIComponent(`${i.namespace}:${i.id}:${appName}`)}?action=install`,
        };
      });
  } catch {
    return [];
  }
}

async function owned({ steamKey, steamId }, installedKeys) {
  const out = { games: [], errors: [] };
  if (steamKey) {
    try { out.games.push(...(await steamOwned(steamKey, steamId))); } catch (e) { out.errors.push(e.message); }
  }
  out.games.push(...epicOwned());
  const inst = new Set(installedKeys);
  out.games = out.games.filter((g) => !inst.has(g.key)).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
  out.steamUsers = steamUsers();
  return out;
}

module.exports = { owned, steamUsers };
