// Peer-to-peer multiplayer over WebRTC (PeerJS). Works on static hosting like GitHub Pages:
// the free PeerJS cloud server is only used to introduce players; game data goes browser-to-browser.
// The room creator is the "host": it runs the race simulation and streams it to everyone else.
const PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'buddyrace3d-room-';

export const net = { active: false, host: false, code: '', mySlot: 0 };
let peer = null, hostConn = null;
const conns = new Set();

function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = PEERJS_URL; s.onload = () => res(); s.onerror = () => rej(new Error('Could not reach the internet'));
    document.head.appendChild(s);
  });
}
function openPeer(id) {
  return new Promise((res, rej) => {
    const p = id ? new window.Peer(id, { debug: 0 }) : new window.Peer({ debug: 0 });
    const t = setTimeout(() => rej(new Error('Matchmaking server timed out — please try again')), 12000);
    p.once('open', () => { clearTimeout(t); res(p); });
    p.once('error', e => { clearTimeout(t); p.destroy(); rej(e); });
  });
}
const genCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[(Math.random() * 24) | 0]).join('');

// handlers: { onJoin(conn), onData(conn, msg), onLeave(conn), onError(err) }
export async function hostRoom(h) {
  await loadPeerJS();
  let code;
  for (let tries = 0; ; tries++) {
    code = genCode();
    try { peer = await openPeer(PREFIX + code); break; } catch (e) { if (e.type !== 'unavailable-id' || tries > 4) throw e; }
  }
  Object.assign(net, { active: true, host: true, code, mySlot: 0 });
  peer.on('connection', conn => {
    conn.on('open', () => { conns.add(conn); h.onJoin(conn); });
    conn.on('data', d => h.onData(conn, d));
    conn.on('close', () => { if (conns.delete(conn)) h.onLeave(conn); });
    conn.on('error', () => { if (conns.delete(conn)) h.onLeave(conn); });
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* ignore */ } });
  peer.on('error', e => h.onError && h.onError(e));
  return code;
}

// handlers: { onData(msg), onClose() }
export async function joinRoom(code, h) {
  await loadPeerJS();
  peer = await openPeer();
  const conn = peer.connect(PREFIX + code.trim().toUpperCase(), { reliable: true });
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('Room not found')), 12000);
    conn.on('open', () => { clearTimeout(t); res(); });
    peer.on('error', e => { clearTimeout(t); rej(e.type === 'peer-unavailable' ? new Error('Room not found') : e); });
  });
  hostConn = conn;
  Object.assign(net, { active: true, host: false, code: code.toUpperCase() });
  conn.on('data', d => h.onData(d));
  conn.on('close', () => { if (net.active) h.onClose(); });
}

export function send(msg) { if (hostConn && hostConn.open) hostConn.send(msg); }          // client → host
export function sendTo(conn, msg) { if (conn.open) conn.send(msg); }                       // host → one
export function broadcast(msg) { for (const c of conns) if (c.open) c.send(msg); }        // host → all
export function leave() {
  Object.assign(net, { active: false, host: false, code: '', mySlot: 0 });
  for (const c of conns) c.close();
  conns.clear();
  if (hostConn) hostConn.close();
  hostConn = null;
  if (peer) peer.destroy();
  peer = null;
}
