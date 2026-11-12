// Scenery built in chunks along the curved track: campus → city → market → village → riverside/bridge.
// Generation is seeded per chunk so every player in a multiplayer room sees the same world.
import * as THREE from 'three';
import { mat, mesh, boxG, makeNPC, makeBoat, makeDog } from './models.js';
import { buildSight, SIGHT_KIND, SIGHT_ROOM, SIGHT_NAME, Train } from './kolkata.js';
import { SHOP_NAMES } from './stories.js';
import { CULVERT_HALF } from './track.js';

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

// Shop names come from shops.json → shopNames ("নাম | নিচের লেখা" adds a smaller second line).
const shopList = () => SHOP_NAMES.filter(x => typeof x === 'string' && x.trim())
  .map(x => { const [n, sub = ''] = x.split('|').map(t => t.trim()); return { name: n, sub }; });
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
  T.redsoil = canvasTex(256, 512, (g, w, h) => { // লাল মাটির রাস্তা
    g.fillStyle = '#b4532a'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 4500, ['#a04a24', '#c4643a', '#93401d', '#cf7448']);
    g.fillStyle = 'rgba(90,30,10,.35)'; g.fillRect(w * 0.26, 0, 16, h); g.fillRect(w * 0.68, 0, 16, h);
  }, true);
  T.construct = canvasTex(256, 512, (g, w, h) => { // half-dug road: gravel, patches, dug trenches
    g.fillStyle = '#8b8478'; g.fillRect(0, 0, w, h);
    noise(g, w, h, 5000, ['#9a9386', '#7a7468', '#a59e90', '#6e685e']);
    for (let i = 0; i < 6; i++) { g.fillStyle = Math.random() < 0.5 ? '#55555a' : '#5b4a36'; g.fillRect(Math.random() * w * 0.7, Math.random() * h, 40 + Math.random() * 60, 30 + Math.random() * 50); }
  }, true);
  T.workSign = signTexture('রাস্তার কাজ চলছে', '#ff6a00', '#111111', 'সাবধানে চলুন 🚧', 512, 150);
  T.barricade = canvasTex(128, 32, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff6a00'; g.fillRect(i * 16, 0, 16, h); } }, true);
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
  T.winLit = canvasTex(128, 128, (g, w, h) => { // the same window, lit from inside (used as an emissive map in the evening)
    g.fillStyle = '#000000'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd890'; g.fillRect(44, 36, 40, 58);
    g.fillStyle = '#000000'; for (let x = 48; x < 84; x += 8) g.fillRect(x - 1, 36, 2, 58);
  }, true);
  T.glow = canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
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
  const shops = shopList().filter(x => !FOOD[x.name]); // the food shops have their own buildings
  const fallback = [{ name: 'দোকান', sub: '' }];
  T.signs = (shops.length ? shops : fallback).map(({ name, sub }) => { const [bg, fg] = sc(); return signTexture(name, bg, fg, sub); });
  T.stallSigns = (shops.length ? shops : fallback).map(({ name }) => { const [bg, fg] = sc(); return signTexture(name, bg, fg, '', 512, 120); });
  T.food = {};
  for (const { name, sub } of shopList()) if (FOOD[name]) T.food[name] = signTexture(name, FOOD[name].bg, FOOD[name].fg, sub, 768, 190);
  T.hoard = HOARDINGS.map(([t, s]) => { const [bg, fg] = sc(); return signTexture(t, bg, fg, s, 512, 220); });
  T.market = MARKET_BANNERS.map(([t, s]) => { const [bg, fg] = sc(); return signTexture(t, bg, fg, s, 512, 120); });
  T.gate = signTexture('বন্ধু মহাবিদ্যালয়', '#ffffff', '#8b1a1a', 'স্থাপিত ১৯৫৬', 768, 180);
  T.gateBack = signTexture('আবার আসবেন', '#ffffff', '#8b1a1a', 'ধন্যবাদ', 512, 140);
  T.campusSign = signTexture('কলেজ ক্যাম্পাস', '#0b5d1e', '#ffffff', 'ধীরে চলুন 😅', 512, 160);
  T.hostelSign = signTexture('ছাত্রাবাস', '#ffe9a8', '#5a2d0c', 'বয়েজ হোস্টেল', 512, 150);
  T.finish = signTexture('হোস্টেলের গেট • শেষ সীমানা', '#ffffff', '#8b1a1a', 'সুপার স্যার অপেক্ষা করছেন 👀', 768, 180);
  T.junction = signTexture('← সোজা: শেষ সীমানা', '#0b7a3e', '#ffffff', 'ডানদিকে: বড়বাজার →', 512, 160);
  T.bridge = signTexture('নদীর সেতু', '#1e3a8a', '#ffffff', 'সেতুর উপর দৌড়ানো নিষেধ 😅', 512, 150);
  T.canal = T.water.clone(); T.canal.needsUpdate = true; T.canal.wrapS = T.canal.wrapT = THREE.RepeatWrapping; T.canal.repeat.set(8, 1);
  T.canalSign = signTexture('খাল', '#1e3a8a', '#ffffff', 'সাবধানে পার হোন', 512, 150);
  T.village = signTexture('সবুজপুর গ্রাম', '#fff1c1', '#2d6a1f', 'স্বাগতম', 512, 150);
  T.checker = canvasTex(128, 32, (g) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 8, 8, 8); } });
  T.checker.magFilter = THREE.NearestFilter;
  for (const k in T) { const v = T[k]; if (Array.isArray(v)) v.forEach(t => t.userData.shared = true); else if (v.isTexture) v.userData.shared = true; else Object.values(v).forEach(t => t.userData.shared = true); }
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
const NIGHT_LIGHTS = 6; // real point lights in the evening (kept low for phones)
const LAMP = new THREE.MeshBasicMaterial({ color: 0x777777 }); LAMP.userData.shared = true; // glows in the evening
const TUNNEL = new THREE.MeshBasicMaterial({ color: 0xffe9b0 }); TUNNEL.userData.shared = true; // underpass lights: always on
// ---------- evening lights ----------
// Every lamp / shop light gets a soft glow and a warm pool of light on the ground (shown only in the evening),
// and reports its position so the world can park a few real point lights at the nearest ones.
const TUBE = new THREE.MeshBasicMaterial({ color: 0x8a8a8a }); TUBE.userData.shared = true;         // shop tube lights
const WIN_EMI = new THREE.Color(0x000000);                                                            // lit windows (shared colour)
const nightMat = (c, o) => { const m = new THREE.MeshBasicMaterial({ map: null, color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, visible: false }); m.userData.shared = true; return m; };
const planeG1 = new THREE.PlaneGeometry(1, 1); planeG1.userData.shared = true;
const HALO = new THREE.SpriteMaterial({ color: 0xffc46a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, visible: false });
const POOL = nightMat(0xffb04a, 0.55), SHOPPOOL = nightMat(0xfff0c8, 0.4);
let lightSink = null; // set while a chunk is being built: (group, x, y, z, poolX, poolR, kind)
function lit(g, x, y, z, poolX, poolR, kind = 'lamp') {
  const halo = new THREE.Sprite(HALO); halo.position.set(x, y - 0.1, z); halo.scale.setScalar(kind === 'lamp' ? 2.6 : 1.4); g.add(halo);
  const pool = new THREE.Mesh(planeG1, kind === 'lamp' ? POOL : SHOPPOOL); pool.rotation.x = -Math.PI / 2;
  pool.position.set(poolX, 0.06, z); pool.scale.setScalar(poolR * 2); pool.renderOrder = 1; g.add(pool);
  if (lightSink) lightSink(g, x, y - 0.4, z, kind);
}
const winMat = color => { const m = lam({ color, map: T.windows, emissiveMap: T.winLit }); m.emissive = WIN_EMI; return m; };
function pole(g, x, z) {
  mesh(boxG(0.22, 8, 0.22), mat(0x6e6e6e), x, 4, z, g);
  mesh(boxG(1.6, 0.12, 0.12), mat(0x6e6e6e), x, 7.4, z, g);
  mesh(boxG(0.4, 0.5, 0.3), mat(0x444444), x, 6.6, z + 0.2, g);
  const hx = x - Math.sign(x || 1) * 0.6;
  mesh(boxG(0.5, 0.18, 0.4), LAMP, hx, 7.25, z, g);
  lit(g, hx, 7.1, z, x - Math.sign(x || 1) * 2.6, 4.5);
}
function lampPost(g, x, z, h = 7) { // tall street lamp (highway, flyover, and in the evening everywhere)
  mesh(boxG(0.2, h, 0.2), mat(0x8a8f94), x, h / 2, z, g);
  mesh(boxG(1.8, 0.12, 0.12), mat(0x8a8f94), x - Math.sign(x) * 0.8, h, z, g);
  const hx = x - Math.sign(x) * 1.6;
  mesh(boxG(0.6, 0.15, 0.35), LAMP, hx, h - 0.1, z, g);
  lit(g, hx, h - 0.25, z, x - Math.sign(x) * 3.2, 5.5);
}
function shopLight(g, face, side, z, w) { // a tube light over a shop front, lighting the pavement
  mesh(boxG(0.1, 0.1, Math.max(1, w)), TUBE, face - side * 0.2, 2.72, z, g);
  lit(g, face - side * 0.5, 2.7, z, face - side * 1.8, 2.6, 'shop');
}
function bulb(g, x, y, z, side) { // a bare bulb hanging at a stall
  mesh(sphG(0.12), LAMP, x, y, z, g);
  lit(g, x, y, z, x - side * 0.8, 2.2, 'shop');
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
  stallBoard(g, x - Math.sign(x) * 0.8, 2.7, z, 1.8);
}
function marketStall(g, x, z) {
  mesh(boxG(1.6, 0.8, 3), mat(0x8b5a2b), x, 0.6, z, g);
  const cols = [0xe74c3c, 0x27ae60, 0xf1c40f, 0xe67e22, 0x8e44ad, 0xffffff, 0x2ecc71];
  for (let i = 0; i < 4; i++) mesh(boxG(0.6, 0.25, 0.6), mat(pick(cols)), x + (i % 2 ? 0.35 : -0.35), 1.12, z - 0.8 + (i >> 1) * 1.4, g);
  if (R() < 0.4) mesh(boxG(1.2, 0.15, 0.5), mat(0x9fb6c4), x, 1.1, z + 0.9, g); // fish on ice
  const um = mesh(coneG, mat(pick([0xe74c3c, 0x2e86de, 0xf39c12, 0x16a085, 0xffffff])), x, 2.9, z, g); um.scale.set(2.1, 0.6, 2.1);
  mesh(cylG(0.04, 0.04, 2.4), mat(0x555555), x, 1.7, z, g);
  stallBoard(g, x - Math.sign(x) * 0.85, 2.2, z, 2.2);
}
function stallBoard(g, x, y, z, w) { // a name board facing the road (from shops.json)
  if (!T.stallSigns || !T.stallSigns.length) return;
  const b = sign2(w, w * 0.24, pick(T.stallSigns), g); b.position.set(x, y, z); b.rotation.y = Math.PI / 2;
}
// ---------- the food shops (each matched by its name in shops.json) ----------
const sphCache = {};
const sphG = r => { if (!sphCache[r]) { sphCache[r] = new THREE.SphereGeometry(r, 10, 8); sphCache[r].userData.shared = true; } return sphCache[r]; };
const glow = c => new THREE.MeshBasicMaterial({ color: c });
// a restaurant front: building, ground-floor front, big sign. Returns the anchor; x points into the shop, so -side is the road.
function shopFront(an, side, face, w, h, wall, front, signName) {
  const d = 8;
  mesh(buildingGeo(d, h + 3, w), winMat(wall), face + side * d / 2, (h - 3) / 2, 0, an);
  const f = plane(w - 1.0, 2.5, front, an); f.position.set(face - side * 0.03, 1.35, 0); f.rotation.y = -side * Math.PI / 2;
  const sg = plane(w - 0.4, 1.55, basic(T.food[signName]), an); sg.position.set(face - side * 0.08, 3.4, 0); sg.rotation.y = -side * Math.PI / 2;
}
const P = (side, face, k) => face - side * k; // lateral position k metres out from the shop front, towards the road
const FOOD = {
  'দাদা বৌদি বিরিয়ানি': { kind: 'big', bg: '#b3001b', fg: '#ffe14a', build(w, an, side, face, npc) {
    shopFront(an, side, face, w, 6, 0xf3e2c0, basic(T.shopInside), 'দাদা বৌদি বিরিয়ানি');
    const aw = mesh(boxG(1.6, 0.08, w - 0.4), mat(0xb3001b), P(side, face, 0.8), 2.75, 0, an); aw.rotation.z = side * 0.25;
    mesh(boxG(1.4, 0.55, 1.4), mat(0x9c5a3c), P(side, face, 1.7), 0.28, -w / 2 + 2, an);                 // brick stove
    mesh(cylG(0.62, 0.5, 0.9, 12), mat(0xb87333), P(side, face, 1.7), 1.0, -w / 2 + 2, an);              // the giant handi
    const lid = mesh(cylG(0.66, 0.66, 0.1, 12), mat(0xc0392b), P(side, face, 1.7), 1.5, -w / 2 + 2, an); lid.scale.y = 1.4;
    for (let i = 0; i < 3; i++) { const st = mesh(sphG(0.22), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }), P(side, face, 1.7) + (i - 1) * 0.15, 1.9 + i * 0.35, -w / 2 + 2 + (i % 2) * 0.15, an); st.scale.setScalar(1 + i * 0.3); }
    for (let i = 0; i < 3; i++) npc(1.0 + i * 1.3, 2.2, i === 0 ? 'shop' : '');                          // the crowd
  } },
  'আরসালান বিরিয়ানি': { kind: 'big', bg: '#3b0a14', fg: '#f5d76e', build(w, an, side, face, npc) {
    shopFront(an, side, face, w, 9, 0x6d1b2a, glow(0xffd27a), 'আরসালান বিরিয়ানি');
    mesh(boxG(0.12, 0.18, w), mat(0xd4af37), P(side, face, 0.1), 2.7, 0, an); mesh(boxG(0.12, 0.18, w), mat(0xd4af37), P(side, face, 0.1), 4.25, 0, an);
    for (const z of [-w / 2 + 0.8, w / 2 - 0.8]) {                                                      // potted plants + lamps
      mesh(cylG(0.32, 0.25, 0.55, 10), mat(0xd4af37), P(side, face, 0.6), 0.28, z, an);
      mesh(icoG, mat(0x2f7d32), P(side, face, 0.6), 0.95, z, an).scale.setScalar(0.32);
      mesh(sphG(0.18), glow(0xfff1b8), P(side, face, 0.15), 2.3, z, an);
    }
    npc(0.4, 1.6, 'shop');                                                                                 // doorman
  } },
  'ডোমিনোজ পিৎজা': { kind: 'big', bg: '#0b5ea8', fg: '#ffffff', build(w, an, side, face, npc) {
    shopFront(an, side, face, w, 6, 0x0b5ea8, glow(0xdff3ff), 'ডোমিনোজ পিৎজা');
    mesh(boxG(0.1, 0.35, w), glow(0xe31837), P(side, face, 0.12), 2.75, 0, an);                         // red stripe
    const menu = plane(1.6, 1.0, glow(0xfff7c2), an); menu.position.set(P(side, face, 0.15), 1.6, w / 2 - 1.3); menu.rotation.y = -side * Math.PI / 2;
    const pz = new THREE.Group(); an.add(pz); pz.position.set(P(side, face, 0.4), 4.9, 0); pz.rotation.z = Math.PI / 2;  // round pizza sign
    mesh(cylG(0.95, 0.95, 0.12, 20), mat(0xe0a040), 0, 0, 0, pz); mesh(cylG(0.82, 0.82, 0.14, 20), mat(0xf7d14a), 0, 0, 0, pz);
    for (let i = 0; i < 6; i++) mesh(cylG(0.13, 0.13, 0.16, 8), mat(0xc0392b), Math.cos(i) * 0.5, 0, Math.sin(i) * 0.5, pz);
    const sc = new THREE.Group(); an.add(sc); sc.position.set(P(side, face, 1.6), 0, -w / 2 + 1.5);       // delivery scooter
    mesh(boxG(0.4, 0.5, 1.3), mat(0xe31837), 0, 0.55, 0, sc); mesh(boxG(0.55, 0.45, 0.5), mat(0x0b5ea8), 0, 1.05, -0.35, sc);
    for (const z of [-0.55, 0.55]) { const wh = mesh(cylG(0.25, 0.25, 0.15, 10), mat(0x111111), 0, 0.25, z, sc); wh.rotation.z = Math.PI / 2; }
    npc(1.2, 2.4);
  } },
  'নন্দিনী দির হোটেল': { kind: 'big', bg: '#ffd400', fg: '#b3001b', build(w, an, side, face, npc) {
    shopFront(an, side, face, w, 3, 0xd8c3a5, basic(T.shopInside), 'নন্দিনী দির হোটেল');
    const roof = mesh(boxG(2.2, 0.06, w + 0.4), mat(0x8e9aa3), P(side, face, 0.9), 2.9, 0, an); roof.rotation.z = side * 0.3; // tin roof
    for (const z of [-1.6, 1.6]) {                                                                        // benches, a table, steel plates
      mesh(boxG(0.4, 0.45, 2.2), mat(0x7a4a24), P(side, face, 2.4), 0.23, z, an);
    }
    mesh(boxG(0.9, 0.75, 2.4), mat(0x8b5a2b), P(side, face, 1.6), 0.38, 0, an);
    for (let i = 0; i < 3; i++) mesh(cylG(0.22, 0.2, 0.04, 12), mat(0xd8d8d8), P(side, face, 1.6), 0.78, -0.8 + i * 0.8, an);
    mesh(cylG(0.4, 0.35, 0.6, 12), mat(0xb0b0b0), P(side, face, 0.5), 0.3, w / 2 - 1, an);                // the big aluminium pot
    npc(0.6, -1.5, 'shop'); npc(2.8, 1.2);
  } },
  'ভূতের রাজা দিলো বর': { kind: 'big', bg: '#2d0a4a', fg: '#ffe14a', build(w, an, side, face, npc, h = 6) {
    shopFront(an, side, face, w, h, 0x6a1b9a, glow(0xffd1f0), 'ভূতের রাজা দিলো বর');
    const gh = new THREE.Group(); an.add(gh); gh.position.set(face + side * 1.5, h + 0.2, 0);               // the ghost king on the roof
    mesh(sphG(0.9), mat(0xf7f7ff), 0, 1.9, 0, gh);
    const body = mesh(coneG, mat(0xf7f7ff), 0, 0.9, 0, gh); body.scale.set(1.0, 1.8, 1.0); body.rotation.x = Math.PI;
    for (const z of [-0.3, 0.3]) mesh(sphG(0.14), mat(0x111111), -side * 0.82, 2.0, z, gh);
    mesh(cylG(0.5, 0.55, 0.35, 8), mat(0xffcc00), 0, 2.85, 0, gh);
    for (let i = 0; i < 5; i++) { const sp = mesh(coneG, mat(0xffcc00), Math.cos(i * 1.256) * 0.45, 3.15, Math.sin(i * 1.256) * 0.45, gh); sp.scale.set(0.12, 0.35, 0.12); }
    const bowl = mesh(cylG(0.7, 0.45, 0.45, 14), new THREE.MeshLambertMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.6 }), P(side, face, 1.2), 1.1, 0, an);  // giant rosogolla
    mesh(boxG(0.9, 0.85, 1.6), mat(0xff8ad8), P(side, face, 1.2), 0.43, 0, an);
    for (let i = 0; i < 5; i++) mesh(sphG(0.22), mat(0xfffbea), P(side, face, 1.2) + (i % 2 - 0.5) * 0.3, 1.25, (i - 2) * 0.22, an);
    for (let i = 0; i < 4; i++) mesh(sphG(0.2), glow([0xff5ac8, 0x5ad1ff, 0xffe14a, 0x9bff5a][i]), P(side, face, 0.35), 2.45, -w / 2 + 1 + i * (w - 2) / 3, an); // lanterns
    npc(2.3, -1.6);
  } },
  // ---- stalls on the pavement ----
  'রাজু দার পরোটা': { kind: 'stall', bg: '#ff7a00', fg: '#ffffff', build(an, x, side) {
    mesh(boxG(1.3, 0.9, 2.2), mat(0x8b5a2b), x, 0.45, 0, an);
    mesh(cylG(0.55, 0.55, 0.06, 16), mat(0x1a1a1a), x, 0.95, -0.4, an);                                   // the tawa
    for (let i = 0; i < 6; i++) mesh(cylG(0.32, 0.32, 0.04, 12), mat(0xe8b45a), x, 0.95 + i * 0.05, 0.55, an); // porota stack
    return 'রাজু দার পরোটা';
  } },
  'চপ শিল্প': { kind: 'stall', bg: '#7a1f00', fg: '#ffe14a', build(an, x) {
    mesh(boxG(1.3, 0.95, 2.4), mat(0xb5651d), x, 0.48, 0, an);
    mesh(boxG(1.0, 0.45, 1.0), new THREE.MeshLambertMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.45 }), x, 1.2, 0.55, an);
    const kd = mesh(sphG(0.42), mat(0x222222), x, 1.0, -0.6, an); kd.scale.y = 0.5;                         // kadai
    mesh(cylG(0.36, 0.36, 0.03, 14), mat(0xe0b030), x, 1.12, -0.6, an);
    for (let i = 0; i < 8; i++) { const c = mesh(sphG(0.11), mat(0x8a4a16), x + (i % 3 - 1) * 0.22, 1.02, 0.35 + (i >> 1) * 0.12, an); c.scale.set(1.3, 0.7, 1); }
    return 'চপ শিল্প';
  } },
  'ঝালমুড়ি মুড়ি': { kind: 'stall', bg: '#0b7a3e', fg: '#ffe14a', build(an, x) {
    ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db'].forEach((c, i) => mesh(boxG(1.0, 0.2, 1.8), mat(new THREE.Color(c).getHex()), x, 0.3 + i * 0.2, 0, an));
    mesh(cylG(0.3, 0.3, 0.55, 12), mat(0xc8c8c8), x, 1.4, -0.4, an);                                       // muri drum
    for (let i = 0; i < 3; i++) mesh(cylG(0.1, 0.1, 0.25, 8), new THREE.MeshLambertMaterial({ color: [0xffc04a, 0xd84a2a, 0x8bc34a][i], transparent: true, opacity: 0.8 }), x, 1.25, 0.2 + i * 0.25, an);
    const um = mesh(coneG, mat(0xff5a5a), x, 2.6, 0, an); um.scale.set(1.6, 0.5, 1.6); mesh(cylG(0.04, 0.04, 1.5), mat(0x555555), x, 1.8, 0, an);
    return 'ঝালমুড়ি মুড়ি';
  } },
  'মুন্সি টি': { kind: 'stall', bg: '#5a2d0c', fg: '#ffe9a8', build(an, x, side) {
    mesh(boxG(1.2, 0.95, 2.0), mat(0x6b4423), x, 0.48, 0, an);
    mesh(boxG(0.5, 0.25, 0.5), mat(0x444444), x, 1.08, -0.5, an);                                         // stove + kettle
    mesh(sphG(0.22), mat(0xb0b0b0), x, 1.4, -0.5, an);
    for (let i = 0; i < 6; i++) mesh(cylG(0.06, 0.045, 0.12, 6), mat(0xa0522d), x + (i % 2) * 0.14 - 0.07, 1.02 + (i >> 1) * 0.12, 0.3, an); // kulhads
    for (let i = 0; i < 2; i++) mesh(cylG(0.13, 0.13, 0.3, 10), new THREE.MeshLambertMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.7 }), x, 1.12, 0.65 + i * 0.3, an);
    mesh(boxG(0.4, 0.45, 2.0), mat(0x7a4a24), x - side * 1.4, 0.23, 0, an);                               // bench
    return 'মুন্সি টি';
  } },
  'কাঠি রোল': { kind: 'stall', bg: '#ffd400', fg: '#b3001b', build(an, x) {
    mesh(boxG(1.2, 0.95, 2.2), mat(0xc0392b), x, 0.48, 0, an);
    mesh(boxG(0.9, 0.5, 0.9), new THREE.MeshLambertMaterial({ color: 0xdff3ff, transparent: true, opacity: 0.45 }), x, 1.2, 0.5, an);
    mesh(cylG(0.45, 0.45, 0.05, 14), mat(0x1a1a1a), x, 0.98, -0.5, an);
    for (let i = 0; i < 4; i++) { const r = mesh(cylG(0.07, 0.07, 0.38, 8), mat(i % 2 ? 0xffffff : 0xe8b45a), x, 1.1, 0.3 + i * 0.13, an); r.rotation.z = Math.PI / 2; }
    return 'কাঠি রোল';
  } },
};

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
      water: lam({ map: T.water, color: 0xcfefff }), canal: lam({ map: T.canal, color: 0xbfe3d2 }), curb: lam({ color: 0xc9c9c9, side: THREE.DoubleSide }),
      deck: lam({ color: 0x8a8a8a, side: THREE.DoubleSide }), rail: lam({ color: 0xd8d8d8, side: THREE.DoubleSide }),
      redsoil: lam({ map: T.redsoil }), construction: lam({ map: T.construct }), concrete: lam({ color: 0xb8b2a6, side: THREE.DoubleSide }),
      barricade: lam({ map: T.barricade, side: THREE.DoubleSide }), steel: lam({ color: 0x9aa3ab, side: THREE.DoubleSide }),
    };
    for (const k in this.mats) this.mats[k].userData.shared = true;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), lam({ color: 0x7f9a5a }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -3.2;
    scene.add(ground); this.ground = ground;
    const firstOther = track.segs.find(sg => sg.zone !== 'campus');
    this.gateS = track.segs[0].zone === 'campus' && firstOther ? firstOther.s0 : null; // college gate
    this.junctions = track.segs.filter(sg => sg.junction).map(sg => sg.s0 + sg.len / 2);
    // Kolkata sights on this level: centre ones at spread-out spots, along ones over the whole segment
    this.sights = []; this.trains = [];
    track.segs.forEach((sg, k) => {
      const list = sg.sights || [], centres = list.filter(x => SIGHT_KIND[x] === 'centre');
      list.forEach((kind, i) => {
        const side = kind === 'ghat' ? 1 : sg.side || ((k + i) % 2 ? -1 : 1);
        const ci = centres.indexOf(kind), sc = sg.s0 + sg.len * (ci + 1) / (centres.length + 1);
        this.sights.push({ kind, seg: sg, side, sc, along: SIGHT_KIND[kind] === 'along' });
        if (kind === 'rail') this.trains.push(new Train(scene, track, sg, side));
      });
    });
    this.evening = false; this.time = 0;
    for (const m of [HALO, POOL, SHOPPOOL]) if (m.map !== T.glow) { m.map = T.glow; m.needsUpdate = true; }
    this.pointLights = [];
  }
  // evening: street lamps, shop tube lights and windows light up; a few real lights follow the nearest lamps
  setEvening(on) {
    this.evening = on;
    LAMP.color.setHex(on ? 0xffe08a : 0x777777); TUBE.color.setHex(on ? 0xf4fbff : 0x8a8a8a);
    WIN_EMI.setHex(on ? 0xd09a50 : 0x000000);
    HALO.visible = POOL.visible = SHOPPOOL.visible = on;
    if (on && !this.pointLights.length) for (let i = 0; i < NIGHT_LIGHTS; i++) {
      const l = new THREE.PointLight(0xffc47a, 0, 20, 1.4); this.scene.add(l); this.pointLights.push(l);
    }
    if (!on) for (const l of this.pointLights) l.intensity = 0;
  }
  // park the real lights at the lamps nearest the runner (a little ahead counts most)
  placeLights(playerS) {
    if (!this.evening || !this.pointLights.length) return;
    const all = [], ahead = this.track.pos(Math.max(0, playerS + 10), 0, 0, this._ahead || (this._ahead = new THREE.Vector3()));
    for (const g of this.chunks.values()) for (const L of g.userData.lights || []) all.push(L);
    for (const L of all) L.score = L.p.distanceTo(ahead) + (L.kind === 'shop' ? 6 : 0);
    all.sort((a, b) => a.score - b.score);
    this.pointLights.forEach((l, i) => {
      const L = all[i];
      if (!L) { l.intensity = 0; return; }
      l.position.copy(L.p); l.intensity = L.kind === 'shop' ? 14 : 34; l.color.setHex(L.kind === 'shop' ? 0xfff0d0 : 0xffc47a);
    });
  }
  // per-frame: landmark animations (football, cricket, puja lights…) and the trains
  animate(dt, playerS) {
    this.time += dt;
    for (const g of this.chunks.values()) for (const f of g.userData.anims || []) f(this.time, dt);
    for (const tr of this.trains) tr.update(dt, playerS, (n, s) => this.onSound && this.onSound(n, s));
    this.placeLights(playerS);
  }

  followGround(p) { this.ground.position.x = p.x; this.ground.position.z = p.z; if (T.canal) T.canal.offset.x -= 0.004; } // the canal water flows

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
  destroy() { this.reset(); this.pointLights.forEach(l => { this.scene.remove(l); l.dispose(); }); this.pointLights = []; this.trains.forEach(t => t.destroy()); this.scene.remove(this.ground); this.ground.geometry.dispose(); }

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
      tr.pos(s, L, f(y0, s), v); P.push(v.x, v.y, v.z);
      tr.pos(s, L, f(y1, s), v); P.push(v.x, v.y, v.z);
      if (j < n) { const a = j * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, material); g.add(m); return m;
  }
  inSight(s, side) { // a landmark (or a canal bridge) is here: keep lamps out of its way
    return this.sights.some(st => st.side === side && (st.kind === 'rail' ? s > st.seg.s0 - 4 && s < st.seg.s0 + st.seg.len + 4 : !st.along && Math.abs(s - st.sc) < Math.min(30, SIGHT_ROOM[st.kind] || 0)))
      || this.track.culverts.some(c => Math.abs(s - c) < CULVERT_HALF + 2) || Math.abs(s - this.track.finish) < 6;
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
    g.userData.statics = statics; g.userData.npcs = npcs; g.userData.anims = []; g.userData.lights = [];
    const lights = g.userData.lights;
    lightSink = (parent, x, y, z, kind) => { // parent is an anchor placed on the track (or the chunk itself)
      parent.updateMatrixWorld(true);
      const p = parent.localToWorld(new THREE.Vector3(x, y, z));
      lights.push({ p, kind });
    };
    const H = s => tr.half(Math.max(0, s));
    const zoneAt = s => tr.zone(Math.max(0, Math.min(s, tr.finish + 270)));

    for (const [a, b, surf] of this.runs(s0, s1, s => tr.seg(s).surface)) {
      this.ribbon(g, a, b, s => -H(s), H, 0.01, this.mats[surf === 'asphalt' ? 'road' : surf] || this.mats.road);
      if (surf === 'construction') this.construction(g, a, b, H, npcs);
    }
    for (const [a, b, zone] of this.runs(s0, s1, s => tr.seg(s).zone)) this.sides(g, a, b, zone, H);
    for (const side of [1, -1]) this.props(g, side, s0, s1, H, zoneAt, statics, npcs);

    // street lamps along every road (city/market also get the electric poles below; highway/flyover have their own)
    for (const [k, ls] of [[0, s0 + 22], [1, s0 + 36]]) {
      const z = zoneAt(ls), side = (i + k) % 2 ? 1 : -1;
      if (['highway', 'flyover', 'underpass'].includes(z) || this.inSight(ls, side)) continue;
      if ((z === 'city' || z === 'market') && k === 1) continue;
      lampPost(this.anchor(g, ls), side * (H(ls) + (z === 'bridge' || z === 'river' ? 0.4 : 1.0)), 0, z === 'village' || z === 'campus' ? 6 : 7);
    }
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
      mesh(buildingGeo(16, 9, 8), winMat(0xe8c070), 0, 4.5, -2, an);
      const hs = sign2(6, 1.7, T.hostelSign, an); hs.position.set(0, 6.2, 2.1);
    }
    if (this.gateS !== null && s0 <= this.gateS && this.gateS < s1) arch(this.anchor(g, this.gateS), H(this.gateS), T.gate, T.gateBack);
    for (const sj of this.junctions) if (s0 <= sj && sj < s1) this.junction(g, sj, H);
    for (const c of tr.culverts) if (s0 <= c && c < s1) this.culvert(g, c, H, zoneAt(c));
    for (const st of this.sights) {
      const S0 = st.seg.s0, S1 = S0 + st.seg.len;
      if (st.along ? (S0 < s1 && S1 > s0) : (st.sc >= s0 && st.sc < s1)) buildSight(st.kind, this.sightCtx(g, npcs, st, Math.max(s0, S0), Math.min(s1, S1)));
    }
    const segV = tr.segs.find(sg => sg.zone === 'village');
    if (segV && s0 <= segV.s0 + 10 && segV.s0 + 10 < s1) { const vs = sign2(4.5, 1.4, T.village, this.anchor(g, segV.s0 + 10, -(H(segV.s0 + 10) + 2))); vs.position.y = 2.2; }
    const segB = tr.segs.find(sg => sg.zone === 'bridge');
    if (segB && s0 <= segB.s0 - 6 && segB.s0 - 6 < s1) { const bs = sign2(4.5, 1.4, T.bridge, this.anchor(g, segB.s0 - 6, H(segB.s0) + 2)); bs.position.y = 2.4; }
    const F = tr.finish;
    if (s0 <= F && F < s1) { // the race ends back at the hostel gate
      arch(this.anchor(g, F), H(F), T.finish, null, 0x8b1a1a);
      const an = this.anchor(g, F + 24);
      mesh(buildingGeo(10, 11, 24), winMat(0xe8c070), 0, 4.5, 4, an);
      const hs = sign2(7, 1.9, T.hostelSign, an); hs.position.set(0, 7.2, -1.2);
      const st = plane(1, 1.6, basic(T.checker), this.anchor(g, F)); st.scale.x = H(F) * 2; st.rotation.x = -Math.PI / 2; st.position.y = 0.04;
    }
    this.scene.add(g);
    lightSink = null;
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
    } else if (zone === 'highway') {
      both(s => H(s), s => H(s) + 1.5, 0.02, M.dust, { uWorld: 4 });
      both(s => H(s) + 1.5, far, 0, M.grass, { uWorld: 8 });
      for (const sd of [1, -1]) { this.wall(g, a, b, s => sd * (H(s) + 0.35), 0.35, 0.8, M.steel); this.wall(g, a, b, s => sd * (H(s) + 0.35), 0, 0.35, M.concrete); }
    } else if (zone === 'flyover') { // the deck in the air: parapets, pillars, and the ground far below
      const tr = this.track;
      for (const sd of [1, -1]) { this.wall(g, a, b, s => sd * (H(s) + 0.1), s => -0.6, 1.0, M.concrete); this.ribbon(g, a, b, s => sd > 0 ? H(s) + 0.1 : -far(s), s => sd > 0 ? far(s) : -H(s) - 0.1, 0, M.dust, { uWorld: 10, abs: true }); }
      for (let s = Math.ceil(a / 15) * 15; s < b; s += 15) { const h = Math.round(tr.h(s) * 2) / 2; if (h < 1) continue; const p = mesh(boxG(1.4, h, 3)); p.material = M.concrete; tr.place(p, s, 0, -h / 2 - 0.3); g.add(p); }
    } else if (zone === 'underpass') { // the road dips under a cross street: retaining walls up to street level and a slab overhead
      const tr = this.track, top = s => -tr.h(s) + 1.1;
      for (const sd of [1, -1]) { this.wall(g, a, b, s => sd * (H(s) + 0.05), 0, top, M.concrete); this.ribbon(g, a, b, s => sd > 0 ? H(s) + 0.05 : -far(s), s => sd > 0 ? far(s) : -H(s) - 0.05, 0, M.dust, { uWorld: 10, abs: true }); }
      for (let s = Math.ceil(a / 6) * 6; s < b; s += 6) for (const sd of [1, -1]) { const l = mesh(boxG(0.15, 0.25, 1.6), TUNNEL); tr.place(l, s, sd * (H(s) - 0.05), 2.6); g.add(l); }
      const seg = tr.seg(a), mid = seg.s0 + seg.len / 2;
      if (mid >= a && mid < b) { // the cross street on top
        const slab = mesh(boxG(H(mid) * 2 + 3, 0.9, 12)); slab.material = M.concrete; tr.place(slab, mid, 0, -tr.h(mid) + 0.65); g.add(slab);
        for (const z of [-6, 6]) { const r = mesh(boxG(H(mid) * 2 + 3, 0.8, 0.2)); r.material = M.rail; tr.place(r, mid + z, 0, -tr.h(mid) + 1.5); g.add(r); }
      }
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

  // পুল: a small bridge where a canal (খাল) crosses under the road — railings on the hump, water flowing out both sides
  culvert(g, c, H, zone) {
    const tr = this.track, L = CULVERT_HALF, half = H(c), town = zone === 'city' || zone === 'market';
    const gy = town ? 0.22 : 0.02; // ground level beside the road (pavement in town)
    // railings that follow the hump: posts + two rails, in short pieces
    for (const sd of [1, -1]) {
      const lat = sd * (half + 0.15);
      for (let s = c - L; s < c + L; s += 1) {
        const a = tr.pos(s, lat, 0, new THREE.Vector3()), b = tr.pos(s + 1, lat, 0, new THREE.Vector3());
        const mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b), pitch = Math.atan2(b.y - a.y, len);
        for (const [y, t] of [[0.95, 0.12], [0.5, 0.09]]) {
          const rail = mesh(boxG(0.1, t, len + 0.02), this.mats.rail); rail.position.copy(mid); rail.position.y += y;
          rail.rotation.set(-pitch, tr.th(s + 0.5), 0, 'YXZ'); g.add(rail);
        }
        if (Math.round(s - c + L) % 2 === 0) { const p = mesh(boxG(0.14, 1.05, 0.14), mat(0xf2efe6)); tr.place(p, s, lat, 0.52); g.add(p); }
      }
      // stone deck edge with the arch the water comes out of
      const an = this.anchor(g, c, sd * (half + 0.3));
      mesh(boxG(0.4, 1.2, L * 2), mat(0x9a8f7f), 0, -0.25, 0, an);
      const arch = mesh(cylG(1.4, 1.4, 0.45, 14), mat(0x1c2a33), sd * 0.04, -0.25, 0, an); arch.rotation.z = Math.PI / 2;
    }
    // the canal: water strips running away from the road on both sides, between low brick banks
    for (const sd of [1, -1]) {
      const an = this.anchor(g, c, sd * (half + 0.4));
      const run = 48;
      const water = plane(run, 3.2, this.mats.canal, an); water.rotation.x = -Math.PI / 2; water.position.set(sd * run / 2, gy + 0.03, 0);
      for (const e of [-1, 1]) mesh(boxG(run, 0.35, 0.3), mat(0x9c5a3c), sd * run / 2, gy + 0.12, e * 1.75, an);
      if (sd > 0) { const sg = sign2(2.2, 0.7, T.canalSign, this.anchor(g, c - L - 1.5, sd * (half + 1.6))); sg.position.y = 1.9; mesh(boxG(0.1, 1.6, 0.1), mat(0x555555), 0, 0.8, 0, sg.parent); }
    }
  }

  // helpers handed to the Kolkata sight builders (kolkata.js)
  sightCtx(g, npcs, st, a, b) {
    const tr = this.track;
    return {
      g, track: tr, H: s => tr.half(Math.max(0, s)), side: st.side, sc: st.sc, seg: st.seg, a, b, mats: this.mats, plane,
      anchor: (s, lat = 0, y = 0) => this.anchor(g, s, lat, y),
      anim: f => g.userData.anims.push(f),
      sound: (n, s) => this.onSound && this.onSound(n, s),
      npc: (s, lat, y, role) => this.npc(g, npcs, s, lat, y, role),
      ribbon: (a2, b2, la, lb, y, m) => this.ribbon(g, a2, b2, la, lb, y, m),
      evening: () => this.evening,
      basicSign: ([t, sub], bg, fg) => basic(signTexture(t, bg, fg, sub, 768, 180)),
      sign: ([t, sub], s, lat, y, w = 4.5) => { // a blue board on a post, readable from the road
        const an = this.anchor(g, s, lat), sg = sign2(w, w * 0.3, signTexture(t, '#1e3a8a', '#ffffff', sub, 640, 190), an); sg.position.y = y;
        mesh(boxG(0.12, y, 0.12), mat(0x555555), 0, y / 2, 0, an);
      },
    };
  }

  // under construction: barricades along both sides, cones, sand, a JCB, workers in helmets
  construction(g, a, b, H, npcs) {
    for (let s = Math.ceil(a / 2.5) * 2.5; s < b; s += 2.5) for (const sd of [1, -1]) { // striped barricade boards on little legs
      const an = this.anchor(g, s, sd * (H(s) + 0.3));
      mesh(boxG(0.08, 0.32, 2.3), this.mats.barricade, 0, 0.75, 0, an); mesh(boxG(0.08, 0.22, 2.3), this.mats.barricade, 0, 0.35, 0, an);
      for (const z of [-1, 1]) mesh(boxG(0.08, 0.95, 0.08), mat(0x444444), 0, 0.47, z, an);
    }
    if (R() < 0.6) { const sg = sign2(3.6, 1.1, T.workSign, this.anchor(g, a + 4, H(a + 4) + 1.4)); sg.position.y = 1.7; }
    for (let s = Math.ceil(a / 14) * 14; s < b; s += 14) {
      const sd = (s / 14) % 2 ? 1 : -1, an = this.anchor(g, s, sd * (H(s) + 3));
      if (R() < 0.5) { const p = mesh(coneG, mat(0xc8a06a), 0, 0.7, 0, an); p.scale.set(2.2, 1.4, 2.2); }     // sand pile
      else { mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 10), mat(0xd9d9d9), 0, 1.3, 0, an).rotation.z = 0.5; mesh(boxG(1.4, 0.6, 2), mat(0x777777), 0, 0.3, 0, an); } // cement mixer
      if (R() < 0.6) this.npc(g, npcs, s + 3, sd * (H(s) + 1.6), 0.1, '');
    }
    const mid = (a + b) / 2;
    if (R() < 0.7) { // a yellow JCB with its arm up
      const sd = R() < 0.5 ? 1 : -1, an = this.anchor(g, mid, sd * (H(mid) + 5));
      const y = mat(0xf2b705);
      mesh(boxG(2.4, 1.2, 4), y, 0, 1.2, 0, an); mesh(boxG(1.8, 1.6, 1.8), y, 0, 2.6, -0.6, an); mesh(boxG(1.6, 1.0, 1.4), mat(0x2a3440), 0, 2.8, -0.6, an);
      for (const x of [-1.2, 1.2]) for (const z of [-1.3, 1.3]) { const w = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 12), mat(0x1a1a1a), x, 0.6, z, an); w.rotation.z = Math.PI / 2; }
      const arm = mesh(boxG(0.4, 0.4, 4), y, 0, 3.4, 2.4, an); arm.rotation.x = -0.6;
      mesh(boxG(1.2, 0.8, 0.8), mat(0x555555), 0, 4.6, 4.0, an);
    }
  }
  // highway: grass, a crash barrier, tall lamps and big hoardings — no shops, no animals
  highwayBit(g, side, s, H) {
    const an = this.anchor(g, s + 12), b = H(s + 12);
    lampPost(an, side * (b + 1.2), 0, 8);
    if (R() < 0.35) { const hd = sign2(9, 3.6, pick(T.hoard), an); hd.position.set(side * (b + 9), 7, 0); mesh(boxG(0.3, 5.5, 0.3), mat(0x555555), side * (b + 9), 2.75, 0, an); }
    if (R() < 0.5) tree(an, side * (b + rand(6, 14)), rand(-6, 6), rand(0.9, 1.2));
    return 24;
  }
  // flyover: the road is up in the air — the city sits below at ground level
  flyoverBit(g, side, s, H) {
    const tr = this.track, sc = s + 6, an = this.anchor(g, sc), drop = tr.h(sc);
    lampPost(an, side * (H(sc) + 0.6), 0, 7);
    if (R() < 0.8) { // a building down below, its roof around the deck
      const w = rand(7, 11), h = rand(5, 13);
      mesh(buildingGeo(8, h, w), winMat(pick(KOLKATA_COLORS)), side * (H(sc) + rand(8, 16)), h / 2 - drop, 0, an);
    }
    return 14;
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
    const inSight = s => this.sights.some(st => st.side === side && (st.kind === 'rail' ? s > st.seg.s0 - 4 && s < st.seg.s0 + st.seg.len + 4 : !st.along && Math.abs(s - st.sc) < (SIGHT_ROOM[st.kind] || 0)));
    const skip = s => inSight(s) || this.track.culverts.some(c => Math.abs(s - c) < CULVERT_HALF + 2) || this.junctions.some(sj => side < 0 && s > sj - 12 && s < sj + 30) || (this.gateS !== null && Math.abs(s - this.gateS) < 4) || Math.abs(s - tr.finish) < 4;
    let s = s0 + rand(0, 2);
    while (s < s1 - 2) {
      if (skip(s) || s < -6) { s += 3; continue; }
      const zone = zoneAt(s);
      if (zone === 'city') s += this.cityBuilding(g, side, s, H, statics, npcs);
      else if (zone === 'market') s += this.marketBlock(g, side, s, H, npcs);
      else if (zone === 'campus') s += this.campusBit(g, side, s, H, npcs);
      else if (zone === 'village') s += this.villageBit(g, side, s, H, npcs);
      else if (zone === 'river') s += this.riverBit(g, side, s, H, npcs);
      else if (zone === 'highway') s += this.highwayBit(g, side, s, H);
      else if (zone === 'flyover') s += this.flyoverBit(g, side, s, H);
      else s += 6;
    }
  }

  dogIdle(g, s, lat) { // a street dog standing about on the pavement, tail going
    const d = makeDog(); this.anchor(g, s, lat, 0.2).add(d.root); d.root.rotation.y = rand(0, Math.PI * 2);
    const ph = R() * 6;
    g.userData.anims.push(t => { d.tail.rotation.y = Math.sin(t * 9 + ph) * 0.6; d.head.rotation.y = Math.sin(t * 0.7 + ph) * 0.5; });
  }
  npc(g, npcs, s, lat, y = 0, role = '') { // role 'shop' = shopkeeper (says shopkeeperShout lines)
    const n = makeNPC(role === 'shop'); // shopkeepers are men (they use the older male voice)
    this.anchor(g, s, lat, y).add(n.root);
    n.root.rotation.y = (lat > 0 ? -Math.PI / 2 : Math.PI / 2) + rand(-0.5, 0.5); // face the road
    const o = { x: lat, z: s, y, m: n, role, female: n.female, talkT: rand(0, 3), phase: R() * 6 };
    npcs.push(o); this.npcs.add(o);
    return o;
  }

  // the food shops listed in shops.json, taken in turn so a race passes all of them
  foodShop(kind) {
    const list = shopList().map(x => x.name).filter(n => FOOD[n] && FOOD[n].kind === kind);
    if (!list.length) return null;
    this.foodTurn = this.foodTurn || {}; const i = this.foodTurn[kind] = ((this.foodTurn[kind] ?? (this.seed % list.length) - 1) + 1) % list.length;
    return list[i];
  }
  cityBuilding(g, side, s, H, statics, npcs) {
    if (R() < 0.3) { // a big food shop
      const name = this.foodShop('big');
      if (name) {
        const w = name === 'আরসালান বিরিয়ানি' ? 12 : 10, sc = s + w / 2, an = this.anchor(g, sc), face = side * (H(sc) + 3.2);
        FOOD[name].build(w, an, side, face, (out, dz, role) => this.npc(g, npcs, sc + dz, side * (H(sc) + 3.2 - out), 0.2, role));
        shopLight(an, face, side, 0, w - 2);
        return w + rand(0.3, 1);
      }
    }
    const w = rand(6, 10), h = pick([6, 9, 9, 12, 15]), d = 8, sc = s + w / 2;
    const an = this.anchor(g, sc);
    const fx = side * (H(sc) + 3.2), face = fx - side * 0.02;
    mesh(buildingGeo(d, h + 3, w), winMat(pick(KOLKATA_COLORS)), fx + side * d / 2, (h - 3) / 2, 0, an);
    const open = R() < 0.75, inside = plane(w - 1.2, 2.4, basic(open ? T.shopInside : T.shutter), an); inside.position.set(face, 1.3, 0); inside.rotation.y = -side * Math.PI / 2;
    if (open) shopLight(an, face, side, 0, w - 2);
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
    const tea = R() < 0.3, stall = tea && R() < 0.5 ? this.foodShop('stall') : null;
    if (tea) bulb(an, side * (H(sc) + 2.2), 2.25, 0, side);
    if (stall) { const x = side * (H(sc) + 2.0); FOOD[stall].build(an, x, side); const b = sign2(2.2, 0.55, T.food[stall], an); b.position.set(x - side * 0.2, 2.1, 0); b.rotation.y = Math.PI / 2; }
    else if (tea) teaStall(an, side * (H(sc) + 2.2), 0);
    if (tea) this.npc(g, npcs, sc + rand(-0.6, 0.6), side * (H(sc) + 2.9), 0.2, 'shop'); // the tea seller
    else if (R() < 0.65) this.npc(g, npcs, s + rand(1, w - 1), side * (H(sc) + rand(1.2, 2.8)), 0.2);
    if (R() < 0.18) tree(this.anchor(g, s + 1), side * (H(s) + 1.4), 0, 0.85);
    if (R() < 0.14) this.dogIdle(g, s + rand(1, w - 1), side * (H(sc) + rand(0.8, 2.2)));
    if (R() < 0.16) { // parked yellow taxi — solid
      const lat = side * (H(sc) - 0.75);
      ambassadorTaxi(this.anchor(g, sc), lat, 0);
      statics.push({ x: lat, z: sc, w: 0.8, d: 1.9, h: 1.9, kind: 'taxi' });
    }
    return w + rand(0.1, 0.8);
  }

  marketBlock(g, side, s, H, npcs) {
    const w = 4, sc = s + w / 2, an = this.anchor(g, sc);
    const food = R() < 0.35 ? this.foodShop('stall') : null;
    if (food) { const x = side * (H(sc) + 1.6); FOOD[food].build(an, x, side); const b = sign2(2.2, 0.55, T.food[food], an); b.position.set(x - side * 0.2, 2.1, 0); b.rotation.y = Math.PI / 2; }
    else marketStall(an, side * (H(sc) + 1.6), 0);
    bulb(an, side * (H(sc) + 1.2), 2.3, 0.9, side);
    this.npc(g, npcs, sc + rand(-1, 1), side * (H(sc) + rand(2.6, 3.0)), 0.2, 'shop'); // behind the stall
    if (R() < 0.6) this.npc(g, npcs, sc + rand(-1.5, 1.5), side * (H(sc) + rand(0.4, 1.0)), 0.2);
    if (R() < 0.18) this.dogIdle(g, sc + rand(-1.5, 1.5), side * (H(sc) + rand(0.3, 0.9)));
    const bh = pick([5, 6, 8]);
    mesh(buildingGeo(6, bh + 3, w + 0.2), winMat(pick(KOLKATA_COLORS)), side * (H(sc) + 6.2), (bh - 3) / 2, 0, an);
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
    if (!o.geometry.userData.shared) o.geometry.dispose();          // everything made for this chunk (cached shapes are marked shared)
    const m = o.material;
    if (m && !m.userData.shared && m !== wireMat) m.dispose();
  });
}
