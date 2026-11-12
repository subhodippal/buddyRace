// Low-poly procedural models: buddies, vehicles, animals, obstacles, pickups.
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  return matCache.get(key);
}
const geoCache = new Map();
function cached(key, make) { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); }
export const boxG = (w, h, d) => cached(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const sphG = (r, s = 10) => cached(`s${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(6, s - 2)));
const cylG = (r1, r2, h, s = 8) => cached(`c${r1},${r2},${h},${s}`, () => new THREE.CylinderGeometry(r1, r2, h, s));
const torG = (r, t) => cached(`t${r},${t}`, () => new THREE.TorusGeometry(r, t, 6, 18));

export function mesh(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}

// soft blob shadow under things (cheap on mobile)
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
export function blobShadow(w, d, parent) {
  const s = new THREE.Mesh(shadowGeo, shadowMat);
  s.scale.set(w, 1, d); s.position.y = 0.03; s.renderOrder = 1;
  if (parent) parent.add(s);
  return s;
}

// ---------------- buddy (runner) ----------------
export function makeBuddy({ skin = 0xc68642, shirt = 0xff5533, pants = 0x2d3f73, hair = 0x161616, lungi = false, glasses = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body); // body tilts/falls; root stays on ground
  const mSkin = mat(skin), mShirt = mat(shirt), mPants = mat(pants);

  const torso = mesh(boxG(0.72, 0.8, 0.42), mShirt, 0, 1.38, 0, body);
  mesh(boxG(0.74, 0.12, 0.44), mat(0x3a2a1a), 0, 0.98, 0, body); // belt
  const head = new THREE.Group(); head.position.set(0, 1.98, 0); body.add(head);
  mesh(sphG(0.3, 12), mSkin, 0, 0, 0, head);
  const hairM = mesh(sphG(0.31, 12), mat(hair), 0, 0.12, -0.07, head); hairM.scale.set(1, 0.7, 1);
  mesh(boxG(0.06, 0.07, 0.04), mat(0x111111), -0.1, 0.02, 0.28, head);
  mesh(boxG(0.06, 0.07, 0.04), mat(0x111111), 0.1, 0.02, 0.28, head);
  mesh(boxG(0.16, 0.04, 0.04), mat(0x7a2a1a), 0, -0.13, 0.27, head); // mouth
  mesh(boxG(0.22, 0.05, 0.05), mat(0x161616), 0, -0.07, 0.27, head); // moustache
  if (glasses) mesh(boxG(0.42, 0.08, 0.04), mat(0x222222), 0, 0.03, 0.3, head);

  const limb = (x, y, w, h, m, handM) => {
    const p = new THREE.Group(); p.position.set(x, y, 0); body.add(p);
    mesh(boxG(w, h, w), m, 0, -h / 2, 0, p);
    if (handM) mesh(boxG(w * 0.95, 0.16, w * 1.1), handM, 0, -h - 0.04, 0.04, p);
    return p;
  };
  const armL = limb(0.47, 1.72, 0.19, 0.66, mShirt, mSkin);
  const armR = limb(-0.47, 1.72, 0.19, 0.66, mShirt, mSkin);
  const legM = lungi ? mat(lungi) : mPants;
  const legL = limb(0.18, 0.98, 0.25, 0.86, legM, mat(0x553311));
  const legR = limb(-0.18, 0.98, 0.25, 0.86, legM, mat(0x553311));

  // held items live in right hand
  const hand = new THREE.Group(); hand.position.set(0, -0.72, 0.08); armR.add(hand);
  const stick = mesh(cylG(0.05, 0.06, 1.3, 6), mat(0x7b4a22), 0, 0, 0.45, hand);
  stick.rotation.x = Math.PI / 2; stick.visible = false;
  const stone = mesh(cached('stoneG', () => new THREE.DodecahedronGeometry(0.16)), mat(0x8a8a8a), 0, -0.05, 0.05, hand);
  stone.visible = false;

  const shadow = blobShadow(1.1, 1.1, root);
  return { root, body, torso, head, armL, armR, legL, legR, stick, stone, shadow };
}

// generic seated rider (for vehicles)
function rider(parent, shirt, x, y, z, helmet = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  mesh(boxG(0.5, 0.6, 0.32), mat(shirt), 0, 0.3, 0, g);
  mesh(sphG(0.22, 10), mat(0xb5773d), 0, 0.82, 0.02, g);
  mesh(helmet ? sphG(0.26, 10) : boxG(0.36, 0.12, 0.36), mat(helmet ? 0xd62828 : 0x1a1a1a), 0, helmet ? 0.88 : 0.98, 0, g);
  const a1 = mesh(boxG(0.13, 0.13, 0.55), mat(shirt), 0.3, 0.45, 0.25, g);
  const a2 = mesh(boxG(0.13, 0.13, 0.55), mat(shirt), -0.3, 0.45, 0.25, g);
  mesh(boxG(0.18, 0.18, 0.6), mat(0x333344), 0.13, 0, 0.25, g);
  mesh(boxG(0.18, 0.18, 0.6), mat(0x333344), -0.13, 0, 0.25, g);
  return g;
}

function wheel(parent, r, x, y, z, t = 0.07) {
  const w = mesh(torG(r, t), mat(0x1a1a1a), x, y, z, parent);
  w.rotation.y = Math.PI / 2;
  const hub = mesh(cylG(0.06, 0.06, 0.12, 6), mat(0x999999), x, y, z, parent); hub.rotation.z = Math.PI / 2;
  return w;
}

const pick = a => a[(Math.random() * a.length) | 0];

// ---------------- vehicles ----------------
// all face +z; returned {root, w, d, h} where w/d are half-extents for collision
export function makeRickshaw() {
  const g = new THREE.Group();
  const col = pick([0x1d5fbf, 0xc0392b, 0x16a085, 0x8e44ad]);
  wheel(g, 0.48, 0.68, 0.48, -0.45, 0.05); wheel(g, 0.48, -0.68, 0.48, -0.45, 0.05);
  wheel(g, 0.36, 0, 0.36, 1.25, 0.05);
  mesh(boxG(1.3, 0.12, 0.7), mat(0x333333), 0, 0.5, -0.45, g); // axle bed
  mesh(boxG(1.2, 0.35, 0.65), mat(col), 0, 0.95, -0.45, g); // seat box
  mesh(boxG(1.2, 0.12, 0.6), mat(0xe8e8e8), 0, 1.18, -0.45, g); // cushion
  mesh(boxG(1.2, 0.7, 0.1), mat(col), 0, 1.5, -0.8, g); // backrest
  const hood = mesh(cached('hood', () => new THREE.CylinderGeometry(0.65, 0.65, 0.8, 10, 1, true, 0, Math.PI)), mat(0x111111, { side: THREE.DoubleSide }), 0, 1.75, -0.7, g);
  hood.rotation.z = Math.PI / 2; hood.rotation.y = Math.PI / 2;
  mesh(boxG(0.08, 0.08, 1.7), mat(0x444444), 0, 0.75, 0.4, g); // frame
  mesh(boxG(0.6, 0.06, 0.06), mat(0x444444), 0, 1.25, 1.15, g); // handlebar
  mesh(boxG(0.3, 0.08, 0.35), mat(0x222222), 0, 1.08, 0.7, g); // driver seat
  rider(g, pick([0xffffff, 0xd9c58c, 0x93a8c8]), 0, 1.1, 0.7);
  if (Math.random() < 0.6) rider(g, pick([0xe67e22, 0xf1c40f, 0xe84393]), 0, 1.22, -0.45);
  blobShadow(1.8, 2.8, g);
  return { root: g, w: 0.8, d: 1.3, h: 2.2, kind: 'rickshaw', sound: 'bell', word: 'ক্রিং ক্রিং!' };
}

export function makeCycle() {
  const g = new THREE.Group();
  wheel(g, 0.36, 0, 0.36, -0.55, 0.04); wheel(g, 0.36, 0, 0.36, 0.55, 0.04);
  const c = mat(pick([0x111111, 0x0b5394, 0xa61c00]));
  mesh(boxG(0.06, 0.06, 1.0), c, 0, 0.7, 0, g);
  const s = mesh(boxG(0.06, 0.6, 0.06), c, 0, 0.55, -0.2, g); s.rotation.x = 0.3;
  mesh(boxG(0.5, 0.05, 0.05), c, 0, 1.05, 0.5, g);
  rider(g, pick([0x27ae60, 0xffffff, 0xf39c12, 0x2980b9]), 0, 0.85, -0.15);
  blobShadow(0.7, 1.7, g);
  return { root: g, w: 0.35, d: 0.95, h: 2.0, kind: 'cycle', sound: 'bell', word: 'ক্রিং!' };
}

export function makeAuto() {
  const g = new THREE.Group();
  wheel(g, 0.27, 0.6, 0.27, -0.7, 0.09); wheel(g, 0.27, -0.6, 0.27, -0.7, 0.09); wheel(g, 0.27, 0, 0.27, 1.0, 0.09);
  const green = mat(0x1e8c3a), yellow = mat(0xf4d03f);
  mesh(boxG(1.4, 0.55, 2.3), green, 0, 0.7, 0, g);
  const nose = mesh(boxG(0.9, 1.0, 0.35), green, 0, 1.05, 1.05, g);
  mesh(boxG(0.85, 0.5, 0.05), mat(0x9fd3ff, { transparent: true, opacity: 0.55 }), 0, 1.65, 1.08, g);
  mesh(boxG(1.46, 0.12, 2.3), yellow, 0, 2.05, -0.05, g);
  mesh(boxG(1.42, 0.5, 1.2), yellow, 0, 1.75, -0.6, g); // canopy back
  for (const x of [-0.68, 0.68]) mesh(boxG(0.06, 1.0, 0.06), mat(0x222222), x, 1.5, 1.0, g);
  mesh(boxG(1.2, 0.35, 0.5), mat(0x222222), 0, 1.15, -0.55, g); // back seat
  rider(g, pick([0xffffff, 0x95a5a6]), 0, 0.95, 0.5);
  mesh(sphG(0.09, 6), mat(0xffffcc, { emissive: 0x666633 }), 0, 1.25, 1.24, g); // headlight
  blobShadow(1.8, 3, g);
  return { root: g, w: 0.75, d: 1.25, h: 2.2, kind: 'auto', sound: 'horn', word: 'প্যাঁ পোঁ!' };
}

export function makeToto() {
  const g = new THREE.Group();
  wheel(g, 0.26, 0.62, 0.26, -0.8, 0.08); wheel(g, 0.26, -0.62, 0.26, -0.8, 0.08); wheel(g, 0.26, 0, 0.26, 1.05, 0.08);
  const body = mat(pick([0x2e86de, 0x10ac84, 0xee5253]));
  mesh(boxG(1.35, 0.4, 2.4), body, 0, 0.6, 0, g);
  mesh(boxG(1.0, 0.9, 0.12), mat(0xf5f6fa), 0, 1.15, 1.1, g);
  mesh(boxG(1.45, 0.1, 2.5), mat(0xf5f6fa), 0, 2.15, 0, g); // roof
  for (const [x, z] of [[-0.66, 1.1], [0.66, 1.1], [-0.66, -1.15], [0.66, -1.15]]) mesh(boxG(0.06, 1.4, 0.06), mat(0x888888), x, 1.45, z, g);
  mesh(boxG(1.2, 0.3, 0.5), mat(0x34495e), 0, 0.95, -0.3, g);
  mesh(boxG(1.2, 0.3, 0.5), mat(0x34495e), 0, 0.95, -0.95, g);
  rider(g, pick([0xffffff, 0xe1b12c]), 0, 0.85, 0.55);
  if (Math.random() < 0.7) rider(g, pick([0xe84393, 0x6c5ce7, 0xfdcb6e]), 0.3, 1.0, -0.4);
  if (Math.random() < 0.5) rider(g, pick([0x00cec9, 0xd63031]), -0.3, 1.0, -0.4);
  blobShadow(1.8, 3, g);
  return { root: g, w: 0.75, d: 1.3, h: 2.2, kind: 'toto', sound: 'horn', word: 'সাইড দাও!' };
}

export function makeBike() {
  const g = new THREE.Group();
  wheel(g, 0.33, 0, 0.33, -0.65, 0.1); wheel(g, 0.33, 0, 0.33, 0.65, 0.1);
  const c = mat(pick([0x111111, 0x8e1b1b, 0x1b3c8e]));
  mesh(boxG(0.35, 0.4, 1.1), c, 0, 0.65, 0, g);
  mesh(boxG(0.3, 0.12, 0.6), mat(0x222222), 0, 0.92, -0.25, g);
  mesh(boxG(0.7, 0.05, 0.05), mat(0x999999), 0, 1.15, 0.55, g);
  mesh(sphG(0.1, 6), mat(0xffffcc, { emissive: 0x666633 }), 0, 0.95, 0.72, g);
  rider(g, pick([0x2c3e50, 0x7f8c8d, 0xc0392b]), 0, 0.95, -0.2, true);
  blobShadow(0.8, 1.9, g);
  return { root: g, w: 0.35, d: 1.0, h: 2.0, kind: 'bike', sound: 'horn', word: 'পিঁ পিঁ!' };
}

// ---------------- animals ----------------
function quadruped(color, len, ht, sitting) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const m = mat(color);
  const legs = [];
  const legH = sitting ? 0.1 : ht * 0.55;
  const bodyY = sitting ? ht * 0.35 : legH + ht * 0.22;
  mesh(boxG(ht * 0.55, ht * 0.45, len), m, 0, bodyY, 0, body);
  if (!sitting) {
    for (const [x, z] of [[0.15, 0.35], [-0.15, 0.35], [0.15, -0.35], [-0.15, -0.35]]) {
      const p = new THREE.Group(); p.position.set(x * ht * 1.6, legH, z * len); body.add(p);
      mesh(boxG(ht * 0.14, legH, ht * 0.14), m, 0, -legH / 2, 0, p); legs.push(p);
    }
  } else {
    for (const x of [0.28, -0.28]) mesh(boxG(ht * 0.18, ht * 0.15, len * 0.35), m, x * ht, ht * 0.08, len * 0.35, body);
  }
  return { g, body, legs, bodyY, m };
}

export function makeDog() {
  const color = pick([0xb07a3c, 0xd9a066, 0x3b2a1e, 0xe8d8b8, 0x8a5a2b]);
  const q = quadruped(color, 0.9, 0.75, false);
  const head = new THREE.Group(); head.position.set(0, q.bodyY + 0.22, 0.5); q.body.add(head);
  mesh(boxG(0.32, 0.3, 0.32), q.m, 0, 0, 0, head);
  mesh(boxG(0.18, 0.15, 0.22), q.m, 0, -0.05, 0.22, head);
  mesh(boxG(0.08, 0.06, 0.05), mat(0x111111), 0, -0.02, 0.34, head);
  mesh(boxG(0.08, 0.14, 0.06), mat(0x3b2a1e), 0.12, 0.2, -0.05, head);
  mesh(boxG(0.08, 0.14, 0.06), mat(0x3b2a1e), -0.12, 0.2, -0.05, head);
  const tail = mesh(boxG(0.06, 0.06, 0.35), q.m, 0, q.bodyY + 0.15, -0.55, q.body); tail.rotation.x = -0.7;
  blobShadow(0.7, 1.1, q.g);
  return { root: q.g, body: q.body, legs: q.legs, head, tail };
}

export function makeCow() {
  const q = quadruped(0xf2efe6, 1.8, 1.4, true);
  mesh(boxG(0.4, 0.35, 0.5), mat(0x9a9a9a), 0.25, q.bodyY + 0.1, -0.3, q.body); // spot
  const head = new THREE.Group(); head.position.set(0, 0.95, 1.0); q.body.add(head);
  mesh(boxG(0.42, 0.42, 0.55), q.m, 0, 0, 0, head);
  mesh(boxG(0.36, 0.22, 0.2), mat(0xe7b9a8), 0, -0.12, 0.33, head);
  for (const s of [1, -1]) {
    const h = mesh(cylG(0.03, 0.06, 0.35, 5), mat(0xd9c9a0), s * 0.2, 0.32, -0.05, head); h.rotation.z = -s * 0.5;
    mesh(boxG(0.2, 0.08, 0.1), q.m, s * 0.3, 0.12, -0.05, head);
  }
  mesh(boxG(0.08, 0.06, 0.04), mat(0x111111), 0.12, 0.08, 0.28, head);
  mesh(boxG(0.08, 0.06, 0.04), mat(0x111111), -0.12, 0.08, 0.28, head);
  blobShadow(1.6, 2.4, q.g);
  return { root: q.g, head, w: 0.55, d: 1.2, h: 1.15, kind: 'cow', word: 'হাম্বা!', sound: 'moo', jumpable: true };
}

export function makeGoat() {
  const color = pick([0x2a2a2a, 0xffffff, 0x8b5a2b]);
  const q = quadruped(color, 0.95, 0.85, true);
  const head = new THREE.Group(); head.position.set(0, 0.55, 0.55); q.body.add(head);
  mesh(boxG(0.25, 0.28, 0.36), q.m, 0, 0, 0, head);
  mesh(boxG(0.06, 0.15, 0.05), mat(0xcccccc), 0, -0.2, 0.15, head); // beard
  for (const s of [1, -1]) { const h = mesh(boxG(0.05, 0.22, 0.05), mat(0x777766), s * 0.08, 0.22, -0.08, head); h.rotation.x = -0.5; }
  mesh(boxG(0.3, 0.06, 0.1), q.m, 0, 0.08, -0.05, head);
  blobShadow(0.8, 1.2, q.g);
  return { root: q.g, head, w: 0.35, d: 0.6, h: 0.75, kind: 'goat', word: 'ম্যা ম্যা!', sound: 'baa', jumpable: true };
}

// ---------------- road obstacles ----------------
let stripeTex = null;
function stripes() {
  if (stripeTex) return stripeTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#e02020'; g.beginPath(); g.moveTo(i * 20 - 10, 32); g.lineTo(i * 20 + 6, 0); g.lineTo(i * 20 + 26, 0); g.lineTo(i * 20 + 10, 32); g.fill(); }
  stripeTex = new THREE.CanvasTexture(c); stripeTex.colorSpace = THREE.SRGBColorSpace;
  return stripeTex;
}
export function makeBlocker() {
  const g = new THREE.Group();
  const board = mesh(boxG(2.4, 0.35, 0.1), new THREE.MeshLambertMaterial({ map: stripes() }), 0, 0.8, 0, g);
  mesh(boxG(2.4, 0.25, 0.1), new THREE.MeshLambertMaterial({ map: stripes() }), 0, 0.35, 0, g);
  for (const x of [-1.05, 1.05]) {
    const l = mesh(boxG(0.1, 1.0, 0.1), mat(0x444444), x, 0.5, 0.15, g); l.rotation.x = 0.25;
    const l2 = mesh(boxG(0.1, 1.0, 0.1), mat(0x444444), x, 0.5, -0.15, g); l2.rotation.x = -0.25;
  }
  blobShadow(2.6, 0.7, g);
  return { root: g, w: 1.2, d: 0.25, h: 1.0, kind: 'blocker', jumpable: true };
}

export function makePothole() {
  const g = new THREE.Group();
  const rim = mesh(cached('phR', () => new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2)), mat(0x3a3530), 0, 0.02, 0, g);
  rim.scale.set(1.0, 1, 0.75);
  const water = mesh(cached('phW', () => new THREE.CircleGeometry(0.75, 14).rotateX(-Math.PI / 2)), mat(0x6b5a40, { emissive: 0x111111 }), 0, 0.03, 0, g);
  water.scale.set(1, 1, 0.7);
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    mesh(boxG(0.18, 0.08, 0.14), mat(0x555049), Math.cos(a) * 0.95, 0.04, Math.sin(a) * 0.72, g);
  }
  return { root: g, w: 0.8, d: 0.55, h: 0.25, kind: 'pothole', jumpable: true, trip: true };
}

export function makeStickPickup() {
  const g = new THREE.Group();
  const s = mesh(cylG(0.06, 0.07, 1.3, 6), mat(0x7b4a22), 0, 0.08, 0, g);
  s.rotation.z = Math.PI / 2; s.rotation.y = 0.6;
  const ring = mesh(cached('ring', () => new THREE.RingGeometry(0.7, 0.85, 20).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ color: 0xffee55, transparent: true, opacity: 0.7 }), 0, 0.04, 0, g);
  return { root: g, ring, item: 'stick' };
}
export function makeStonePickup() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const st = mesh(cached('stoneG2', () => new THREE.DodecahedronGeometry(0.17)), mat(0x8d8d8d), (i - 1) * 0.25, 0.12, (i % 2) * 0.15, g);
    st.rotation.set(Math.random() * 3, Math.random() * 3, 0);
  }
  const ring = mesh(cached('ring', () => new THREE.RingGeometry(0.7, 0.85, 20).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.7 }), 0, 0.04, 0, g);
  return { root: g, ring, item: 'stone' };
}
export function makeStoneProjectile() {
  return mesh(cached('stoneG', () => new THREE.DodecahedronGeometry(0.16)), mat(0x7a7a7a));
}

export const VEHICLES = [makeRickshaw, makeCycle, makeAuto, makeToto, makeBike];

// ================= v3 additions =================
const skinTones = [0xc68642, 0xa8703f, 0xd19a66, 0x8d5524, 0xb87a4b];
const clothes = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xffffff, 0xfd79a8, 0x6c5ce7, 0xd35400, 0x00b894];

// cheap bystander (few meshes). Women wear a saree (long skirt box + drape).
export function makeNPC(male = false) {
  const g = new THREE.Group();
  const female = !male && Math.random() < 0.4;
  const top = mat(pick(clothes)), skin = mat(pick(skinTones));
  if (female) {
    const sar = mat(pick(clothes));
    mesh(cylG(0.32, 0.45, 1.05, 8), sar, 0, 0.53, 0, g);
    const drape = mesh(boxG(0.1, 0.9, 0.5), sar, 0.2, 1.35, 0, g); drape.rotation.z = 0.35;
  } else {
    mesh(boxG(0.42, 0.95, 0.3), mat(Math.random() < 0.5 ? 0xffffff : pick([0x2d3f73, 0x444444, 0x6b4f2a])), 0, 0.48, 0, g);
  }
  mesh(boxG(0.6, 0.65, 0.36), top, 0, 1.33, 0, g);
  mesh(sphG(0.25, 8), skin, 0, 1.9, 0, g);
  mesh(sphG(0.26, 8), mat(female ? 0x111111 : pick([0x111111, 0x555555, 0xcccccc])), 0, 1.98, -0.04, g).scale.set(1, 0.7, 1);
  if (female) mesh(sphG(0.13, 6), mat(0x111111), 0, 1.85, -0.25, g); // bun
  const armL = new THREE.Group(); armL.position.set(0.38, 1.6, 0); g.add(armL);
  mesh(boxG(0.15, 0.6, 0.15), top, 0, -0.3, 0, armL);
  const armR = new THREE.Group(); armR.position.set(-0.38, 1.6, 0); g.add(armR);
  mesh(boxG(0.15, 0.6, 0.15), top, 0, -0.3, 0, armR);
  blobShadow(0.9, 0.9, g);
  return { root: g, armL, armR, female };
}

// the Hostel Superintendent — white kurta-dhoti, glasses, grey hair, cane
export function makeSuper() {
  const b = makeBuddy({ skin: 0xb5773d, shirt: 0xf4f1e6, lungi: 0xffffff, hair: 0xb8b8b8, glasses: true });
  mesh(boxG(0.78, 0.5, 0.5), mat(0xf4f1e6), 0, 1.25, 0.06, b.body); // belly
  b.stick.visible = true;
  b.root.scale.setScalar(1.12);
  return b;
}

export function makeWalker() { // pedestrian who crosses the road
  const b = makeBuddy({ skin: pick(skinTones), shirt: pick(clothes), pants: pick([0x333333, 0x6b4f2a, 0xffffff]), lungi: Math.random() < 0.3 ? pick([0x2e86de, 0x27ae60, 0x8e44ad]) : false, hair: pick([0x111111, 0x777777]) });
  b.root.scale.setScalar(0.95);
  return { root: b.root, buddy: b, w: 0.4, d: 0.4, h: 2.0, kind: 'walker', word: pick(['দেখে চলো!', 'এই! চোখ নেই?', 'আস্তে বাবা!']), walker: true };
}

export function makeHens() {
  const g = new THREE.Group();
  const birds = [];
  for (let i = 0; i < 3; i++) {
    const h = new THREE.Group(); h.position.set((i - 1) * 0.5, 0, (i % 2) * 0.4); g.add(h);
    const c = mat(pick([0xffffff, 0xb5651d, 0x222222]));
    mesh(sphG(0.22, 7), c, 0, 0.3, 0, h).scale.set(0.9, 0.9, 1.2);
    mesh(sphG(0.12, 6), c, 0, 0.52, 0.18, h);
    mesh(boxG(0.06, 0.08, 0.05), mat(0xd62828), 0, 0.66, 0.18, h);
    mesh(boxG(0.05, 0.04, 0.08), mat(0xf39c12), 0, 0.52, 0.32, h);
    birds.push(h);
  }
  return { root: g, birds, w: 0.9, d: 0.45, h: 0.6, kind: 'hens', word: 'কঁক কঁক!', sound: 'hen', walker: true, jumpable: true };
}

export function makeThela() { // hand-pushed vegetable cart
  const g = new THREE.Group();
  wheel(g, 0.35, 0.7, 0.35, -0.2, 0.06); wheel(g, 0.35, -0.7, 0.35, -0.2, 0.06);
  mesh(boxG(1.4, 0.1, 2.2), mat(0x8b5a2b), 0, 0.75, 0.2, g);
  mesh(boxG(1.4, 0.2, 0.06), mat(0x6b4423), 0, 0.88, 1.28, g);
  for (let i = 0; i < 14; i++) mesh(sphG(0.13, 6), mat(pick([0xe74c3c, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xe67e22])), rand2(-0.55, 0.55), 0.9, rand2(-0.7, 1.1), g);
  for (const x of [-0.5, 0.5]) mesh(boxG(0.06, 0.06, 0.9), mat(0x6b4423), x, 0.85, -1.2, g);
  rider(g, pick(clothes), 0, 0.2, -1.55).scale.set(1, 1.3, 1);
  blobShadow(1.8, 3.2, g);
  return { root: g, w: 0.75, d: 1.5, h: 2.0, kind: 'thela', word: pick(['সবজি! টাটকা সবজি!', 'সরে যাও!']), sound: 'bell' };
}
const rand2 = (a, b) => a + Math.random() * (b - a);

export function makeBanana() {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const p = mesh(boxG(0.1, 0.03, 0.32), mat(0xf4d03f), 0, 0.03, 0, g);
    p.rotation.y = i * 2.1; p.position.set(Math.cos(i * 2.1) * 0.1, 0.03, Math.sin(i * 2.1) * 0.1);
  }
  mesh(boxG(0.07, 0.05, 0.07), mat(0x5d4037), 0, 0.05, 0, g);
  return { root: g, w: 0.35, d: 0.35, h: 0.15, kind: 'banana', jumpable: true, slip: true };
}

let bumpTex = null;
export function makeBumper(half) {
  if (!bumpTex) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 16; const x = c.getContext('2d');
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#111' : '#f4d03f'; x.fillRect(i * 16, 0, 16, 16); }
    bumpTex = new THREE.CanvasTexture(c); bumpTex.colorSpace = THREE.SRGBColorSpace; bumpTex.wrapS = THREE.RepeatWrapping;
  }
  const g = new THREE.Group();
  const t = bumpTex.clone(); t.needsUpdate = true; t.repeat.set(half / 2, 1);
  const m = mesh(cached('bumpG', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1, false, 0, Math.PI)), new THREE.MeshLambertMaterial({ map: t }), 0, 0, 0, g);
  m.rotation.set(0, 0, Math.PI / 2); m.scale.set(0.5, half * 2, 0.6); // half-cylinder lying across the road
  return { root: g, w: half, d: 0.35, h: 0.22, kind: 'bumper', full: true, bump: true };
}

export function makeDrain(half, plankX = rand2(-half + 1.5, half - 1.5)) {
  const g = new THREE.Group();
  mesh(boxG(half * 2 + 0.2, 0.05, 1.3), mat(0x1d1a14), 0, 0.02, 0, g);            // dark gap
  mesh(boxG(half * 2 + 0.2, 0.06, 1.0), mat(0x3d4a2a, { emissive: 0x0a0f05 }), 0, 0.03, 0, g); // sludge
  for (const z of [-0.7, 0.7]) mesh(boxG(half * 2 + 0.2, 0.18, 0.15), mat(0x9a9a92), 0, 0.09, z, g); // concrete lips
  mesh(boxG(1.1, 0.1, 1.7), mat(0x8b5a2b), plankX, 0.12, 0, g); // plank to cross
  return { root: g, w: half, d: 0.55, h: 0.25, kind: 'drain', full: true, jumpable: true, plankX, word: 'নর্দমা!' };
}

export function makeSweetPickup() {
  const g = new THREE.Group();
  mesh(cylG(0.32, 0.22, 0.32, 10), mat(0xb5532c), 0, 0.17, 0, g); // clay pot (handi)
  for (let i = 0; i < 4; i++) mesh(sphG(0.11, 7), mat(0xfffaf0), Math.cos(i * 1.6) * 0.12, 0.38, Math.sin(i * 1.6) * 0.12, g);
  const ring = mesh(cached('ring', () => new THREE.RingGeometry(0.7, 0.85, 20).rotateX(-Math.PI / 2)), new THREE.MeshBasicMaterial({ color: 0xff7eb6, transparent: true, opacity: 0.7 }), 0, 0.04, 0, g);
  return { root: g, ring, item: 'sweet' };
}

export function makeBoat() {
  const g = new THREE.Group();
  const hull = mesh(boxG(1.4, 0.5, 5), mat(0x5d4037), 0, 0, 0, g);
  mesh(boxG(1.0, 0.3, 4.0), mat(0x3e2723), 0, 0.2, 0, g);
  const roof = mesh(cached('boatRoof', () => new THREE.CylinderGeometry(0.75, 0.75, 1.8, 10, 1, true, 0, Math.PI)), mat(0x8d6e63, { side: THREE.DoubleSide }), 0, 0.35, -0.4, g);
  roof.rotation.set(0, Math.PI / 2, Math.PI / 2); // arch over the boat, axis along its length
  rider(g, 0xffffff, 0, 0.2, 1.6);
  return g;
}

// ---------- overhead hazards: crawl under them (full road width, too high to jump) ----------
const BAR_Y = 1.35; // a standing runner's head hits this; a crawling one passes under
// two men carrying a long bamboo ladder across the road
export function makeLadder(half) {
  const g = new THREE.Group(), bamboo = mat(0xc9a14a);
  const L = half * 2 + 1.4;
  for (const z of [-0.22, 0.22]) { const rail = mesh(cylG(0.06, 0.06, L, 6), bamboo, 0, BAR_Y, z, g); rail.rotation.z = Math.PI / 2; }
  for (let x = -L / 2 + 0.3; x < L / 2; x += 0.45) { const rung = mesh(cylG(0.035, 0.035, 0.44, 5), bamboo, x, BAR_Y, 0, g); rung.rotation.x = Math.PI / 2; }
  const carriers = [];
  for (const s of [-1, 1]) {
    const b = makeBuddy({ skin: pick(skinTones), shirt: pick(clothes), lungi: pick([0x2e86de, 0x27ae60, 0xffffff]), hair: 0x111111 });
    b.root.position.set(s * (half + 0.45), 0, 0); b.root.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    b.armL.rotation.set(-2.9, 0, 0); b.armR.rotation.set(-2.9, 0, 0); // holding the ladder up
    g.add(b.root); carriers.push(b);
  }
  blobShadow(L, 0.8, g);
  return { root: g, carriers, w: half, d: 0.3, h: 3, kind: 'ladder', full: true, overhead: true };
}
// a long wooden beam resting on two sawhorses
export function makeBeam(half) {
  const g = new THREE.Group(), wood = mat(0x8b5a2b), dark = mat(0x5a3a1c);
  const L = half * 2 + 0.6;
  const beam = mesh(boxG(L, 0.32, 0.36), wood, 0, BAR_Y + 0.05, 0, g);
  beam.rotation.z = rand2(-0.03, 0.03);
  for (const x of [-half + 0.2, half - 0.2]) for (const s of [-1, 1]) {
    const leg = mesh(boxG(0.1, BAR_Y + 0.1, 0.1), dark, x + s * 0.25, BAR_Y / 2, 0, g); leg.rotation.z = s * 0.3;
  }
  for (let i = 0; i < 4; i++) mesh(boxG(0.4, 0.05, 0.38), dark, rand2(-half, half), BAR_Y + 0.22, 0, g); // nails & patches
  blobShadow(L, 0.6, g);
  return { root: g, w: half, d: 0.3, h: 3, kind: 'beam', full: true, overhead: true };
}
// a big tree fallen across the road, held up by its own branches
export function makeFallenTree(half) {
  const g = new THREE.Group(), bark = mat(0x6b4a2b), leaf = mat(0x3f8f3a), leaf2 = mat(0x2f7d32);
  const L = half * 2 + 3;
  const trunk = mesh(cylG(0.32, 0.45, L, 9), bark, 0.8, BAR_Y + 0.2, 0, g); trunk.rotation.z = Math.PI / 2 + 0.04;
  const side = Math.random() < 0.5 ? -1 : 1;
  for (let i = 0; i < 7; i++) mesh(sphG(rand2(0.9, 1.4), 7), i % 2 ? leaf : leaf2, side * (half + rand2(0.5, 2.2)), rand2(0.8, 2.4), rand2(-1.2, 1.2), g); // the crown on the roadside
  const roots = mesh(cylG(0.2, 0.7, 0.6, 7), bark, -side * (half + 1.2), BAR_Y, 0, g); roots.rotation.z = side * Math.PI / 2;
  for (const x of [-half * 0.6, half * 0.3]) { const prop = mesh(cylG(0.08, 0.12, BAR_Y + 0.2, 5), bark, x, BAR_Y / 2, 0.15, g); prop.rotation.z = rand2(-0.35, 0.35); }
  for (let i = 0; i < 6; i++) mesh(sphG(0.18, 5), leaf, rand2(-half, half), 0.1, rand2(-0.6, 0.6), g); // fallen leaves
  blobShadow(L, 1.2, g);
  return { root: g, w: half, d: 0.45, h: 3, kind: 'tree', full: true, overhead: true };
}
