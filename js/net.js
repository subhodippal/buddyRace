// Multiplayer. The room creator is the "host": it runs the race simulation and streams it to everyone else.
// Two transports with the same interface (a "conn" has .open, .send(msg), .close()):
//   • online  — WebRTC through PeerJS. Works on static hosting like GitHub Pages: the free PeerJS cloud server only
//               introduces players, game data goes browser-to-browser (directly over the Wi-Fi when you share one).
//   • lan     — WebSocket relay built into server.js. For a Wi-Fi / phone-hotspot room with NO internet: one laptop
//               runs `node server.js` and everyone opens its address. Rooms are listed, no code needed.
// Matchmaking ("find online match") uses a few well-known public room ids: join the first one with a free seat,
// or open one and wait for strangers.
const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'buddyrace3d-room-';
const PUBLIC = 'buddyrace3d-pub-', PUBLIC_SLOTS = 6;

export const net = { active: false, host: false, code: '', mySlot: 0, mode: '' }; // mode: room | public | lan
let peer = null, hostConn = null, ws = null;
const conns = new Set();

// ---------------- online (PeerJS) ----------------
function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = PEERJS_URL; s.onload = () => res(); s.onerror = () => rej(new Error('ইন্টারনেট পাওয়া যাচ্ছে না'));
    document.head.appendChild(s);
  });
}
function openPeer(id) {
  return new Promise((res, rej) => {
    const p = id ? new window.Peer(id, { debug: 0 }) : new window.Peer({ debug: 0 });
    const t = setTimeout(() => rej(new Error('সার্ভার সাড়া দিচ্ছে না — আবার চেষ্টা করো')), 12000);
    p.once('open', () => { clearTimeout(t); res(p); });
    p.once('error', e => { clearTimeout(t); p.destroy(); rej(e); });
  });
}
const genCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[(Math.random() * 24) | 0]).join('');
function hostOn(p, h) {
  p.on('connection', conn => {
    conn.on('open', () => { conns.add(conn); h.onJoin(conn); });
    conn.on('data', d => h.onData(conn, d));
    conn.on('close', () => { if (conns.delete(conn)) h.onLeave(conn); });
    conn.on('error', () => { if (conns.delete(conn)) h.onLeave(conn); });
  });
  p.on('disconnected', () => { try { p.reconnect(); } catch (e) { /* ignore */ } });
  p.on('error', e => h.onError && h.onError(e));
}

// handlers: { onJoin(conn), onData(conn, msg), onLeave(conn), onError(err) }
export async function hostRoom(h) {
  await loadPeerJS();
  let code;
  for (let tries = 0; ; tries++) {
    code = genCode();
    try { peer = await openPeer(PREFIX + code); break; } catch (e) { if (e.type !== 'unavailable-id' || tries > 4) throw e; }
  }
  Object.assign(net, { active: true, host: true, code, mySlot: 0, mode: 'room' });
  hostOn(peer, h);
  return code;
}

// Connect to a host; resolves once the host has answered 'welcome' (rejects on 'full' / not found).
function connectTo(id, ch, timeout = 12000) {
  return new Promise((res, rej) => {
    const conn = peer.connect(id, { reliable: true });
    let done = false;
    const fail = e => { if (done) return; done = true; clearTimeout(t); peer.off('error', onErr); try { conn.close(); } catch (x) { /* */ } rej(e); };
    const onErr = e => { if (e.type === 'peer-unavailable' && String(e.message || '').includes(id)) fail(new Error('রুম পাওয়া যায়নি')); };
    const t = setTimeout(() => fail(new Error('রুম পাওয়া যায়নি')), timeout);
    peer.on('error', onErr);
    conn.on('data', d => {
      if (!done) {
        if (d && d.t === 'full') return fail(Object.assign(new Error('রুম ভর্তি, বা দৌড় শুরু হয়ে গেছে'), { full: true }));
        done = true; clearTimeout(t); peer.off('error', onErr);
        hostConn = conn;
        conn.on('close', () => { if (net.active && hostConn === conn) ch.onClose(); });
        res(conn);
      }
      ch.onData(d);
    });
    conn.on('close', () => fail(new Error('রুম বন্ধ হয়ে গেছে')));
  });
}

// handlers: { onData(msg), onClose() }
export async function joinRoom(code, h) {
  if (code.startsWith('L-')) return lanJoin(code.slice(2), h);
  await loadPeerJS();
  peer = await openPeer();
  try { await connectTo(PREFIX + code.trim().toUpperCase(), h); }
  catch (e) { leave(); throw e; }
  Object.assign(net, { active: true, host: false, code: code.toUpperCase(), mode: 'room' });
}

// Find a match with people online: join a public room that has a free seat, otherwise open one.
// status(text) reports progress. Resolves { host: true } or { host: false }.
export async function findMatch(hostH, joinH, status = () => {}) {
  await loadPeerJS();
  status('অনলাইনে খেলোয়াড় খোঁজা হচ্ছে…');
  peer = await openPeer();
  const order = Array.from({ length: PUBLIC_SLOTS }, (_, i) => i + 1);
  for (const n of order) {
    if (!peer) throw new Error('বাতিল'); // left while searching
    try {
      await connectTo(PUBLIC + n, joinH, 8000);
      Object.assign(net, { active: true, host: false, code: 'PUB-' + n, mode: 'public' });
      return { host: false };
    } catch (e) { status(`রুম ${n}: ${e.full ? 'ভর্তি' : 'ফাঁকা'}…`); }
  }
  // nobody waiting: open a public room ourselves
  peer.destroy(); peer = null;
  for (const n of order) {
    try { peer = await openPeer(PUBLIC + n); } catch (e) { if (e.type === 'unavailable-id') continue; throw e; }
    Object.assign(net, { active: true, host: true, code: 'PUB-' + n, mySlot: 0, mode: 'public' });
    hostOn(peer, hostH);
    return { host: true };
  }
  throw new Error('সব পাবলিক রুম ব্যস্ত — একটু পরে আবার চেষ্টা করো');
}

// ---------------- Wi-Fi / hotspot (WebSocket relay in server.js) ----------------
const wsURL = () => (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + location.pathname.replace(/[^/]*$/, '') + 'lan';
export async function lanAvailable() {
  try { const r = await fetch('lan/ping', { cache: 'no-store' }); return r.ok && (await r.json()).ok === true; } catch (e) { return false; }
}
export async function lanRooms() {
  try { const r = await fetch('lan/rooms', { cache: 'no-store' }); return r.ok ? await r.json() : []; } catch (e) { return []; }
}
function openWS() {
  return new Promise((res, rej) => {
    const s = new WebSocket(wsURL());
    const t = setTimeout(() => { s.close(); rej(new Error('লোকাল সার্ভার সাড়া দিচ্ছে না')); }, 6000);
    s.onopen = () => { clearTimeout(t); res(s); };
    s.onerror = () => { clearTimeout(t); rej(new Error('লোকাল সার্ভারে যোগাযোগ হচ্ছে না')); };
  });
}
const wsSend = m => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
export async function lanHost(h, name) {
  ws = await openWS();
  const peers = new Map(); // id → conn
  const code = await new Promise((res, rej) => {
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.op === 'hosted') res(m.code);
      else if (m.op === 'peer-join') {
        const conn = { id: m.id, open: true, send: msg => wsSend({ op: 'to', id: m.id, msg }), close: () => { conn.open = false; wsSend({ op: 'kick', id: m.id }); } };
        peers.set(m.id, conn); conns.add(conn); h.onJoin(conn);
      } else if (m.op === 'from') { const c = peers.get(m.id); if (c) h.onData(c, m.msg); }
      else if (m.op === 'peer-leave') { const c = peers.get(m.id); if (c) { c.open = false; peers.delete(m.id); if (conns.delete(c)) h.onLeave(c); } }
    };
    ws.onclose = () => rej(new Error('লোকাল সার্ভার বন্ধ হয়ে গেছে'));
    wsSend({ op: 'host', name });
  });
  Object.assign(net, { active: true, host: true, code: 'L-' + code, mySlot: 0, mode: 'lan' });
  return code;
}
async function lanJoin(code, h) {
  ws = await openWS();
  await new Promise((res, rej) => {
    let joined = false, ok = false;
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.op === 'nojoin') return rej(new Error('রুম পাওয়া যায়নি'));
      if (m.op === 'joined') { joined = true; return; }
      if (m.op === 'host-gone') { if (ok) h.onClose(); else rej(new Error('রুম বন্ধ হয়ে গেছে')); return; }
      if (m.op === 'msg' && joined) {
        if (!ok) { if (m.msg && m.msg.t === 'full') return rej(new Error('রুম ভর্তি, বা দৌড় শুরু হয়ে গেছে')); ok = true; res(); }
        h.onData(m.msg);
      }
    };
    ws.onclose = () => { if (ok) { if (net.active) h.onClose(); } else rej(new Error('লোকাল সার্ভার বন্ধ হয়ে গেছে')); };
    wsSend({ op: 'join', code });
  }).catch(e => { leave(); throw e; });
  hostConn = { open: true, send: msg => wsSend({ op: 'msg', msg }), close: () => {} };
  Object.assign(net, { active: true, host: false, code: 'L-' + code, mode: 'lan' });
}

// ---------------- common ----------------
export function send(msg) { if (hostConn && hostConn.open) hostConn.send(msg); }          // client → host
export function sendTo(conn, msg) { if (conn.open) conn.send(msg); }                       // host → one
export function broadcast(msg) { for (const c of conns) if (c.open) c.send(msg); }        // host → all
export function leave() {
  Object.assign(net, { active: false, host: false, code: '', mySlot: 0, mode: '' });
  for (const c of conns) { try { c.close(); } catch (e) { /* */ } }
  conns.clear();
  if (hostConn) { try { hostConn.close(); } catch (e) { /* */ } }
  hostConn = null;
  if (peer) peer.destroy();
  peer = null;
  if (ws) { ws.onclose = null; ws.close(); }
  ws = null;
}
