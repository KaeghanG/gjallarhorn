// Network helper for the main process. The renderer asks for URLs through IPC;
// only allow-listed hosts are fetched so a compromised page can't use us as a proxy.
const UA = 'Gjallarhorn/0.1 (desktop game launcher)';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

const ALLOWED = [
  'www.cheapshark.com',
  'store.steampowered.com',
  'api.steamcmd.net',
  'steamcommunity.com',
  'api.steampowered.com',
  'store-site-backend-static.ak.epicgames.com',
  'www.pcgamingwiki.com',
  'api.github.com',
  'www.humblebundle.com',
  'catalog.gog.com',
  'git.eden-emu.dev',
  'api.isthereanydeal.com',
  'api.gg.deals',
];

const cache = new Map(); // url -> { t, data }
const TTL = 10 * 60 * 1000;

function check(url) {
  const u = new URL(url);
  // Steam's image CDNs (shared.akamai.steamstatic.com, cdn.cloudflare.steamstatic.com, ...) are allowed by suffix.
  if (u.protocol !== 'https:' || !(ALLOWED.includes(u.hostname) || u.hostname.endsWith('.steamstatic.com'))) {
    throw new Error(`Host not allowed: ${u.hostname}`);
  }
  return u;
}

// Raw bytes (images) from an allowed host, capped at 8 MB.
async function getBuffer(url) {
  check(url);
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) throw new Error('Image too large');
  return buf;
}

// Optional disk cache (opts.disk = max age in ms) so slow APIs (Steam details, news, key shops) load instantly next time.
const crypto = require('crypto');
function diskPath(key) {
  const { app } = require('electron');
  return require('path').join(app.getPath('userData'), 'cache', crypto.createHash('sha1').update(key).digest('hex') + '.json');
}
function diskRead(key, maxAge) {
  try {
    const f = diskPath(key);
    const st = require('fs').statSync(f);
    if (Date.now() - st.mtimeMs > maxAge) return undefined;
    return JSON.parse(require('fs').readFileSync(f, 'utf8'));
  } catch { return undefined; }
}
function diskWrite(key, data) {
  try {
    const f = diskPath(key);
    require('fs').mkdirSync(require('path').dirname(f), { recursive: true });
    require('fs').writeFileSync(f, JSON.stringify(data));
  } catch {}
}

async function get(url, { asText = false, browser = false, fresh = false, disk = 0 } = {}) {
  check(url);
  const key = (asText ? 't:' : 'j:') + url;
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.t < TTL) return hit.data;
  if (!fresh && disk) {
    const d = diskRead(key, disk);
    if (d !== undefined) { cache.set(key, { t: Date.now(), data: d }); return d; }
  }
  const res = await fetch(url, {
    headers: {
      'User-Agent': browser ? BROWSER_UA : UA,
      Accept: asText ? 'text/html,*/*' : 'application/json',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const data = asText ? await res.text() : await res.json();
  cache.set(key, { t: Date.now(), data });
  if (disk) diskWrite(key, data);
  return data;
}

async function download(url, dest, onProgress) {
  const fs = require('fs');
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const out = fs.createWriteStream(dest);
  let got = 0;
  for await (const chunk of res.body) {
    got += chunk.length;
    out.write(chunk);
    if (onProgress && total) onProgress(got / total);
  }
  await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
  return dest;
}

// Follows one redirect manually and returns the Location (used for PCGamingWiki's appid.php).
async function redirectTarget(url) {
  check(url);
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  return res.headers.get('location');
}

module.exports = { get, getBuffer, download, redirectTarget, UA };
