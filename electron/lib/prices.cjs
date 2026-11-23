// Price history: IsThereAnyDeal (full history, needs the user's free API key) + a local log of
// every price Gjallarhorn sees (works with no key; grows over time).
// ITAD v2 endpoints confirmed live 2026-11-21 (GET lookup/v1, GET history/v2). Response parsing is
// defensive because the docs site blocks automated readers and responses can't be seen without a key.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const net = require('./net.cjs');

const API = 'https://api.isthereanydeal.com';
const file = () => path.join(app.getPath('userData'), 'price-history.json');

function loadLocal() {
  try { return JSON.parse(fs.readFileSync(file(), 'utf8')); } catch { return {}; }
}
// Record a price point for a CheapShark gameID (max one point per day per game).
function record(gameID, price, title) {
  if (!gameID || !isFinite(Number(price))) return;
  const db = loadLocal();
  const day = new Date().toISOString().slice(0, 10);
  const e = (db[gameID] ||= { title, points: [] });
  const last = e.points[e.points.length - 1];
  if (last && last.d === day) last.p = Math.min(last.p, Number(price));
  else e.points.push({ d: day, p: Number(price) });
  if (e.points.length > 2000) e.points.splice(0, e.points.length - 2000);
  fs.writeFileSync(file(), JSON.stringify(db));
}
function local(gameID) {
  return (loadLocal()[gameID]?.points || []).map((x) => ({ t: Date.parse(x.d), price: x.p, shop: 'Seen by Gjallarhorn' }));
}

const num = (v) => (typeof v === 'number' ? v : v && typeof v === 'object' ? Number(v.amount ?? v.amountInt / 100) : Number(v));

async function itadId(key, { appid, title }) {
  if (appid) {
    const r = await net.get(`${API}/games/lookup/v1?key=${encodeURIComponent(key)}&appid=${encodeURIComponent(appid)}`);
    const id = r?.game?.id || r?.id;
    if (id) return id;
  }
  if (title) {
    const r = await net.get(`${API}/games/search/v1?key=${encodeURIComponent(key)}&title=${encodeURIComponent(title)}&results=5`);
    const list = Array.isArray(r) ? r : r?.results || [];
    const exact = list.find((g) => (g.title || '').toLowerCase() === title.toLowerCase());
    return (exact || list[0])?.id || null;
  }
  return null;
}

async function itadHistory(key, q, country = 'US') {
  const id = await itadId(key, q);
  if (!id) return { id: null, points: [] };
  const since = new Date(Date.now() - 5 * 365 * 864e5).toISOString();
  const r = await net.get(`${API}/games/history/v2?key=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}&country=${country}&since=${encodeURIComponent(since)}`);
  const rows = Array.isArray(r) ? r : r?.history || r?.data || [];
  const points = rows
    .map((x) => ({
      t: Date.parse(x.timestamp || x.date || x.time),
      price: num(x.deal?.price ?? x.price),
      regular: num(x.deal?.regular ?? x.regular),
      cut: x.deal?.cut ?? x.cut ?? null,
      shop: x.shop?.name || x.shop || '',
      currency: x.deal?.price?.currency || x.currency || 'USD',
    }))
    .filter((p) => isFinite(p.t) && isFinite(p.price))
    .sort((a, b) => a.t - b.t);
  return { id, points };
}

async function history({ gameID, appid, title, key, country }) {
  const out = { local: local(gameID), itad: null, error: null };
  if (key) {
    try { out.itad = await itadHistory(key, { appid, title }, country); }
    catch (e) { out.error = /403/.test(e.message) ? 'IsThereAnyDeal rejected the API key' : e.message; }
  }
  return out;
}

module.exports = { record, history };
