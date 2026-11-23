// "Find me a game": search Steam's own tag-filtered store search by genres + mood/feature tags you pick (e.g. Souls-like + Co-op).
// Uses the same public store.steampowered.com endpoints the Steam website itself uses to browse by tag; no login, no scraping of personal data.
'use strict';
const net = require('./net.cjs');

// Curated from Steam's live tag list (store.steampowered.com/tagdata/populartags/english), grouped for the UI.
// id = Steam's real numeric tag id (verified against the live endpoint), not guessed.
const GENRES = [
  { id: 19, label: 'Action' }, { id: 21, label: 'Adventure' }, { id: 122, label: 'RPG' }, { id: 9, label: 'Strategy' },
  { id: 599, label: 'Simulation' }, { id: 492, label: 'Indie' }, { id: 597, label: 'Casual' }, { id: 1774, label: 'Shooter' },
  { id: 1676, label: 'RTS' }, { id: 1754, label: 'MMORPG' }, { id: 1770, label: 'Board Game' }, { id: 699, label: 'Racing' }, { id: 701, label: 'Sports' },
];
const MOODS = [
  { id: 29482, label: 'Souls-like' }, { id: 1716, label: 'Roguelike' }, { id: 3959, label: 'Roguelite' }, { id: 1628, label: 'Metroidvania' },
  { id: 1667, label: 'Horror' }, { id: 1721, label: 'Psychological Horror' }, { id: 1654, label: 'Relaxing' }, { id: 97376, label: 'Cozy' },
  { id: 4026, label: 'Difficult' }, { id: 1742, label: 'Story Rich' }, { id: 1664, label: 'Puzzle' }, { id: 1662, label: 'Survival' },
  { id: 1702, label: 'Crafting' }, { id: 7332, label: 'Base Building' }, { id: 4328, label: 'City Builder' }, { id: 87918, label: 'Farming Sim' },
  { id: 1708, label: 'Tactical' }, { id: 1677, label: 'Turn-Based' }, { id: 1741, label: 'Turn-Based Strategy' }, { id: 4364, label: 'Grand Strategy' }, { id: 1670, label: '4X' },
  { id: 4231, label: 'Action RPG' }, { id: 1646, label: 'Hack and Slash' }, { id: 9204, label: 'Immersive Sim' }, { id: 1720, label: 'Dungeon Crawler' },
  { id: 5900, label: 'Walking Simulator' }, { id: 3799, label: 'Visual Novel' }, { id: 3810, label: 'Sandbox' }, { id: 1687, label: 'Stealth' },
  { id: 353880, label: 'Looter Shooter' }, { id: 4885, label: 'Bullet Hell' }, { id: 1663, label: 'FPS' }, { id: 1659, label: 'Zombies' },
  { id: 1695, label: 'Open World' }, { id: 3942, label: 'Sci-fi' }, { id: 4604, label: 'Dark Fantasy' }, { id: 3952, label: 'Gothic' },
  { id: 7432, label: 'Lovecraftian' }, { id: 5716, label: 'Mystery' }, { id: 5613, label: 'Detective' }, { id: 6052, label: 'Noir' },
  { id: 1685, label: 'Co-op' }, { id: 3843, label: 'Online Co-Op' }, { id: 3841, label: 'Local Co-Op' }, { id: 10816, label: 'Split Screen' },
  { id: 3878, label: 'Competitive' }, { id: 1775, label: 'PvP' }, { id: 6730, label: 'PvE' }, { id: 10235, label: 'Life Sim' }, { id: 9551, label: 'Dating Sim' },
  { id: 1752, label: 'Rhythm' }, { id: 1666, label: 'Card Game' }, { id: 32322, label: 'Deckbuilding' }, { id: 5851, label: 'Isometric' },
];
const ALL_TAGS = [...GENRES, ...MOODS];
const APPID_RE = /\/apps\/(\d+)\//;

/**
 * @param {{ tags: number[], cc?: string, excludeOwnedAppids?: number[] }} opts
 * @returns {Promise<{ name: string, appid: number|null, image: string|null }[]>}
 */
async function find({ tags = [], cc = 'us', excludeOwnedAppids = [] } = {}) {
  const ids = tags.filter((t) => ALL_TAGS.some((x) => x.id === t));
  if (!ids.length) return [];
  const url = `https://store.steampowered.com/search/results/?query=&tags=${ids.join(',')}&category1=998&supportedlang=english&json=1&count=40&cc=${okCc(cc)}&l=english`;
  const data = await net.get(url, { disk: 3600e3 }); // an hour's cache: the point is discovery, not live pricing
  const owned = new Set(excludeOwnedAppids.map(String));
  const seen = new Set();
  const out = [];
  for (const it of data?.items || []) {
    const m = APPID_RE.exec(it.logo || '');
    const appid = m ? Number(m[1]) : null;
    if (!it.name || (appid && (owned.has(String(appid)) || seen.has(appid)))) continue;
    if (appid) seen.add(appid);
    out.push({ name: it.name, appid, image: it.logo || null });
  }
  return out;
}
const okCc = (cc) => (/^[a-z]{2}$/i.test(cc || '') ? cc.toLowerCase() : 'us');

module.exports = { find, GENRES, MOODS };
