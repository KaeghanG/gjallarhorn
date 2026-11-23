// Steam Workshop: browse a game's Workshop (Steam Web API), see what you have subscribed, subscribe/unsubscribe.
// Subscribing posts to steamcommunity.com with the web session of the Steam chat login (steam-user); Steam itself then downloads the item.
// Without a chat login the item's Workshop page opens in Steam instead.
const fs = require('fs');
const path = require('path');
const https = require('https');
const { shell } = require('electron');
const library = require('./library.cjs');
const installer = require('./installer.cjs');
const steamchat = require('./steamchat.cjs');

const SORTS = { popular: 0, recent: 1, trending: 3, subscribed: 9 }; // EPublishedFileQueryType: RankedByVote=0, RankedByPublicationDate=1, RankedByTrend=3, RankedByTotalUniqueSubscriptions=9

function request(method, host, urlPath, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({ method, host, path: urlPath, headers: { 'User-Agent': 'Gjallarhorn', ...headers } }, (res) => {
      let s = '';
      res.setEncoding('utf8');
      res.on('data', (d) => (s += d));
      res.on('end', () => (res.statusCode >= 400 ? reject(new Error(`Steam answered ${res.statusCode}`)) : resolve({ status: res.statusCode, text: s })));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Steam timed out')));
    if (body) req.write(body);
    req.end();
  });
}

const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n || 0));
const mapItem = (f, subscribedIds) => ({
  id: String(f.publishedfileid),
  title: f.title || `Item ${f.publishedfileid}`,
  desc: (f.short_description || f.file_description || '').replace(/\[[^\]]*\]/g, '').slice(0, 220),
  preview: f.preview_url || null,
  subs: Number(f.subscriptions) || 0,
  subsText: fmt(Number(f.subscriptions) || 0),
  size: Number(f.file_size) || 0,
  updated: (f.time_updated || 0) * 1000,
  subscribed: subscribedIds.has(String(f.publishedfileid)),
});

// ---- what is already subscribed/installed (Steam's own bookkeeping) ----
function installedIds(appid) {
  const ids = new Set();
  for (const lib of installer.libraries()) {
    const f = path.join(lib.path, 'steamapps', 'workshop', `appworkshop_${appid}.acf`);
    try {
      const v = library.parseVdf(fs.readFileSync(f, 'utf8')).AppWorkshop;
      for (const k of Object.keys(v?.WorkshopItemsInstalled || {})) ids.add(k);
      for (const k of Object.keys(v?.WorkshopItemDetails || {})) ids.add(k);
    } catch {}
  }
  return ids;
}

async function details(ids) {
  if (!ids.length) return [];
  const body = `itemcount=${ids.length}&` + ids.map((id, i) => `publishedfileids%5B${i}%5D=${id}`).join('&');
  const r = await request('POST', 'api.steampowered.com', '/ISteamRemoteStorage/GetPublishedFileDetails/v1/', { body, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } });
  return JSON.parse(r.text)?.response?.publishedfiledetails || [];
}

async function mine(appid) {
  const ids = [...installedIds(appid)];
  let d = [];
  for (let i = 0; i < Math.min(ids.length, 500); i += 100) d.push(...(await details(ids.slice(i, i + 100)).catch(() => [])));
  d = d.filter((f) => f.result === 1 || f.title);
  const known = new Set(d.map((f) => String(f.publishedfileid)));
  const out = d.map((f) => mapItem(f, new Set(ids)));
  for (const id of ids) if (!known.has(id)) out.push({ id, title: `Item ${id}`, desc: '', preview: null, subs: 0, subsText: '', size: 0, updated: 0, subscribed: true });
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

async function browse({ appid, sort = 'popular', search = '', page = 1 }, steamKey) {
  if (!appid) throw new Error('This game has no Steam app id');
  if (sort === 'mine') return { items: await mine(appid), total: null, page: 1 };
  if (!steamKey) throw new Error('Add your Steam Web API key in Settings → Store accounts to browse the Workshop');
  const q = new URLSearchParams({
    key: steamKey, appid: String(appid), page: String(page), numperpage: '30', query_type: String(SORTS[sort] ?? 0),
    return_previews: 'true', return_short_description: 'true', return_metadata: 'false', filetype: '0', cursor: '*',
  });
  if (search) q.set('search_text', search);
  q.delete('cursor');
  const r = await request('GET', 'api.steampowered.com', `/IPublishedFileService/QueryFiles/v1/?${q}`);
  let j;
  try { j = JSON.parse(r.text)?.response; } catch { throw new Error('Steam sent something unreadable'); }
  const have = installedIds(appid);
  return { items: (j?.publishedfiledetails || []).map((f) => mapItem(f, have)), total: j?.total ?? null, page };
}

// ---- subscribe / unsubscribe ----
async function setSubscribed(id, appid, on) {
  id = String(id).replace(/\D/g, '');
  const dbg = (m) => { try { fs.appendFileSync(path.join(require('electron').app.getPath('userData'), 'launch-debug.log'), `${new Date().toISOString()} [workshop] ${m}\n`); } catch {} };
  const ses = await steamchat.webSession().catch((e) => { dbg('web session failed: ' + e.message); return null; });
  if (!ses) {
    dbg('no web session (chat offline?): opening the item in Steam');
    await shell.openExternal(`steam://url/CommunityFilePage/${id}`);
    return { ok: true, via: 'steam', note: 'Opened in Steam: press Subscribe there. (Connect Steam chat in Gjallarhorn to subscribe in one press.)' };
  }
  const cookies = [...(ses.cookies || [])];
  if (!cookies.some((c) => /^sessionid=/i.test(c))) cookies.push(`sessionid=${ses.sessionId}`);
  const body = `id=${id}&appid=${encodeURIComponent(appid)}&sessionid=${encodeURIComponent(ses.sessionId)}`;
  let r;
  try {
    r = await request('POST', 'steamcommunity.com', on ? '/sharedfiles/subscribe' : '/sharedfiles/unsubscribe', {
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body), Cookie: cookies.join('; '), Referer: `https://steamcommunity.com/sharedfiles/filedetails/?id=${id}`, Origin: 'https://steamcommunity.com', Accept: 'application/json, text/javascript, */*; q=0.01', 'X-Requested-With': 'XMLHttpRequest' },
    });
  } catch (e) {
    dbg('subscribe request failed: ' + e.message);
    await shell.openExternal(`steam://url/CommunityFilePage/${id}`);
    return { ok: true, via: 'steam', note: `Steam's website refused (${e.message}); opened the item in Steam instead. Press Subscribe there.` };
  }
  dbg(`subscribe ${on ? 'on' : 'off'} ${id} app ${appid}: HTTP ${r.status} ${r.text.slice(0, 160)}`);
  let j = null;
  try { j = JSON.parse(r.text); } catch {}
  if (j && Number(j.success) !== 1) {
    await shell.openExternal(`steam://url/CommunityFilePage/${id}`);
    return { ok: true, via: 'steam', note: `Steam said code ${j.success}; opened the item in Steam so you can finish there.` };
  }
  if (!j) {
    await shell.openExternal(`steam://url/CommunityFilePage/${id}`);
    return { ok: true, via: 'steam', note: 'Steam did not confirm; opened the item in Steam so you can finish there.' };
  }
  return { ok: true, via: 'web', note: on ? 'Subscribed. Steam downloads it the next time Steam checks (restart Steam if it does not appear).' : 'Unsubscribed.' };
}

const openPage = (id) => shell.openExternal(`steam://url/CommunityFilePage/${String(id).replace(/\D/g, '')}`);
const openHub = (appid) => shell.openExternal(`steam://url/SteamWorkshopPage/${String(appid).replace(/\D/g, '')}`);

module.exports = { browse, setSubscribed, openPage, openHub, installedIds };
