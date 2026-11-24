// Steam friends, chat and friend invites inside Gjallarhorn, using Steam's own network protocol (the `steam-user` library).
// Login is by QR code scanned with the Steam mobile app: no password is ever typed into or stored by Gjallarhorn.
// Only a Steam "refresh token" is kept, encrypted with the OS (Electron safeStorage / Windows DPAPI). "Disconnect" deletes it.
// NOTE: this is an unofficial client of Steam's network; it is opt-in and off until the user connects.
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

let SteamUser, SteamSession, QRCode;
function libs() {
  if (!SteamUser) {
    SteamUser = require('steam-user');
    SteamSession = require('steam-session');
    QRCode = require('qrcode');
  }
}

const tokenFile = () => path.join(app.getPath('userData'), 'steam-chat-token.bin');
function saveToken(t) {
  try {
    if (!safeStorage.isEncryptionAvailable()) return false; // never store a token in plain text
    fs.writeFileSync(tokenFile(), safeStorage.encryptString(t));
    return true;
  } catch { return false; }
}
function loadToken() {
  try { return safeStorage.decryptString(fs.readFileSync(tokenFile())); } catch { return null; }
}
function forgetToken() { try { fs.unlinkSync(tokenFile()); } catch {} }

let client = null;
let session = null;
let state = { status: 'off', qr: null, error: null, me: null };
let emit = () => {};
const gameInvites = new Map(); // steamid64 -> { id, name, join, appid, ts } (game invites arrive as chat messages that carry a join link)
const histories = new Map(); // steamid64 -> [{ from: 'me'|'them', text, ts }]
const unread = new Map();    // steamid64 -> count
let reconnectTimer = null;

const INVITE_TTL = 15 * 60 * 1000;
const REL = { Friend: 3, RequestRecipient: 2, RequestInitiator: 4 };
const PERSONA = ['Offline', 'Online', 'Busy', 'Away', 'Snooze', 'Looking to trade', 'Looking to play', 'Invisible'];

const publicStatus = () => ({ status: state.status, qr: state.qr, error: state.error, me: state.me });
function setState(patch) {
  state = { ...state, ...patch };
  emit({ type: 'status', status: publicStatus() });
}

function avatarUrl(u) {
  const h = u?.avatar_hash ? Buffer.from(u.avatar_hash).toString('hex') : '';
  return h && !/^0+$/.test(h) ? `https://avatars.steamstatic.com/${h}_full.jpg` : null;
}
function stripBb(s) { return String(s || '').replace(/\\\[/g, '[').replace(/\[\/?[a-z0-9]+[^\]]*\]/gi, ''); }
// A game invite arrives as a chat message wrapped in Steam's own [gameinvite] BBCode tag (no join link in the text -
// the only reliable way to actually join is the sender's live rich presence, same as the "Join game" button uses).
function isGameInvite(rawMessage, plainText) {
  if (/\[gameinvite\b/i.test(String(rawMessage || ''))) return true;
  return /invited you to play a game/i.test(String(plainText || '')); // fallback for messages saved before the tag check, or without the bbcode wrapper
}

// ---- friends -------------------------------------------------------------------------------------------------------
// Steam only sends a game name for non-Steam games; resolve "App 12345" through the store (cached, filled in the background).
const appNames = new Map();
function appName(appid) {
  if (appNames.has(appid)) return appNames.get(appid);
  appNames.set(appid, null);
  require('./net.cjs').get('https://store.steampowered.com/api/appdetails?appids=' + appid + '&filters=basic', { fresh: true })
    .then((j) => { const n = j?.[appid]?.data?.name; if (n) appNames.set(appid, n); else appNames.delete(appid); }).catch(() => appNames.delete(appid));
  return null;
}
function persona(sid) {
  const u = client?.users?.[sid] || {};
  const appid = u.gameid && u.gameid !== '0' ? String(u.gameid) : null;
  const connect = Array.isArray(u.rich_presence) ? u.rich_presence.find((r) => r.key === 'connect')?.value : null;
  return {
    id: sid,
    name: u.player_name || sid,
    avatar: avatarUrl(u),
    state: Number(u.persona_state) || 0,
    stateName: PERSONA[Number(u.persona_state) || 0] || 'Offline',
    game: u.game_name || (appid ? appName(appid) || `Playing a game` : null),
    appid,
    presence: u.rich_presence_string || null,
    joinable: !!(appid && connect),
    unread: unread.get(sid) || 0,
    gameInvite: !!(gameInvites.get(sid) && Date.now() - gameInvites.get(sid).ts < INVITE_TTL),
  };
}
function friends() {
  if (!client?.myFriends) return { friends: [], invites: [] };
  const all = Object.entries(client.myFriends);
  const list = all.filter(([, r]) => r === REL.Friend).map(([sid]) => persona(sid));
  const invites = all.filter(([, r]) => r === REL.RequestRecipient).map(([sid]) => persona(sid));
  const rank = (f) => (f.appid ? 0 : f.state === 1 ? 1 : f.state > 1 && f.state !== 7 ? 2 : 3);
  list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  return { friends: list, invites };
}

// ---- connection ----------------------------------------------------------------------------------------------------
// Chat history is kept on disk (userData/chat-history.json) so conversations survive restarts and sign-outs.
let histLoaded = false, histTimer = null;
const histFile = () => path.join(app.getPath('userData'), 'chat-history.json');
function loadHist() {
  if (histLoaded) return;
  histLoaded = true;
  try {
    const j = JSON.parse(fs.readFileSync(histFile(), 'utf8'));
    // Backfill: messages saved before invite-detection existed (or used the old broken join-link check) never got flagged - recover it from the saved text now.
    for (const [sid, list] of Object.entries(j)) if (Array.isArray(list)) histories.set(sid, list.map((m) => ({ ...m, invite: m.invite || isGameInvite(null, m.text) })));
  } catch {}
}
function saveHistSoon() {
  clearTimeout(histTimer);
  histTimer = setTimeout(() => {
    try {
      const o = {};
      for (const [sid, list] of histories) o[sid] = list.slice(-2000);
      fs.writeFileSync(histFile(), JSON.stringify(o));
    } catch {}
  }, 1500);
}
function push(sid, m) {
  loadHist();
  if (!histories.has(sid)) histories.set(sid, []);
  const h = histories.get(sid);
  if (!h.some((x) => x.ts === m.ts && x.text === m.text && x.from === m.from)) h.push(m);
  h.sort((a, b) => a.ts - b.ts || (a.ord || 0) - (b.ord || 0));
  saveHistSoon();
}
function attach(c) {
  c.on('loggedOn', () => {
    setState({ status: 'online', error: null, qr: null, me: { id: c.steamID.getSteamID64() } });
    c.setPersona(SteamUser.EPersonaState.Online);
  });
  c.on('friendsList', () => emit({ type: 'friends' }));
  c.on('friendPersonasLoaded', () => emit({ type: 'friends' }));
  c.on('user', () => emit({ type: 'friends' }));
  c.on('friendRelationship', (sid, rel) => {
    emit({ type: 'friends' });
    if (rel === REL.RequestRecipient) {
      const id = sid.getSteamID64();
      c.getPersonas([id], () => emit({ type: 'invite', friend: persona(id) }));
    }
  });
  c.chat.on('friendMessage', (m) => {
    const sid = m.steamid_friend.getSteamID64();
    const text = stripBb(m.message_no_bbcode ?? m.message);
    const invite = isGameInvite(m.message);
    push(sid, { from: 'them', text, ts: +m.server_timestamp || Date.now(), ord: m.ordinal || 0, invite });
    unread.set(sid, (unread.get(sid) || 0) + 1);
    if (invite) gameInvites.set(sid, { id: sid, name: persona(sid).name, join: joinLink(sid), appid: persona(sid).appid, ts: Date.now() });
    emit({ type: 'message', id: sid, name: persona(sid).name, text, invite });
    if (invite) emit({ type: 'gameinvite', invite: gameInvites.get(sid) });
  });
  c.chat.on('friendMessageEcho', (m) => { const id = m.steamid_friend.getSteamID64(); push(id, { from: 'me', text: stripBb(m.message_no_bbcode ?? m.message), ts: +m.server_timestamp || Date.now(), ord: m.ordinal || 0 }); emit({ type: 'message', id, name: persona(id).name, text: '', echo: true }); });
  // steam-user's own autoRelogin reconnects; a second manual login here would race it.
  c.on('disconnected', () => { if (state.status === 'online') setState({ status: 'connecting' }); });
  c.on('error', (e) => {
    const msg = String(e?.message || e);
    if (/Expired|AccessDenied|InvalidPassword/i.test(msg)) forgetToken(); // the saved login is no longer valid
    setState({ status: 'error', error: msg, qr: null });
    if (/LoggedInElsewhere|LoginSessionReplaced/i.test(msg)) scheduleReconnect(60000);
  });
}
function scheduleReconnect(ms = 8000) {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => { if (state.status !== 'off') logOnWithSaved().catch(() => {}); }, ms);
}
function newClient() {
  libs();
  if (client) { try { client.removeAllListeners(); client.logOff(); } catch {} }
  client = new SteamUser({ autoRelogin: true, enablePicsCache: false, dataDirectory: null });
  attach(client);
  return client;
}
async function logOnWithSaved() {
  const token = loadToken();
  if (!token) return false;
  setState({ status: 'connecting', error: null, qr: null });
  newClient().logOn({ refreshToken: token });
  return true;
}

const qrDataUrl = (url) => QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#0b1020', light: '#ffffff' } });

async function connect() {
  libs();
  if (state.status === 'online' || state.status === 'connecting') return publicStatus();
  if (await logOnWithSaved()) return publicStatus();
  // No saved login: start a QR login. The Steam mobile app scans it and approves.
  session = new SteamSession.LoginSession(SteamSession.EAuthTokenPlatformType.SteamClient);
  session.on('authenticated', () => {
    const token = session.refreshToken;
    const stored = saveToken(token);
    setState({ status: 'connecting', qr: null, error: stored ? null : 'Logged in, but this PC cannot encrypt the login, so it will not be remembered.' });
    newClient().logOn({ refreshToken: token });
  });
  session.on('timeout', () => setState({ status: 'error', error: 'The QR code expired. Press Connect to try again.', qr: null }));
  session.on('error', (e) => setState({ status: 'error', error: e?.message || String(e), qr: null }));
  session.on('remoteInteraction', () => emit({ type: 'status', status: { ...publicStatus(), note: 'Approve the login on your phone' } }));
  try {
    const r = await session.startWithQR();
    setState({ status: 'qr', qr: await qrDataUrl(r.qrChallengeUrl), error: null });
    session.on('challengeUrlChanged', async () => { if (state.status === 'qr') setState({ qr: await qrDataUrl(session.qrChallengeUrl) }); });
  } catch (e) {
    setState({ status: 'error', error: e?.message || String(e), qr: null });
  }
  return publicStatus();
}
function disconnect({ forget = true } = {}) {
  clearTimeout(reconnectTimer);
  try { session?.cancelLoginAttempt?.(); } catch {}
  if (client) { try { client.removeAllListeners(); client.logOff(); } catch {} }
  client = null; session = null;
  if (forget) forgetToken();
  unread.clear(); gameInvites.clear();
  setState({ status: 'off', qr: null, error: null, me: null });
  return publicStatus();
}
// Reconnect quietly at start-up if the user connected before.
function autoStart() { if (fs.existsSync(tokenFile())) { logOnWithSaved().catch(() => {}); } }

// Everything waiting for the user to answer: friend requests + recent game invites.
function pendingInvites() {
  const now = Date.now();
  for (const [k, v] of gameInvites) if (now - v.ts > INVITE_TTL) gameInvites.delete(k);
  return { requests: friends().invites, games: [...gameInvites.values()].sort((a, b) => b.ts - a.ts) };
}
function dismissGameInvite(sid) { gameInvites.delete(sid); emit({ type: 'friends' }); return true; }

// ---- chat & invites ------------------------------------------------------------------------------------------------
async function history(sid) {
  loadHist();
  unread.delete(sid);
  if (client && state.status === 'online') {
    try {
      const r = await client.chat.getFriendMessageHistory(sid, { maxCount: 100, wantBbcode: false });
      const mine = client.steamID.getSteamID64();
      for (const m of r.messages || []) {
        const text = stripBb(m.message);
        push(sid, { from: m.sender.getSteamID64() === mine ? 'me' : 'them', text, ts: +m.server_timestamp, ord: m.ordinal || 0, invite: isGameInvite(m.message, text) });
      }
      client.chat.ackFriendMessage(sid, new Date());
    } catch {}
  }
  emit({ type: 'friends' });
  return (histories.get(sid) || []).slice(-500);
}
async function send(sid, text) {
  if (state.status !== 'online') throw new Error('Connect to Steam chat first');
  const t = String(text || '').trim().slice(0, 2000);
  if (!t) return false;
  const r = await client.chat.sendFriendMessage(sid, t, { containsBbCode: false });
  push(sid, { from: 'me', text: t, ts: +r?.server_timestamp || Date.now(), ord: r?.ordinal || 0 });
  return true;
}
async function accept(sid) { if (state.status !== 'online') throw new Error('Not connected'); await client.addFriend(sid); emit({ type: 'friends' }); return true; }
function decline(sid) { if (state.status !== 'online') throw new Error('Not connected'); client.removeFriend(sid); emit({ type: 'friends' }); return true; }
// Steam's own link to join a friend's game (works for games that publish a "connect" rich-presence string).
function joinLink(sid) {
  const u = client?.users?.[sid];
  if (!u?.gameid || u.gameid === '0') return null;
  const connect = Array.isArray(u.rich_presence) ? u.rich_presence.find((r) => r.key === 'connect')?.value : null;
  return connect ? `steam://rungameid/${u.gameid}//${encodeURIComponent(connect)}` : `steam://run/${u.gameid}`;
}
const openChatLink = (sid) => `steam://friends/message/${sid}`;

// steamcommunity.com web session of the logged-in chat client (cookies + sessionid), or null when not signed in.
function webSession() {
  return new Promise((resolve) => {
    if (!client || state.status !== 'online') return resolve(null);
    const t = setTimeout(() => resolve(null), 12000);
    client.once('webSession', (sessionId, cookies) => { clearTimeout(t); resolve({ sessionId, cookies }); });
    try { client.webLogOn(); } catch { clearTimeout(t); resolve(null); }
  });
}
module.exports = {
  webSession,
  setEmitter: (fn) => { emit = fn; },
  status: publicStatus, pendingInvites, dismissGameInvite, connect, disconnect, autoStart, friends, history, send, accept, decline, joinLink, openChatLink,
  unreadTotal: () => [...unread.values()].reduce((a, b) => a + b, 0),
};

// Test-only: GJ_MOCK_CHAT=1 fakes a connected session so the UI can be checked without a real Steam login.
if (process.env.GJ_MOCK_CHAT) {
  const mk = (id, name, state, game, extra = {}) => ({ id, name, avatar: null, state, stateName: ['Offline', 'Online', 'Busy', 'Away'][state] || 'Online', game, appid: game ? '1245620' : null, presence: game ? 'In the Lands Between' : null, joinable: !!game, unread: 0, ...extra });
  const fr = { friends: [mk('1', 'Brynja', 1, 'ELDEN RING', { unread: 2 }), mk('2', 'Ragnar', 1, null), mk('3', 'Sigrid', 3, null), mk('4', 'Leif', 0, null)], invites: [mk('9', 'Freya', 1, null)] };
  const hist = [{ from: 'them', text: 'You on tonight?', ts: 1 }, { from: 'me', text: 'Yeah, give me 10 minutes', ts: 2 }, { from: 'them', text: 'Invited you to play a game!', ts: 3, invite: true }];
  module.exports.status = () => ({ status: 'online', qr: null, error: null, me: { id: '0' } });
  module.exports.friends = () => fr;
  module.exports.pendingInvites = () => ({ requests: fr.invites, games: [{ id: '1', name: 'Brynja', join: 'steam://joinlobby/1245620/1/1', appid: '1245620', ts: Date.now() }] });
  module.exports.history = async () => hist;
  module.exports.send = async () => true;
}
