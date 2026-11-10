// Scenery built in chunks along the curved track: campus → city → market → village → riverside/bridge.
// Generation is seeded per chunk so every player in a multiplayer room sees the same world.
import * as THREE from 'three';
import { mat, mesh, boxG, makeNPC, makeBoat } from './models.js';

export const CHUNK = 40;
const BN_FONT = '"Noto Sans Bengali", "Baloo Da 2", sans-serif';

// seeded RNG (mulberry32); R is swapped per chunk
function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
let R = Math.random;
const rand = (a, b) => a + R() * (b - a);
const pick = a => a[(R() * a.length) | 0];

// ---------- canvas textures ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function fitText(g, text, maxW, size, weight = 800) {
  let s = size;
  do { g.font = `${weight} ${s}px ${BN_FONT}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}
export function signTexture(text, bg, fg, sub = '', w = 512, h = 140) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    fitText(g, text, w - 40, sub ? h * 0.5 : h * 0.62);
    g.fillText(text, w / 2, sub ? h * 0.42 : h * 0.54);
    if (sub) { fitText(g, sub, w - 60, h * 0.2, 600); g.fillText(sub, w / 2, h * 0.8); }
  });
}
const noise = (g, w, h, n, cols) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(Math.random() * cols.length) | 0]; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } };

const SHOPS = [
  ['মিষ্টির দোকান', 'রসগোল্লা • সন্দেশ'], ['চায়ের দোকান', 'ভাঁড়ের চা ৫ টাকা'], ['মা তারা ভাণ্ডার', 'মুদিখানা'],
  ['জয় মা কালী হোটেল', 'ভাত • মাছ • ডাল'], ['ফুচকা কর্নার', 'টক জল ফ্রি'], ['কাকুর তেলেভাজা', 'বেগুনি • আলুর চপ'],
  ['বিরিয়ানি হাউস', 'আলু সহ'], ['সাইকেল সারাই', 'পাংচার হয়'], ['পান বিড়ি', ''], ['মোবাইল রিচার্জ', 'জেরক্স হয়'],
  ['দাদার রোল সেন্টার', 'এগ রোল • চিকেন রোল'], ['শাড়ি ঘর', 'তাঁত • বালুচরী'], ['ওষুধের দোকান', '২৪ ঘণ্টা খোলা'],
  ['লুচি আলুর দম', 'গরম গরম'], ['ঝালমুড়ি', ''], ['মাছের বাজার', 'ইলিশ • রুই • কাতলা'], ['বইঘর', 'পুরোনো বই'],
  ['সেলুন', 'চুল কাটা ৫০ টাকা'], ['ঘুগনি স্টল', ''], ['মিষ্টি দই', 'খাঁটি'],
];
const SIGN_COLORS = [['#ffd400', '#b3001b'], ['#ffffff', '#0b3d91'], ['#c0001a', '#ffffff'], ['#0b7a3e', '#ffffff'],
  ['#1e3a8a', '#ffe14a'], ['#ff7a00', '#ffffff'], ['#fff1c1', '#7a1f00'], ['#6a1b9a', '#fff176']];
const HOARDINGS = [
  ['ভালো হচ্ছে না কিন্তু!', 'দৌড়াও কলকাতা'], ['ধর ধর!', 'বন্ধু দৌড় ২০২৬'], ['শহর পরিষ্কার রাখুন', ''],
  ['সাবধানে চলুন', 'জীবন অমূল্য'], ['গরম চা, গরম শিঙাড়া', 'মোড়ের দোকানে'], ['ধরে কেলাবো!', ''],
  ['কলকাতা, প্রাণের শহর', ''], ['আজ ফুটবল ম্যাচ!', 'সন্ধ্যা ৬টা, পাড়ার মাঠ'],
];
const MARKET_BANNERS = [['হাট বাজার', 'সোম থেকে রবি'], ['টাটকা সবজি', 'ন্যায্য দামে'], ['মাছ-মাংস-ডিম', ''], ['পুজোর সেল!', '৫০% ছাড়']];

let T = null;
function buildTextures() {
  T = {};
  T.road = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#55555a'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 2500, ['#5f5f64', '#4c4c50', '#6a6a6e']);
    for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(30,30,30,.25)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 30, 8 + Math.random() * 20, Math.random() * 3, 0, 7); g.fill(); }
    g.fillStyle = '#f2f2f2'; for (let y = 0; y < h; y += 128) g.fillRect(w / 2 - 4, y + 20, 8, 70);
    g.fillStyle = '#e8c547'; g.fillRect(6, 0, 6, h); g.fillRect(w - 12, 0, 6, h);
  }, true);
  T.path = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#b9a58a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) for (let x = (y / 32 % 2) * 16; x < w; x += 32) { g.fillStyle = Math.random() < 0.5 ? '#c4b196' : '#ab977c'; g.fillRect(x + 1, y + 1, 30, 30); }
  }, true);
  T.soil = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#9b6b3f'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 4000, ['#8a5c34', '#a8784a', '#7d532e', '#b4875a']);
    g.fillStyle = 'rgba(70,40,20,.35)'; g.fillRect(w * 0.27, 0, 18, h); g.fillRect(w * 0.66, 0, 18, h); // cart-wheel ruts
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(80,110,60,.5)'; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 12, 26, 0, 0, 7); g.fill(); }
  }, true);
  T.grass = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#69b345'; g.fillRect(0, 0, w, h); noise(g, w, h, 700, ['#5ea23d', '#78c252', '#4f8f33']); }, true);
  T.paddy = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#7ccf4a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = y % 16 ? '#8ede55' : '#5fae35'; g.fillRect(0, y, w, 4); }
    g.fillStyle = '#9b7b4a'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
  }, true);
  T.dust = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#a49c88'; g.fillRect(0, 0, w, h); noise(g, w, h, 900, ['#968e7a', '#b2aa96', '#8a8270']); }, true);
  T.water = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#4f8fa8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 4, x + 16, y); g.stroke(); }
  }, true);
  T.walk = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#a7a39a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8c887f'; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); }
  }, true);
  T.windows = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 6, 18);
    g.fillStyle = '#4e6b52'; g.fillRect(34, 30, 60, 70); g.fillStyle = '#2c3a33'; g.fillRect(44, 36, 40, 58);
    g.strokeStyle = '#d6d6d6'; g.lineWidth = 3; for (let x = 48; x < 84; x += 8) { g.beginPath(); g.moveTo(x, 36); g.lineTo(x, 94); g.stroke(); }
    g.fillStyle = '#dcdcdc'; g.fillRect(28, 100, 72, 8);
  }, true);
  T.brick = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9e2da'; g.fillRect(30, 26, 68, 76);
    g.fillStyle = '#5c7a99'; g.fillRect(38, 32, 52, 64); g.fillStyle = '#e9e2da'; g.fillRect(62, 32, 4, 64); g.fillRect(38, 62, 52, 4);
  }, true);
  T.mud = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#b07a4a'; g.fillRect(0, 0, w, h); noise(g, w, h, 300, ['#9c6a3e', '#c08a58']); g.fillStyle = '#f2ead8'; g.fillRect(0, h - 10, w, 10); });
  T.shutter = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#8d9196'; g.fillRect(0, 0, w, h); g.fillStyle = '#6b6f74'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2); });
  T.shopInside = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#3b2a1a'; g.fillRect(0, 0, w, h);
    const items = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#e67e22', '#ecf0f1'];
    for (let r = 0; r < 3; r++) { g.fillStyle = '#6b4a2a'; g.fillRect(0, 14 + r * 18, w, 3); for (let x = 4; x < w - 6; x += 9) { g.fillStyle = items[(Math.random() * 6) | 0]; g.fillRect(x, 4 + r * 18, 6, 10); } }
  });
  const sc = () => SIGN_COLORS[(Math.random() * SIGN_COLORS.length) | 0];
  T.signs = SHOPS.map(([t, s]) => { const [bg, fg] = sc(); return signTexture(t, bg, fg, s); });
  T.hoard = HOARDINGS.map(([t, s]) => { const [bg, fg] = sc(); return signTexture(t, bg, fg, s, 512, 220); });
  T.market = MARKET_BANNERS.map(([t, s]) => { const [bg, fg] = sc(); return signTexture(t, bg, fg, s, 512, 120); });
  T.gate = signTexture('বন্ধু মহাবিদ্যালয়', '#ffffff', '#8b1a1a', 'স্থাপিত ১৯৫৬', 768, 180);
  T.gateBack = signTexture('আবার আসবেন', '#ffffff', '#8b1a1a', 'ধন্যবাদ', 512, 140);
  T.campusSign = signTexture('কলেজ ক্যাম্পাস', '#0b5d1e', '#ffffff', 'ধীরে চলুন 😅', 512, 160);
  T.hostelSign = signTexture('ছাত্রাবাস', '#ffe9a8', '#5a2d0c', 'বয়েজ হোস্টেল', 512, 150);
  T.finish = signTexture('শেষ সীমানা', '#ffffff', '#c0001a', 'সুপার স্যার অপেক্ষা করছেন 👀', 768, 180);
  T.junction = signTexture('← সোজা: শেষ সীমানা', '#0b7a3e', '#ffffff', 'ডানদিকে: বড়বাজার →', 512, 160);
  T.bridge = signTexture('নদীর সেতু', '#1e3a8a', '#ffffff', 'সেতুর উপর দৌড়ানো নিষেধ 😅', 512, 150);
  T.village = signTexture('সবুজপুর গ্রাম', '#fff1c1', '#2d6a1f', 'স্বাগতম', 512, 150);
  T.checker = canvasTex(128, 32, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); } });
  T.checker.magFilter = THREE.NearestFilter;
  for (const k in T) { const v = T[k]; if (Array.isArray(v)) v.forEach(t => t.userData.shared = true); else v.userData.shared = true; }
}

const bgeoCache = new Map();
function buildingGeo(w, h, d, tile = 3) {
  const key = `${w.toFixed(1)},${h},${d.toFixed(1)}`;
  if (bgeoCache.has(key)) return bgeoCache.get(key);
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const scale = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const k = f * 4 + i; uv.setXY(k, uv.getX(k) * Math.max(1, Math.round(scale[f][0] / tile)), uv.getY(k) * Math.max(1, Math.round(scale[f][1] / tile)));
  }
  for (const f of [2, 3]) for (let i = 0; i < 4; i++) uv.setXY(f * 4 + i, 0.02, 0.02);
  geo.userData.shared = true;
  bgeoCache.set(key, geo);
  return geo;
}

const KOLKATA_COLORS = [0xf2d27a, 0xe8a87c, 0xb5d3a7, 0xa8c5e0, 0xefe1c6, 0xd98e8e, 0xf5e6a3, 0xc9b6e4, 0xf6c28b, 0xdedede];
const lam = (opts) => new THREE.MeshLambertMaterial(opts);
const basic = (map) => new THREE.MeshBasicMaterial({ map });

function plane(w, h, material, parent) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); if (parent) parent.add(m); return m; }
function sign2(w, h, map, parent) { // reads correctly from both sides
  const grp = new THREE.Group(); parent.add(grp);
  const m = basic(map); plane(w, h, m, grp); plane(w, h, m, grp).rotation.y = Math.PI;
  return grp;
}
const cg = new Map();
function cylG(a, b, h, seg = 8) { const k = `${a},${b},${h},${seg}`; if (!cg.has(k)) { const g = new THREE.CylinderGeometry(a, b, h, seg); g.userData.shared = true; cg.set(k, g); } return cg.get(k); }
const icoG = new THREE.IcosahedronGeometry(1.6, 0); icoG.userData.shared = true;
const coneG = new THREE.ConeGeometry(1, 1, 6); coneG.userData.shared = true;

function tree(g, x, z, s = 1) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); g.add(t);
  mesh(boxG(0.4, 2.6, 0.4), mat(0x6b4423), 0, 1.3, 0, t);
  const leaf = mat(pick([0x3f8f3a, 0x4ca64a, 0x2f7d32]));
  mesh(icoG, leaf, 0, 3.4, 0, t); mesh(icoG, leaf, 0.9, 2.9, 0.4, t).scale.setScalar(0.7); mesh(icoG, leaf, -0.8, 3.0, -0.3, t).scale.setScalar(0.65);
}
function palm(g, x, z, s = 1) { // coconut tree
  const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); g.add(t);
  const trunk = mesh(cylG(0.15, 0.22, 6, 6), mat(0x8d6e4a), 0.3, 3, 0, t); trunk.rotation.z = -0.1;
  for (let i = 0; i < 6; i++) { const f = mesh(boxG(0.5, 0.06, 2.6), mat(0x3e8e2f), 0.6, 6, 0, t); f.rotation.set(-0.5, i * 1.05, 0, 'YXZ'); f.translateZ(1.1); }
  for (let i = 0; i < 3; i++) mesh(icoG, mat(0x6b4f1a), 0.6 + Math.cos(i * 2) * 0.25, 5.7, Math.sin(i * 2) * 0.25, t).scale.setScalar(0.11);
}
function bananaTree(g, x, z) {
  const t = new THREE.Group(); t.position.set(x, 0, z); g.add(t);
  mesh(cylG(0.15, 0.2, 2.2, 6), mat(0x7a8b3a), 0, 1.1, 0, t);
  for (let i = 0; i < 5; i++) { const l = mesh(boxG(0.7, 0.05, 1.8), mat(0x5ea33a), 0, 2.3, 0, t); l.rotation.set(-0.6, i * 1.25, 0, 'YXZ'); l.translateZ(0.7); }
}
function hut(g, x, z, rot) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = rot; g.add(t);
  mesh(boxG(4, 2.4, 3.2), lam({ map: T.mud }), 0, 1.2, 0, t);
  const roof = mesh(coneG, mat(0xc9a14a), 0, 3.3, 0, t); roof.scale.set(3.4, 1.9, 2.8); roof.rotation.y = Math.PI / 4;
  mesh(boxG(0.9, 1.6, 0.06), mat(0x5d4037), 0, 0.8, 1.62, t);
  mesh(boxG(0.6, 0.5, 0.06), mat(0x3a2a1a), 1.3, 1.4, 1.62, t);
}
function haystack(g, x, z) { const h = mesh(coneG, mat(0xd8b65a), x, 1.2, z, g); h.scale.set(1.5, 2.4, 1.5); mesh(cylG(0.06, 0.06, 3), mat(0x6b4423), x, 1.5, z, g); }
function pond(g, x, z, r) {
  mesh(cylG(r + 0.5, r + 0.5, 0.06, 18), mat(0x7a5a3a), x, 0.03, z, g);
  return mesh(cylG(r, r, 0.1, 18), lam({ map: T.water }), x, 0.06, z, g);
}
function pole(g, x, z) {
  mesh(boxG(0.22, 8, 0.22), mat(0x6e6e6e), x, 4, z, g);
  mesh(boxG(1.6, 0.12, 0.12), mat(0x6e6e6e), x, 7.4, z, g);
  mesh(boxG(0.4, 0.5, 0.3), mat(0x444444), x, 6.6, z + 0.2, g);
}
const wireMat = new THREE.LineBasicMaterial({ color: 0x1a1a1a });
function wire(g, a, b, sag) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * sag, a.z + (b.z - a.z) * t)); }
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
}
function teaStall(g, x, z) {
  mesh(boxG(1.4, 0.9, 0.8), mat(0x8b5a2b), x, 0.7, z, g);
  mesh(cylG(0.15, 0.2, 0.35), mat(0x999999), x - 0.3, 1.33, z, g);
  for (let i = 0; i < 4; i++) mesh(cylG(0.05, 0.04, 0.1), mat(0xb5532c), x + 0.1 + i * 0.13, 1.2, z + 0.1, g);
  mesh(boxG(1.8, 0.06, 1.4), mat(0x2266aa), x, 2.4, z, g);
  mesh(boxG(0.06, 2.2, 0.06), mat(0x555555), x - 0.85, 1.3, z, g); mesh(boxG(0.06, 2.2, 0.06), mat(0x555555), x + 0.85, 1.3, z, g);
}
function marketStall(g, x, z) {
  mesh(boxG(1.6, 0.8, 3), mat(0x8b5a2b), x, 0.6, z, g);
  const cols = [0xe74c3c, 0x27ae60, 0xf1c40f, 0xe67e22, 0x8e44ad, 0xffffff, 0x2ecc71];
  for (let i = 0; i < 4; i++) mesh(boxG(0.6, 0.25, 0.6), mat(pick(cols)), x + (i % 2 ? 0.35 : -0.35), 1.12, z - 0.8 + (i >> 1) * 1.4, g);
  if (R() < 0.4) mesh(boxG(1.2, 0.15, 0.5), mat(0x9fb6c4), x, 1.1, z + 0.9, g); // fish on ice
  const um = mesh(coneG, mat(pick([0xe74c3c, 0x2e86de, 0xf39c12, 0x16a085, 0xffffff])), x, 2.9, z, g); um.scale.set(2.1, 0.6, 2.1);
  mesh(cylG(0.04, 0.04, 2.4), mat(0x555555), x, 1.7, z, g);
}
function ambassadorTaxi(g, x, z) {
  const y = mat(0xf2c200);
  mesh(boxG(1.6, 0.6, 3.8), y, x, 0.65, z, g);
  mesh(boxG(1.4, 0.55, 1.9), y, x, 1.2, z - 0.2, g);
  mesh(boxG(1.38, 0.4, 1.92), mat(0x223344), x, 1.2, z - 0.2, g).scale.set(1.01, 0.8, 0.9);
  for (const [dx, dz] of [[0.7, 1.2], [-0.7, 1.2], [0.7, -1.2], [-0.7, -1.2]]) { const w = mesh(cylG(0.33, 0.33, 0.25), mat(0x111111), x + dx, 0.33, z + dz, g); w.rotation.z = Math.PI / 2; }
}
function arch(g, half, tex, backTex, color = 0xb23a2a) {
  const span = half + 1.2;
  for (const x of [-span, span]) mesh(boxG(1.2, 8, 1.2), mat(color), x, 4, 0, g);
  mesh(boxG(span * 2 + 1.5, 1.2, 1.4), mat(color), 0, 8.2, 0, g);
  mesh(boxG(10.4, 2.8, 0.1), mat(0xffffff), 0, 6.4, 0, g);
  const s = plane(10, 2.4, basic(tex), g); s.position.set(0, 6.4, -0.07); s.rotation.y = Math.PI;
  if (backTex) { const b = plane(8, 2.2, basic(backTex), g); b.position.set(0, 6.4, 0.07); }
}

export class World {
  constructor(scene, track, seed) {
    this.scene = scene; this.track = track; this.seed = seed;
    this.chunks = new Map(); this.npcs = new Set();
    if (!T) buildTextures();
    this.mats = {
      road: lam({ map: T.road }), path: lam({ map: T.path }), soil: lam({ map: T.soil }), bridge: lam({ map: T.road }),
      grass: lam({ map: T.grass }), paddy: lam({ map: T.paddy }), dust: lam({ map: T.dust }), walk: lam({ map: T.walk }),
      water: lam({ map: T.water, color: 0xcfefff }), curb: lam({ color: 0xc9c9c9, side: THREE.DoubleSide }),
      deck: lam({ color: 0x8a8a8a, side: THREE.DoubleSide }), rail: lam({ color: 0xd8d8d8, side: THREE.DoubleSide }),
    };
    for (const k in this.mats) this.mats[k].userData.shared = true;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), lam({ color: 0x7f9a5a }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -3.2;
    scene.add(ground); this.ground = ground;
    const firstOther = track.segs.find(sg => sg.zone !== 'campus');
    this.gateS = track.segs[0].zone === 'campus' && firstOther ? firstOther.s0 : null; // college gate
    this.junctions = track.segs.filter(sg => sg.junction).map(sg => sg.s0 + sg.len / 2);
  }

  followGround(p) { this.ground.position.x = p.x; this.ground.position.z = p.z; }

  update(sMin, sMax) {
    const a = Math.floor(sMin / CHUNK), b = Math.floor(sMax / CHUNK);
    for (let i = a; i <= b; i++) if (i >= -2 && !this.chunks.has(i)) {
      const g = this.build(i); this.chunks.set(i, g);
      if (this.onStatic) for (const st of g.userData.statics) this.onStatic(st);
    }
    for (const [i, g] of this.chunks) if (i < a - 1 || i > b + 1) this.drop(i, g);
  }
  drop(i, g) {
    this.scene.remove(g); dispose(g); this.chunks.delete(i);
    for (const n of g.userData.npcs) { this.npcs.delete(n); n.dead = true; }
  }
  reset() { for (const [i, g] of this.chunks) this.drop(i, g); }
  destroy() { this.reset(); this.scene.remove(this.ground); this.ground.geometry.dispose(); }

  // ---- geometry that follows the curve ----
  ribbon(g, s0, s1, la, lb, y, material, opt = {}) {
    const tr = this.track, step = opt.step || 2, n = Math.max(1, Math.ceil((s1 - s0) / step));
    const P = new Float32Array((n + 1) * 6), U = new Float32Array((n + 1) * 4), I = [];
    const v = new THREE.Vector3(), f = (q, s) => typeof q === 'function' ? q(s) : q;
    for (let j = 0; j <= n; j++) {
      const s = s0 + (s1 - s0) * j / n, A = f(la, s), B = f(lb, s), yy = f(y, s);
      [[0, A], [1, B]].forEach(([k, lat]) => {
        tr.pos(s, lat, 0, v); if (opt.abs) v.y = yy; else v.y += yy;
        P.set([v.x, v.y, v.z], (j * 2 + k) * 3);
        U.set(opt.uWorld ? [lat / opt.uWorld, s / opt.uWorld] : [k, s / (opt.vScale || 20)], (j * 2 + k) * 2);
      });
      if (j < n) { const a = j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    geo.setIndex(I); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, material); g.add(m); return m;
  }
  wall(g, s0, s1, lat, y0, y1, material) { // vertical strip at a lateral offset
    const tr = this.track, n = Math.max(1, Math.ceil((s1 - s0) / 2));
    const P = [], I = [], v = new THREE.Vector3(), f = (q, s) => typeof q === 'function' ? q(s) : q;
    for (let j = 0; j <= n; j++) {
      const s = s0 + (s1 - s0) * j / n, L = f(lat, s);
      tr.pos(s, L, y0, v); P.push(v.x, v.y, v.z);
      tr.pos(s, L, y1, v); P.push(v.x, v.y, v.z);
      if (j < n) { const a = j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, material); g.add(m); return m;
  }
  anchor(g, s, lat = 0, y = 0) { const a = new THREE.Group(); this.track.place(a, s, lat, y); g.add(a); return a; }
  runs(s0, s1, key) { // split [s0,s1] into stretches that share key(s)
    const out = [], K = s => key(Math.max(0, Math.min(s, this.track.finish + 270)));
    let a = s0, cur = K(s0);
    for (let s = s0 + 2; s < s1; s += 2) { const k = K(s); if (k !== cur) { out.push([a, s, cur]); a = s; cur = k; } }
    out.push([a, s1, cur]);
    return out;
  }

  build(i) {
    R = mulberry32(this.seed * 100003 + (i + 10) * 7919);
    const g = new THREE.Group(), tr = this.track;
    const s0 = i * CHUNK, s1 = s0 + CHUNK;
    const statics = [], npcs = [];
    g.userData.statics = statics; g.userData.npcs = npcs;
    const H = s => tr.half(Math.max(0, s));
    const zoneAt = s => tr.zone(Math.max(0, Math.min(s, tr.finish + 270)));

    for (const [a, b, surf] of this.runs(s0, s1, s => tr.seg(s).surface)) {
      this.ribbon(g, a, b, s => -H(s), H, 0.01, this.mats[surf === 'asphalt' ? 'road' : surf] || this.mats.road);
    }
    for (const [a, b, zone] of this.runs(s0, s1, s => tr.seg(s).zone)) this.sides(g, a, b, zone, H);
    for (const side of [1, -1]) this.props(g, side, s0, s1, H, zoneAt, statics, npcs);

    const zc = zoneAt(s0 + 2); // electric poles + tangled wires in town
    if (zc === 'city' || zc === 'market') {
      const A = new THREE.Vector3(), B = new THREE.Vector3();
      for (const side of [1, -1]) {
        const lat0 = side * (H(s0 + 2) + 0.8), lat1 = side * (H(s1 + 2) + 0.8);
        pole(this.anchor(g, s0 + 2), lat0, 0);
        if (zoneAt(s1 + 2) === zc) {
          wire(g, tr.pos(s0 + 2, lat0, 7.4, A).clone(), tr.pos(s1 + 2, lat1, 7.4, B).clone(), 0.8);
          wire(g, tr.pos(s0 + 2, lat0 + side * 0.6, 7.3, A).clone(), tr.pos(s1 + 2, lat1 + side * 0.6, 7.3, B).clone(), 1.1);
        }
      }
      wire(g, tr.pos(s0 + 2, H(s0 + 2) + 0.8, 7.4, A).clone(), tr.pos(s0 + 2.5, -H(s0 + 2) - 0.8, 7.2, B).clone(), 1.2);
      if (zc === 'market' && R() < 0.7) {
        const bn = sign2(Math.min(9, H(s0 + 20) * 2 - 0.5), 1.1, pick(T.market), this.anchor(g, s0 + 20)); bn.position.y = 5.2;
      }
    }

    if (s0 <= 2 && 2 < s1) {
      const st = plane(1, 1, basic(T.checker), this.anchor(g, 2)); st.scale.set(H(2) * 2, 1, 1); st.rotation.x = -Math.PI / 2; st.position.y = 0.03;
    }
    if (s0 <= 25 && 25 < s1 && tr.zone(25) === 'campus') { const cs = sign2(5, 1.6, T.campusSign, this.anchor(g, 25, -(H(25) + 2.5))); cs.position.y = 2.6; }
    if (s0 <= -16 && -16 < s1) { // hostel behind the start line
      const an = this.anchor(g, -16);
      mesh(buildingGeo(16, 9, 8), lam({ color: 0xe8c070, map: T.windows }), 0, 4.5, -2, an);
      const hs = sign2(6, 1.7, T.hostelSign, an); hs.position.set(0, 6.2, 2.1);
    }
    if (this.gateS !== null && s0 <= this.gateS && this.gateS < s1) arch(this.anchor(g, this.gateS), H(this.gateS), T.gate, T.gateBack);
    for (const sj of this.junctions) if (s0 <= sj && sj < s1) this.junction(g, sj, H);
    const segV = tr.segs.find(sg => sg.zone === 'village');
    if (segV && s0 <= segV.s0 + 10 && segV.s0 + 10 < s1) { const vs = sign2(4.5, 1.4, T.village, this.anchor(g, segV.s0 + 10, -(H(segV.s0 + 10) + 2))); vs.position.y = 2.2; }
    const segB = tr.segs.find(sg => sg.zone === 'bridge');
    if (segB && s0 <= segB.s0 - 6 && segB.s0 - 6 < s1) { const bs = sign2(4.5, 1.4, T.bridge, this.anchor(g, segB.s0 - 6, H(segB.s0) + 2)); bs.position.y = 2.4; }
    const F = tr.finish;
    if (s0 <= F && F < s1) {
      arch(this.anchor(g, F), H(F), T.finish, null, 0xe0a200);
      const st = plane(1, 1.6, basic(T.checker), this.anchor(g, F)); st.scale.x = H(F) * 2; st.rotation.x = -Math.PI / 2; st.position.y = 0.04;
    }
    this.scene.add(g);
    return g;
  }

  sides(g, a, b, zone, H) {
    const M = this.mats, far = s => H(s) + 55;
    const both = (inner, outer, y, m, opt) => {
      this.ribbon(g, a, b, inner, outer, y, m, opt);
      this.ribbon(g, a, b, s => -outer(s), s => -inner(s), y, m, opt);
    };
    if (zone === 'campus') {
      both(H, far, 0, M.grass, { uWorld: 8 });
      for (const sd of [1, -1]) this.wall(g, a, b, s => sd * H(s), 0, 0.2, M.curb);
    } else if (zone === 'city' || zone === 'market') {
      both(H, s => H(s) + 3.2, 0.2, M.walk, { uWorld: 3 });
      both(s => H(s) + 3.2, far, 0, M.dust, { uWorld: 10 });
      for (const sd of [1, -1]) this.wall(g, a, b, s => sd * H(s), 0, 0.2, M.curb);
    } else if (zone === 'village') {
      both(H, far, -0.02, R() < 0.5 ? M.paddy : M.grass, { uWorld: 6 });
    } else if (zone === 'river') {
      this.ribbon(g, a, b, H, s => H(s) + 5, 0, M.grass, { uWorld: 8 });
      this.ribbon(g, a, b, s => H(s) + 5, s => H(s) + 7, -0.2, M.dust, { uWorld: 4 });
      this.ribbon(g, a, b, s => H(s) + 7, s => H(s) + 90, -0.8, M.water, { uWorld: 12, abs: true });
      this.ribbon(g, a, b, s => -far(s), s => -H(s), 0, M.grass, { uWorld: 8 });
    } else if (zone === 'bridge') {
      this.ribbon(g, a, b, -95, 95, -2.4, M.water, { uWorld: 12, abs: true });
      for (const sd of [1, -1]) {
        this.wall(g, a, b, s => sd * H(s), -1.2, 0.02, M.deck);
        this.wall(g, a, b, s => sd * (H(s) + 0.05), 0.95, 1.12, M.rail);
        this.wall(g, a, b, s => sd * (H(s) + 0.05), 0.45, 0.55, M.rail);
      }
      const tr = this.track;
      for (let s = Math.ceil(a / 3) * 3; s < b; s += 3) for (const sd of [1, -1]) {
        const p = mesh(boxG(0.12, 1.1, 0.12), mat(0xd8d8d8)); tr.place(p, s, sd * (H(s) + 0.05), 0.55); g.add(p);
      }
      for (let s = Math.ceil(a / 24) * 24; s < b; s += 24) { const p = mesh(boxG(8, 6, 1.6), mat(0x9a948a)); tr.place(p, s, 0, -4.2); g.add(p); }
    }
  }

  junction(g, sj, H) { // Y-junction: a side road branches off to the right
    const tr = this.track, th = tr.th(sj) - 0.6, len = 80, w = 9;
    const start = tr.pos(sj, -H(sj) + 1, 0.012).clone();
    const geo = new THREE.PlaneGeometry(w, len); geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, this.mats.road);
    m.position.set(start.x + Math.sin(th) * len / 2, start.y, start.z + Math.cos(th) * len / 2); m.rotation.y = th;
    g.add(m);
    const an = this.anchor(g, sj - 6, -(H(sj) + 1.6));
    const sg = sign2(4.2, 1.3, T.junction, an); sg.position.y = 2.6;
    mesh(boxG(0.12, 2.2, 0.12), mat(0x333333), 0, 1.1, 0, an);
  }

  props(g, side, s0, s1, H, zoneAt, statics, npcs) {
    const tr = this.track;
    const skip = s => this.junctions.some(sj => side < 0 && s > sj - 12 && s < sj + 30) || (this.gateS !== null && Math.abs(s - this.gateS) < 4) || Math.abs(s - tr.finish) < 4;
    let s = s0 + rand(0, 2);
    while (s < s1 - 2) {
      if (skip(s) || s < -6) { s += 3; continue; }
      const zone = zoneAt(s);
      if (zone === 'city') s += this.cityBuilding(g, side, s, H, statics, npcs);
      else if (zone === 'market') s += this.marketBlock(g, side, s, H, npcs);
      else if (zone === 'campus') s += this.campusBit(g, side, s, H, npcs);
      else if (zone === 'village') s += this.villageBit(g, side, s, H, npcs);
      else if (zone === 'river') s += this.riverBit(g, side, s, H, npcs);
      else s += 6;
    }
  }

  npc(g, npcs, s, lat, y = 0) {
    const n = makeNPC();
    this.anchor(g, s, lat, y).add(n.root);
    n.root.rotation.y = (lat > 0 ? -Math.PI / 2 : Math.PI / 2) + rand(-0.5, 0.5); // face the road
    const o = { x: lat, z: s, y, m: n, talkT: rand(0, 3), phase: R() * 6 };
    npcs.push(o); this.npcs.add(o);
    return o;
  }

  cityBuilding(g, side, s, H, statics, npcs) {
    const w = rand(6, 10), h = pick([6, 9, 9, 12, 15]), d = 8, sc = s + w / 2;
    const an = this.anchor(g, sc);
    const fx = side * (H(sc) + 3.2), face = fx - side * 0.02;
    mesh(buildingGeo(d, h + 3, w), lam({ color: pick(KOLKATA_COLORS), map: T.windows }), fx + side * d / 2, (h - 3) / 2, 0, an);
    const inside = plane(w - 1.2, 2.4, basic(R() < 0.75 ? T.shopInside : T.shutter), an); inside.position.set(face, 1.3, 0); inside.rotation.y = -side * Math.PI / 2;
    const sign = plane(w - 0.6, 1.3, basic(pick(T.signs)), an); sign.position.set(face - side * 0.05, 3.25, 0); sign.rotation.y = -side * Math.PI / 2;
    if (R() < 0.55) { const ps = sign2(2.6, 0.75, pick(T.signs), an); ps.position.set(face - side * 1.5, 4.6, -w / 2 + 0.5); }
    if (R() < 0.6) { const aw = mesh(boxG(1.4, 0.08, w - 0.4), mat(pick([0x2e86de, 0xe74c3c, 0x27ae60, 0xf39c12])), face - side * 0.7, 2.55, 0, an); aw.rotation.z = side * 0.25; }
    if (h >= 9 && R() < 0.7) {
      mesh(boxG(1.0, 0.12, w * 0.6), mat(0xdddddd), face - side * 0.5, 6.0, 0, an);
      mesh(boxG(0.06, 0.8, w * 0.6), mat(0x2f4f3f), face - side * 1.0, 6.45, 0, an);
      if (R() < 0.6) for (let i = 0; i < 3; i++) mesh(boxG(0.05, 0.6, 0.5), mat(pick([0xe84393, 0x0984e3, 0xfdcb6e, 0xffffff])), face - side * 1.02, 6.4, -1 + i * 0.8, an);
      if (R() < 0.35) this.npc(g, npcs, sc, side * (H(sc) + 2.75), 6.06); // someone watching from the balcony
    }
    if (R() < 0.2) {
      const hd = sign2(6, 2.6, pick(T.hoard), an); hd.position.set(fx + side * 3, h + 2.2, 0);
      mesh(boxG(0.15, 1.6, 0.15), mat(0x555555), fx + side * 1.5, h + 0.8, 0.1, an); mesh(boxG(0.15, 1.6, 0.15), mat(0x555555), fx + side * 4.5, h + 0.8, 0.1, an);
    }
    if (R() < 0.3) teaStall(an, side * (H(sc) + 2.2), 0);
    if (R() < 0.65) this.npc(g, npcs, s + rand(1, w - 1), side * (H(sc) + rand(1.2, 2.8)), 0.2);
    if (R() < 0.18) tree(this.anchor(g, s + 1), side * (H(s) + 1.4), 0, 0.85);
    if (R() < 0.16) { // parked yellow taxi — solid
      const lat = side * (H(sc) - 0.75);
      ambassadorTaxi(this.anchor(g, sc), lat, 0);
      statics.push({ x: lat, z: sc, w: 0.8, d: 1.9, h: 1.9, kind: 'taxi' });
    }
    return w + rand(0.1, 0.8);
  }

  marketBlock(g, side, s, H, npcs) {
    const w = 4, sc = s + w / 2, an = this.anchor(g, sc);
    marketStall(an, side * (H(sc) + 1.6), 0);
    this.npc(g, npcs, sc + rand(-1, 1), side * (H(sc) + rand(2.6, 3.0)), 0.2);
    if (R() < 0.6) this.npc(g, npcs, sc + rand(-1.5, 1.5), side * (H(sc) + rand(0.4, 1.0)), 0.2);
    const bh = pick([5, 6, 8]);
    mesh(buildingGeo(6, bh + 3, w + 0.2), lam({ color: pick(KOLKATA_COLORS), map: T.windows }), side * (H(sc) + 6.2), (bh - 3) / 2, 0, an);
    if (R() < 0.5) { const sg = plane(w - 0.2, 1, basic(pick(T.signs)), an); sg.position.set(side * (H(sc) + 3.18), 3, 0); sg.rotation.y = -side * Math.PI / 2; }
    return w + 0.3;
  }

  campusBit(g, side, s, H, npcs) {
    const an = this.anchor(g, s + 10), b = H(s);
    for (let k = 0; k < 2; k++) tree(an, side * (b + rand(2.5, 7)), rand(-8, 8), rand(0.8, 1.2));
    const h = pick([9, 12]);
    mesh(buildingGeo(10, h, 18), lam({ color: 0xb5523b, map: T.brick }), side * (b + 16), h / 2, 0, an);
    mesh(boxG(10.6, 0.6, 18.6), mat(0xe9e2da), side * (b + 16), h + 0.3, 0, an);
    mesh(boxG(0.15, 4, 0.15), mat(0x2d2d2d), side * (b + 1), 2, -8, an);
    mesh(boxG(0.5, 0.25, 0.5), mat(0xfff3c4), side * (b + 1), 4.1, -8, an);
    if (R() < 0.7) this.npc(g, npcs, s + rand(2, 18), side * (b + rand(1.5, 4)));
    return 20;
  }

  villageBit(g, side, s, H, npcs) {
    const an = this.anchor(g, s + 6), r = R(), b = H(s);
    if (r < 0.3) hut(an, side * (b + rand(7, 12)), 0, rand(0, 6));
    else if (r < 0.45) pond(an, side * (b + rand(10, 16)), 0, rand(3, 5));
    else if (r < 0.6) haystack(an, side * (b + rand(5, 10)), 0);
    if (R() < 0.6) palm(an, side * (b + rand(2, 5)), rand(-3, 3), rand(0.8, 1.1));
    if (R() < 0.4) bananaTree(an, side * (b + rand(2.5, 6)), rand(-4, 4));
    if (R() < 0.35) { // bamboo fence
      for (let k = 0; k < 6; k++) mesh(cylG(0.05, 0.05, 1.2, 5), mat(0xc2a25a), side * (b + 1.5), 0.6, -3 + k, an);
      mesh(boxG(0.05, 0.05, 6), mat(0xc2a25a), side * (b + 1.5), 0.9, -0.5, an);
    }
    if (R() < 0.35) this.npc(g, npcs, s + rand(2, 10), side * (b + rand(1.2, 3)));
    return 12;
  }

  riverBit(g, side, s, H, npcs) {
    const an = this.anchor(g, s + 8), b = H(s);
    if (side > 0) { // river side: ghat steps and boats
      if (R() < 0.5) for (let k = 0; k < 4; k++) mesh(boxG(1, 0.25, 6), mat(0xb8b0a0), b + 5.5 + k * 0.6, -0.15 - k * 0.2, 0, an);
      if (R() < 0.55) { const bt = makeBoat(); bt.position.set(b + rand(14, 40), -0.75, rand(-5, 5)); bt.rotation.y = rand(-0.4, 0.4); an.add(bt); }
      if (R() < 0.5) this.npc(g, npcs, s + rand(3, 13), b + rand(1.5, 4));
    } else {
      tree(an, -(b + rand(3, 8)), rand(-5, 5), rand(0.9, 1.2));
      if (R() < 0.4) hut(an, -(b + rand(10, 16)), 0, rand(0, 6));
      if (R() < 0.4) this.npc(g, npcs, s + rand(3, 13), -(b + rand(1.5, 3.5)));
    }
    return 16;
  }
}

function dispose(g) {
  g.traverse(o => {
    if (!o.isMesh && !o.isLine) return;
    const gt = o.geometry.type;
    if (!o.geometry.userData.shared && (gt === 'BufferGeometry' || gt === 'PlaneGeometry')) o.geometry.dispose();
    const m = o.material;
    if (m && !m.userData.shared && m !== wireMat && (m.isMeshBasicMaterial || m.map)) m.dispose();
  });
}
