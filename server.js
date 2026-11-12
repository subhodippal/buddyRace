// Zero-dependency local server.
//   node server.js [port]          play on this computer and on phones on the same Wi-Fi (+ Wi-Fi / hotspot rooms)
//   node server.js --dev [port]    live testing on a phone: also HTTPS (gyro needs it), auto-reload when you save a
//                                  file, phone errors printed here, no offline cache, and a QR code to scan
// (GitHub Pages doesn't use this — it serves the files directly.)
const http = require('http');
const https = require('https');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const ROOT = __dirname;
const ARGS = process.argv.slice(2);
const DEV = ARGS.includes('--dev');
const PORT = Number(ARGS.find(a => /^\d+$/.test(a)) || process.env.PORT || 8000);
const HTTPS_PORT = PORT + 443; // 8000 → 8443
const lanIPs = () => Object.values(os.networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address);
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

// ---------- dev mode: live reload + phone console ----------
const devClients = new Set();
const DEV_SNIPPET = `<script>
window.__DEV__ = true; // dev server: no service worker, reload on save, errors go to the terminal
(() => {
  const es = new EventSource('__dev/events');
  es.onmessage = e => { if (e.data === 'reload') location.reload(); };
  const send = (kind, args) => { try { navigator.sendBeacon('__dev/log', JSON.stringify({ kind, ua: navigator.userAgent.replace(/^.*?\\(|\\).*$/g, '').slice(0, 40), msg: args.map(a => a instanceof Error ? a.stack || a.message : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') })); } catch (x) {} };
  for (const k of ['error', 'warn']) { const o = console[k]; console[k] = (...a) => { send(k, a); o.apply(console, a); }; }
  addEventListener('error', e => send('error', [e.error || e.message]));
  addEventListener('unhandledrejection', e => send('error', ['unhandled promise:', e.reason]));
  if (navigator.serviceWorker) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
})();
</script>`;
function devApi(req, urlPath, res) {
  if (urlPath.endsWith('/__dev/events')) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n'); devClients.add(res);
    req.on('close', () => devClients.delete(res));
    return true;
  }
  if (urlPath.endsWith('/__dev/log') && req.method === 'POST') {
    let body = ''; req.on('data', d => { body += d; if (body.length > 20000) req.destroy(); });
    req.on('end', () => {
      try { const m = JSON.parse(body); console.log(`  📱 ${m.kind === 'error' ? '\x1b[31m' : '\x1b[33m'}${m.kind}\x1b[0m [${m.ua}] ${m.msg}`); } catch (e) { /* ignore */ }
      res.writeHead(204); res.end();
    });
    return true;
  }
  return false;
}
let reloadTimer = 0;
function watchForChanges() {
  try {
    fs.watch(ROOT, { recursive: true }, (ev, name) => {
      if (!name || /(^|[\\/])(\.git|\.cert|node_modules|tools)([\\/]|$)|\.md$|~$|\.swp$/.test(name)) return;
      clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => { console.log(`  ↻ ${name} changed — reloading ${devClients.size} browser(s)`); for (const c of devClients) c.write('data: reload\n\n'); }, 150);
    });
  } catch (e) { console.log('  (file watching not available here — reload by hand)'); }
}

const handler = (req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  if (lanApi(urlPath, res)) return;
  if (DEV && devApi(req, urlPath, res)) return;
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT + path.sep) || path.relative(ROOT, file).split(path.sep).some(p => p.startsWith('.')) || path.basename(file) === 'server.js') {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    if (DEV && path.basename(file) === 'index.html') { // inject the live-reload / phone-console script
      const html = fs.readFileSync(file, 'utf8').replace('</body>', DEV_SNIPPET + '\n</body>');
      res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
      return res.end(req.method === 'HEAD' ? undefined : html);
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': DEV ? 'no-store' : 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
};
const onUpgrade = (req, socket) => { if (req.url.split('?')[0].endsWith('/lan')) wsAccept(req, socket); else socket.destroy(); };
const onError = port => e => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${port} is busy — try: node server.js ${DEV ? '--dev ' : ''}${PORT + 1}`);
  else console.error(e);
  process.exit(1);
};

// self-signed certificate for HTTPS on the LAN (made once with openssl, kept in .cert/)
function devCert() {
  const dir = path.join(ROOT, '.cert'), key = path.join(dir, 'key.pem'), cert = path.join(dir, 'cert.pem'), ipsFile = path.join(dir, 'ips.txt');
  const ips = ['127.0.0.1', ...lanIPs()].join(',');
  try {
    if (!fs.existsSync(cert) || fs.readFileSync(ipsFile, 'utf8') !== ips) { // new network address → new certificate
      fs.mkdirSync(dir, { recursive: true });
      const san = 'subjectAltName=DNS:localhost,' + ips.split(',').map(ip => 'IP:' + ip).join(',');
      execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-days', '825',
        '-subj', '/CN=Buddy Race dev server', '-addext', san], { stdio: 'ignore' });
      fs.writeFileSync(ipsFile, ips);
    }
    return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
  } catch (e) { return null; }
}

const server = http.createServer(handler);
server.on('upgrade', onUpgrade);
server.on('error', onError(PORT));
let secure = null;
if (DEV) {
  const creds = devCert();
  if (creds) { secure = https.createServer(creds, handler); secure.on('upgrade', onUpgrade); secure.on('error', onError(HTTPS_PORT)); secure.listen(HTTPS_PORT, '0.0.0.0'); }
  watchForChanges();
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = lanIPs();
  console.log(`\n  বাডি রেস — Buddy Race${DEV ? '   \x1b[33m[dev mode]\x1b[0m' : ''}\n  Local:   http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  Phone:   http://${ip}:${PORT}`); // same Wi-Fi as this computer
  if (DEV && secure) for (const ip of ips) console.log(`  Phone:   https://${ip}:${HTTPS_PORT}   ← use this one for gyro / install`);
  if (DEV && !secure) console.log('  (no HTTPS: openssl was not found — the gyro will not work on phones over plain http)');
  if (DEV && ips.length) {
    const url = secure ? `https://${ips[0]}:${HTTPS_PORT}/` : `http://${ips[0]}:${PORT}/`;
    try { console.log(`\n  Scan with the phone camera (${url}):\n` + require('./tools/qr.js').toTerminal(url)); } catch (e) { /* no QR */ }
    if (secure) console.log('  The phone will warn about the certificate (it is made on this computer): tap Advanced → Proceed / Visit.');
    console.log('  Saving a file reloads the game on every connected phone; phone errors show up here with 📱.');
  }
  if (!DEV) console.log('\n  Live testing on a phone (HTTPS, auto-reload, QR code):  npm run dev');
  console.log('\n  Wi-Fi / hotspot rooms work here with no internet: everyone opens the Phone address above.');
  console.log('\n  Ctrl+C to stop\n');
});
