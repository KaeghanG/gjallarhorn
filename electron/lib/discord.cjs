// Discord Rich Presence: shows what you're doing in Gjallarhorn on your Discord profile ("Playing Elden Ring", "Browsing the library"...).
// This is Discord's own, fully documented local IPC protocol (https://discord.com/developers/docs/rich-presence/overview) - the same
// mechanism Spotify, most game engines and hundreds of other apps use. It only SETS this app's own status; it never reads your friends,
// messages or account, and needs no Discord login. If the Discord desktop app isn't running, every call here is a harmless no-op.
'use strict';
const net = require('net');
const crypto = require('crypto');

// A Gjallarhorn application registered in Discord's developer portal (free, instant, no review needed for basic presence).
// Advanced users can point this at their own application ID in Settings -> Discord.
const DEFAULT_CLIENT_ID = '1234567890123456789';

let sock = null;
let connecting = false;
let ready = false;
let retryTimer = null;
let currentId = null;
let lastActivity = null; // re-sent once the connection is (re-)established
let listeners = new Set();
const notify = () => { for (const fn of listeners) { try { fn(state()); } catch {} } };

function state() { return { ready, clientId: currentId }; }
function onState(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ---- wire protocol: 4-byte LE opcode + 4-byte LE length + UTF-8 JSON payload ----
function frame(op, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  const head = Buffer.alloc(8);
  head.writeInt32LE(op, 0);
  head.writeInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}

function pipePath(i) {
  // Windows named pipe; Discord also honours $XDG_RUNTIME_DIR/discord-ipc-N etc on Linux/macOS, not needed here.
  return `\\\\.\\pipe\\discord-ipc-${i}`;
}

function tryConnect(clientId) {
  if (connecting || ready) return;
  connecting = true;
  let i = 0;
  const attempt = () => {
    if (i > 9) { connecting = false; scheduleRetry(clientId); return; }
    const s = net.createConnection(pipePath(i));
    let buf = Buffer.alloc(0);
    const fail = () => { s.destroy(); i += 1; attempt(); };
    s.once('error', fail);
    s.once('connect', () => {
      s.removeListener('error', fail);
      s.write(frame(0, { v: 1, client_id: clientId }));
      s.on('data', (d) => {
        buf = Buffer.concat([buf, d]);
        while (buf.length >= 8) {
          const len = buf.readInt32LE(4);
          if (buf.length < 8 + len) break;
          const payload = buf.slice(8, 8 + len);
          buf = buf.slice(8 + len);
          let msg = null;
          try { msg = JSON.parse(payload.toString('utf8')); } catch { continue; }
          if (msg?.evt === 'READY' || msg?.cmd === 'DISPATCH') {
            sock = s; ready = true; connecting = false; currentId = clientId; notify();
            if (lastActivity) send(lastActivity);
          }
          if (msg?.evt === 'ERROR') { /* e.g. an invalid client id: stop trying that id */ }
        }
      });
      s.on('close', () => { if (sock === s) { sock = null; ready = false; notify(); scheduleRetry(clientId); } });
      s.on('error', () => {}); // after connect, let 'close' drive reconnection
    });
  };
  attempt();
}

function scheduleRetry(clientId) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => tryConnect(clientId), 15000); // Discord may just not be running yet / was just closed
}

function send(activity) {
  if (!sock || !ready) return;
  try {
    sock.write(frame(1, { cmd: 'SET_ACTIVITY', args: { pid: process.pid, activity }, nonce: crypto.randomUUID() }));
  } catch {}
}

/** Start (or restart with a new client id) the connection. Safe to call repeatedly. */
function connect(clientId) {
  const id = String(clientId || DEFAULT_CLIENT_ID).trim() || DEFAULT_CLIENT_ID;
  if (id === currentId && (ready || connecting)) return;
  disconnect();
  currentId = id;
  tryConnect(id);
}

function disconnect() {
  clearTimeout(retryTimer);
  connecting = false; ready = false; lastActivity = null;
  try { sock?.destroy(); } catch {}
  sock = null;
}

/**
 * setActivity({ details, state, startedAt, largeText, button })
 * - details: top line (e.g. "Playing Elden Ring")
 * - state: second line (e.g. "via Gjallarhorn")
 * - startedAt: ms epoch -> Discord shows a live "00:04 elapsed" counter
 * - button: { label, url } - one button, e.g. "View on Steam"
 */
function setActivity(a) {
  const activity = {
    details: String(a.details || '').slice(0, 128) || undefined,
    state: String(a.state || '').slice(0, 128) || undefined,
    timestamps: a.startedAt ? { start: Math.floor(a.startedAt / 1000) } : undefined,
    assets: { large_image: 'gjallarhorn_logo', large_text: a.largeText || 'Gjallarhorn' },
    buttons: a.button?.url ? [{ label: a.button.label || 'Open', url: a.button.url }] : undefined,
    instance: false,
  };
  lastActivity = activity;
  send(activity);
}

function clearActivity() { lastActivity = null; send(null); }

module.exports = { connect, disconnect, setActivity, clearActivity, onState, state, DEFAULT_CLIENT_ID };
