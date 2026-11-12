// Zero-dependency static server for local play:  node server.js  [port]
// (GitHub Pages doesn't use this — it serves the files directly.)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 8000);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8',
  '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.ogg': 'audio/ogg', '.woff2': 'font/woff2',
};

// ---------- Wi-Fi / hotspot rooms: a tiny WebSocket relay (no internet needed) ----------
// The host's browser runs the race; this only passes messages between the host and the players in its room.
const rooms = new Map(); // code → { host: socket, name, peers: Map(id → socket), created }
let nextPeer = 1;
function lanApi(urlPath, res) {
  const json = obj => { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  if (urlPath.endsWith('/lan/ping')) return json({ ok: true }), true;
  if (urlPath.endsWith('/lan/rooms')) return json([...rooms].map(([code, r]) => ({ code, name: r.name, players: r.peers.size + 1 }))), true;
  return false;
}
function wsAccept(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) return socket.destroy();
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  let buf = Buffer.alloc(0);
  socket.sendJSON = obj => {
    if (socket.destroyed) return;
    const data = Buffer.from(JSON.stringify(obj));
    const n = data.length, head = n < 126 ? Buffer.from([0x81, n]) : n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255]) : Buffer.concat([Buffer.from([0x81, 127, 0, 0, 0, 0]), Buffer.from([n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255])]);
    socket.write(Buffer.concat([head, data]));
  };
  socket.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const op = buf[0] & 15, masked = buf[1] & 128;
      let len = buf[1] & 127, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = buf.readUInt32BE(6); off = 10; }
      const end = off + (masked ? 4 : 0) + len;
      if (buf.length < end) return;
      let payload = buf.subarray(off + (masked ? 4 : 0), end);
      if (masked) { const mask = buf.subarray(off, off + 4); payload = Buffer.from(payload.map((b, i) => b ^ mask[i & 3])); }
      buf = buf.subarray(end);
      if (op === 8) return socket.end();                                   // close
      if (op === 9) { socket.write(Buffer.from([0x8a, 0])); continue; }    // ping → pong
      if (op === 1) { try { onWsMessage(socket, JSON.parse(payload.toString())); } catch (e) { /* bad message */ } }
    }
  });
  socket.on('close', () => onWsClose(socket));
  socket.on('error', () => socket.destroy());
}
function onWsMessage(s, m) {
  if (m.op === 'host') {
    let code; do { code = String(1000 + Math.floor(Math.random() * 9000)); } while (rooms.has(code));
    rooms.set(code, { host: s, name: String(m.name || 'Room').slice(0, 14), peers: new Map(), created: Date.now() });
    s.room = code; s.isHost = true; s.sendJSON({ op: 'hosted', code });
  } else if (m.op === 'join') {
    const r = rooms.get(String(m.code));
    if (!r) return s.sendJSON({ op: 'nojoin' });
    s.room = String(m.code); s.id = nextPeer++; r.peers.set(s.id, s);
    s.sendJSON({ op: 'joined' }); r.host.sendJSON({ op: 'peer-join', id: s.id });
  } else if (m.op === 'msg') {                                            // player → host
    const r = rooms.get(s.room); if (r) r.host.sendJSON({ op: 'from', id: s.id, msg: m.msg });
  } else if (m.op === 'to' && s.isHost) {                                 // host → one player
    const r = rooms.get(s.room), p = r && r.peers.get(m.id); if (p) p.sendJSON({ op: 'msg', msg: m.msg });
  } else if (m.op === 'kick' && s.isHost) {
    const r = rooms.get(s.room), p = r && r.peers.get(m.id); if (p) setTimeout(() => p.end(), 200);
  }
}
function onWsClose(s) {
  const r = rooms.get(s.room); if (!r) return;
  if (s.isHost) { for (const p of r.peers.values()) p.sendJSON({ op: 'host-gone' }); rooms.delete(s.room); }
  else if (r.peers.delete(s.id)) r.host.sendJSON({ op: 'peer-leave', id: s.id });
}

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (lanApi(urlPath, res)) return;
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT + path.sep) || path.basename(file).startsWith('.') || path.basename(file) === 'server.js') {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

server.on('upgrade', (req, socket) => { if (req.url.split('?')[0].endsWith('/lan')) wsAccept(req, socket); else socket.destroy(); });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  বন্ধু দৌড় — Buddy Race 3D\n  Local:   http://localhost:${PORT}`);
  // show LAN address so you can open it on your phone (same Wi-Fi)
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) console.log(`  Phone:   http://${a.address}:${PORT}`);
  }
  console.log('\n  Wi-Fi / hotspot rooms work here with no internet: everyone opens the Phone address above.');
  console.log('\n  Ctrl+C to stop\n');
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} is busy — try: node server.js ${PORT + 1}`);
  else console.error(e);
  process.exit(1);
});
