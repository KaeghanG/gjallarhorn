// collections.js — pure JS helper for building couch-mode game collections.
// No React, no imports. Called from React components with library + settings state.

/** Capitalise the first letter of every word (e.g. 'gog' → 'GOG', 'ea' → 'EA'). */
function capWords(s) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

/** Return a new settings object with a new collections array (never mutates). */
function addToCollection(settings, name, key) {
  const base = settings.collections || {};
  const arr = base[name] ? [...base[name]] : [];
  if (!arr.includes(key)) arr.push(key);
  return { ...base, [name]: arr };
}

/** Return a new settings object with the key removed from the named collection (never mutates). */
function removeFromCollection(settings, name, key) {
  const base = settings.collections || {};
  if (!base[name]) return base;
  return { ...base, [name]: base[name].filter(k => k !== key) };
}

/**
 * Build ordered collection objects from library and settings.
 * @param {Array<{key:string,name:string,source:string,lastPlayed:number,playtimeMin?:number,installed?:boolean,updateRequired?:boolean}>} library
 * @param {{favorites?:string[],collections?:{[name:string]:string[]}}} settings
 * @returns {Array<{id:string,label:string,icon:string,games:Array>}
 */
function buildCollections(library, settings) {
  const favs = settings.favorites || [];
  const userCols = settings.collections || {};
  const seen = new Set(); // avoid duplicates in output array
  const result = [];

  function add(id, label, icon, games) {
    if (games.length === 0) return;
    seen.add(id);
    result.push({ id, label, icon, games });
  }

  // 1. Favorites — keys in settings.favorites that still exist in library
  const favGames = library.filter(g => favs.includes(g.key));
  add('favorites', 'Favorites', 'Star', favGames);

  // 2. Recently played — lastPlayed > 0, newest first, max 20
  const recent = [...library]
    .filter(g => g.lastPlayed > 0)
    .sort((a, b) => b.lastPlayed - a.lastPlayed)
    .slice(0, 20);
  add('recent', 'Recently played', 'Clock', recent);

  // 3. Ready to play — installed true and updateRequired not true
  const ready = library.filter(g => g.installed !== false && g.updateRequired !== true);
  add('ready', 'Ready to play', 'Play', ready);

  // 4. Needs update — updateRequired true
  const updates = library.filter(g => g.updateRequired === true);
  add('updates', 'Needs update', 'Download', updates);

  // 5. User-defined collections
  for (const [name, keys] of Object.entries(userCols)) {
    if (!keys || keys.length === 0) continue;
    const games = library.filter(g => keys.includes(g.key));
    add(name, name, 'Folder', games);
  }

  // 6. By source
  const bySource = new Map();
  for (const game of library) {
    if (!bySource.has(game.source)) bySource.set(game.source, []);
    bySource.get(game.source).push(game);
  }
  for (const [source, games] of bySource) {
    add('source:' + source, capWords(source), 'Gamepad2', games);
  }

  return result;
}

// ── Self-check: usage examples (verify with `node -e "…"`) ─────────────────────
// const lib = [
//   { key:'steam_1245620', name:'ELDEN RING',       source:'steam',      lastPlayed:Date.now(), playtimeMin:480, installed:true,  updateRequired:false },
//   { key:'steam_271590',  name:'Grand Theft Auto V', source:'steam',    lastPlayed:Date.now()-864e5, playtimeMin:200, installed:true,  updateRequired:true  },
//   { key:'epic_abc123',   name:'Fortnite',           source:'epic',     lastPlayed:0,             playtimeMin:0,   installed:false, updateRequired:false },
//   { key:'custom_xyz',    name:'Custom Game',        source:'custom',   lastPlayed:Date.now()-1728e5, playtimeMin:60,  installed:true,  updateRequired:false },
// ];
// const settings = {
//   favorites: ['steam_1245620', 'epic_abc123'],
//   collections: { 'RPGs': ['steam_1245620'], 'Favourites': ['steam_1245620', 'custom_xyz'] },
// };
// const cols = buildCollections(lib, settings);
// // Expected order: Favorites(2), Recent(3), Ready(3), Needs update(1), RPGs(1), Favourites(2), Steam(3), Epic(1), Custom(1)
// console.log(cols.map(c => `${c.label}: ${c.games.length} games`).join('\n'));
//
// // addToCollection / removeFromCollection return new objects:
// const colA = addToCollection(settings, 'RPGs', 'steam_271590');
// console.log(colA.RPGs);           // ['steam_1245620', 'steam_271590']
// console.log(settings.collections.RPGs); // still ['steam_1245620'] (unchanged)
// const colB = removeFromCollection(settings, 'RPGs', 'steam_1245620');
// console.log(colB.RPGs);           // [] (empty, then the collection won't appear in buildCollections)

export { buildCollections, addToCollection, removeFromCollection };
