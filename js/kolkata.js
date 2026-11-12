// Kolkata: landmarks and side scenes along the road.
// A level segment can carry `sights: ['victoria', …]`. "Centre" sights are one big model beside (or over) the road at
// the middle of the segment; "along" sights run the whole segment (rail line, tram line, Howrah Bridge truss…).
// World calls build(kind, ctx) from its chunk builder; ctx carries the helpers so this file doesn't import world.js.
import * as THREE from 'three';
import { mat, mesh, boxG, makeBuddy, makeBoat } from './models.js';

const glow = c => new THREE.MeshBasicMaterial({ color: c });
const V = () => new THREE.Vector3();
// a beam (box) between two world points
function beam(g, a, b, t, material) {
  const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.BoxGeometry(t, t, len), material);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b); g.add(m); return m;
}
const halfDome = (r, w = 18, h = 9) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2);

// what kind of sight each one is: 'centre' (built once, beside the road), 'along' (every chunk of the segment)
export const SIGHT_KIND = {
  victoria: 'centre', planetarium: 'centre', ecopark: 'centre', biswabangla: 'centre', mohunbagan: 'centre',
  cricket: 'centre', kalighat: 'centre', ghat: 'centre', festival: 'centre',
  howrah: 'along', setu: 'along', rail: 'along', tram: 'along',
};
// how much roadside room a centre sight needs (props keep out of ±r metres on its side)
export const SIGHT_ROOM = { victoria: 50, planetarium: 40, ecopark: 46, biswabangla: 0, mohunbagan: 46, cricket: 40, kalighat: 36, ghat: 22, festival: 34, rail: 1e9 };
export const SIGHT_NAME = {
  victoria: ['ভিক্টোরিয়া মেমোরিয়াল', 'কলকাতা • ১৯২১'], planetarium: ['বিড়লা তারামণ্ডল', 'আকাশের তারা দেখুন'],
  ecopark: ['ইকো পার্ক', 'নিউ টাউন'], biswabangla: ['বিশ্ব বাংলা গেট', 'নিউ টাউন'], mohunbagan: ['মোহনবাগান মাঠ', 'জয় মোহনবাগান!'],
  cricket: ['ক্রিকেট মাঠ', 'পাড়ার টুর্নামেন্ট'], kalighat: ['কালীঘাট মন্দির', 'জয় মা কালী'], ghat: ['গঙ্গার ঘাট', 'বাবুঘাট'],
  festival: ['সর্বজনীন দুর্গোৎসব', 'আলোর রোশনাই'], howrah: ['হাওড়া ব্রিজ', 'রবীন্দ্র সেতু'], setu: ['বিদ্যাসাগর সেতু', 'দ্বিতীয় হুগলি সেতু'],
  rail: ['রেললাইন', 'সাবধানে পার হোন'], tram: ['ট্রাম লাইন', 'কলকাতার ট্রাম'],
};

// ctx: { g, track, H(s), side, sc (centre s), a, b (chunk range), seg, anchor(s, lat, y), sign(textArr, s, lat, y),
//        npc(s, lat, y, role), anim(fn(t, dt)), sound(name, s), mats, plane, evening }
export function buildSight(kind, ctx) { const f = B[kind]; if (f) f(ctx); }

const B = {
  // ---------- ভিক্টোরিয়া মেমোরিয়াল ----------
  victoria(c) {
    const { side } = c, H = c.H(c.sc), an = c.anchor(c.sc), X = k => side * (H + k);
    const W = mat(0xf4f1ea), G = mat(0x6fb34a);
    const lawn = c.plane(50, 84, G, an); lawn.rotation.x = -Math.PI / 2; lawn.position.set(X(27), 0.04, 0);
    const pond = c.plane(5, 60, c.mats.water, an); pond.rotation.x = -Math.PI / 2; pond.position.set(X(7), 0.06, 0);
    mesh(boxG(26, 1.6, 50), W, X(32), 0.8, 0, an);                                       // plinth
    mesh(boxG(18, 9, 40), W, X(32), 6, 0, an);                                            // main hall
    mesh(boxG(3, 7, 16), W, X(22), 5, 0, an);                                             // front portico
    for (let i = -3; i <= 3; i++) mesh(boxG(0.2, 4.5, 1.4), mat(0x5a5a62), X(20.4), 4, i * 2, an);
    for (const z of [-17, 17]) for (const x of [26, 38]) {                                // corner towers + domes
      mesh(boxG(5, 13, 5), W, X(x), 8, z, an);
      mesh(halfDome(2.8), W, X(x), 14.5, z, an);
    }
    mesh(new THREE.CylinderGeometry(7.5, 7.5, 4.5, 24), W, X(32), 12.6, 0, an);           // drum
    mesh(halfDome(7.5, 24, 12), W, X(32), 14.8, 0, an);                                    // the great dome
    mesh(new THREE.CylinderGeometry(1.2, 1.2, 3, 12), W, X(32), 23.5, 0, an);
    const angel = new THREE.Group(); angel.position.set(X(32), 25.5, 0); an.add(angel);    // the black angel of victory
    mesh(boxG(0.6, 1.8, 0.5), mat(0x1c1c1c), 0, 0, 0, angel);
    for (const s of [1, -1]) { const w = mesh(boxG(0.1, 1.2, 1.4), mat(0x1c1c1c), 0, 0.3, s * 0.6, angel); w.rotation.x = s * 0.5; }
    c.anim(t => { angel.rotation.y = t * 0.3; });
    c.sign(SIGHT_NAME.victoria, c.sc - 10, X(3), 2.6);
  },
  // ---------- বিড়লা তারামণ্ডল ----------
  planetarium(c) {
    const { side } = c, H = c.H(c.sc), an = c.anchor(c.sc), X = k => side * (H + k);
    const W = mat(0xf7f5ef), ribs = mat(0xd9d4c6);
    const lawn = c.plane(40, 50, mat(0x7cbf55), an); lawn.rotation.x = -Math.PI / 2; lawn.position.set(X(22), 0.04, 0);
    mesh(new THREE.CylinderGeometry(13, 13.5, 6, 32), W, X(24), 3, 0, an);
    mesh(halfDome(12, 32, 14), W, X(24), 6, 0, an);
    for (let i = 0; i < 16; i++) {                                                         // the ribs of the stupa dome
      const a = i / 16 * Math.PI * 2, r = mesh(new THREE.TorusGeometry(12.15, 0.25, 4, 16, Math.PI / 2), ribs, X(24), 6, 0, an);
      r.rotation.set(0, a, Math.PI / 2);
    }
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; mesh(boxG(0.8, 6, 0.8), ribs, X(24) + Math.cos(a) * 13.3, 3, Math.sin(a) * 13.3, an); }
    mesh(new THREE.CylinderGeometry(0.7, 1.2, 3, 10), W, X(24), 19, 0, an);
    mesh(new THREE.SphereGeometry(1, 10, 8), mat(0xd4af37), X(24), 21, 0, an);
    c.sign(SIGHT_NAME.planetarium, c.sc - 8, X(3), 2.6);
  },
  // ---------- ইকো পার্ক ----------
  ecopark(c) {
    const { side } = c, H = c.H(c.sc), an = c.anchor(c.sc), X = k => side * (H + k);
    const lake = c.plane(48, 76, c.mats.water, an); lake.rotation.x = -Math.PI / 2; lake.position.set(X(34), 0.05, 0);
    const isl = mesh(new THREE.CylinderGeometry(7, 8, 0.6, 14), mat(0x6fb34a), X(36), 0.3, 6, an);
    for (let i = 0; i < 4; i++) { const t = mesh(new THREE.IcosahedronGeometry(2.2, 0), mat(0x3f8f3a), X(35 + (i % 2) * 3), 3.5, 4 + i * 2, an); mesh(boxG(0.4, 3, 0.4), mat(0x6b4423), t.position.x, 1.5, t.position.z, an); }
    const boats = [];
    for (let i = 0; i < 3; i++) { const b = makeBoat(); b.position.set(X(22 + i * 9), 0.1, -20 + i * 14); b.rotation.y = i; an.add(b); boats.push(b); }
    c.anim(t => boats.forEach((b, i) => { b.position.y = 0.1 + Math.sin(t * 1.5 + i) * 0.08; b.rotation.z = Math.sin(t + i) * 0.05; }));
    for (const z of [-5, 5]) mesh(boxG(1.2, 6, 1.2), mat(0x2e8b57), X(4), 3, z, an);         // the gate
    mesh(boxG(1.4, 1.4, 12), mat(0x2e8b57), X(4), 6.6, 0, an);
    for (let i = 0; i < 14; i++) { const t = mesh(new THREE.IcosahedronGeometry(1.8, 0), mat(i % 2 ? 0x4ca64a : 0x2f7d32), X(8 + (i % 3) * 3), 3, -36 + i * 5.5, an); }
    c.sign(SIGHT_NAME.ecopark, c.sc, X(4.6), 8.6, 7);
  },
  // ---------- বিশ্ব বাংলা গেট: a ring on slanted legs, right over the road ----------
  biswabangla(c) {
    const tr = c.track, s = c.sc, H = c.H(s), g = c.g;
    const top = tr.pos(s, 0, 15, V()), steel = mat(0x8c96a0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 1.3, 10, 48), steel); ring.position.copy(top); ring.rotation.x = Math.PI / 2; g.add(ring);
    const band = new THREE.Mesh(new THREE.TorusGeometry(9, 1.35, 4, 48), glow(0x6ad1ff)); band.scale.set(1, 1, 0.35); band.position.copy(top); band.rotation.x = Math.PI / 2; g.add(band);
    for (const lat of [-1, 1]) for (const dz of [-6, 6]) {
      const foot = tr.pos(s + dz, lat * (H + 2), 0, V()), head = tr.pos(s + dz * 0.6, lat * 7.5, 14.5, V());
      beam(g, foot, head, 0.9, steel);
    }
    const lights = [0x6ad1ff, 0xff6ad5, 0xffe14a, 0x7dff8a];
    c.anim(t => { band.material.color.setHex(c.evening() ? lights[Math.floor(t / 1.5) % 4] : 0x9fd3ff); });
    c.sign(SIGHT_NAME.biswabangla, s - 16, -(H + 2.2), 2.6);
  },
  // ---------- মোহনবাগান মাঠ: stands, floodlights and a football match ----------
  mohunbagan(c) {
    const { side } = c, H = c.H(c.sc), an = c.anchor(c.sc), X = k => side * (H + k);
    const grass = c.plane(30, 48, mat(0x3f9e3a), an); grass.rotation.x = -Math.PI / 2; grass.position.set(X(20), 0.05, 0);
    const line = (w, l, x, z) => { const p = c.plane(w, l, glow(0xffffff), an); p.rotation.x = -Math.PI / 2; p.position.set(X(x), 0.07, z); };
    line(28, 0.15, 20, 0); line(28, 0.15, 20, 23); line(28, 0.15, 20, -23); line(0.15, 46, 6, 0); line(0.15, 46, 34, 0);
    const circ = mesh(new THREE.TorusGeometry(4, 0.08, 4, 32), glow(0xffffff), X(20), 0.08, 0, an); circ.rotation.x = Math.PI / 2;
    for (const z of [-23, 23]) {                                                            // goals
      mesh(boxG(0.15, 2.4, 0.15), mat(0xffffff), X(16.5), 1.2, z, an); mesh(boxG(0.15, 2.4, 0.15), mat(0xffffff), X(23.5), 1.2, z, an);
      mesh(boxG(7.2, 0.15, 0.15), mat(0xffffff), X(20), 2.4, z, an);
    }
    for (let i = 0; i < 3; i++) for (let k = 0; k < 6; k++)                                 // stands in green & maroon
      mesh(boxG(2.5, 1.2 + i * 1.2, 8), mat(k % 2 ? 0x0b6b3a : 0x7a1020), X(38 + i * 2.5), (1.2 + i * 1.2) / 2, -20 + k * 8, an);
    for (const z of [-24, 24]) for (const x of [4, 36]) { mesh(boxG(0.6, 20, 0.6), mat(0x777777), X(x), 10, z, an); mesh(boxG(2.6, 1.6, 0.4), glow(0xfffbe0), X(x), 20, z, an); }
    const sg = c.plane(16, 3.4, c.basicSign(SIGHT_NAME.mohunbagan, '#0b6b3a', '#ffffff'), an); sg.position.set(X(44), 8, 0); sg.rotation.y = -side * Math.PI / 2;
    // the match: two teams chasing the ball
    const ball = mesh(new THREE.SphereGeometry(0.25, 10, 8), mat(0xffffff), X(20), 0.25, 0, an);
    const players = [];
    for (let i = 0; i < 10; i++) {
      const b = makeBuddy({ shirt: i < 5 ? 0x0b6b3a : 0x2e86de, pants: i < 5 ? 0x7a1020 : 0xffffff });
      b.root.scale.setScalar(0.85); b.root.position.set(X(10 + (i % 5) * 5), 0, (i < 5 ? -1 : 1) * (6 + (i % 3) * 5)); an.add(b.root);
      players.push({ b, home: b.root.position.clone(), ph: i });
    }
    let tx = X(20), tz = 0, next = 0;
    c.anim((t, dt) => {
      if (t > next) { next = t + 1.5 + Math.random() * 2; tx = X(8 + Math.random() * 24); tz = -20 + Math.random() * 40; if (Math.random() < 0.3) c.sound('cheer', c.sc); }
      ball.position.x += (tx - ball.position.x) * Math.min(1, dt * 2.2); ball.position.z += (tz - ball.position.z) * Math.min(1, dt * 2.2);
      ball.rotation.x += dt * 8;
      for (const p of players) {
        const gx = p.home.x * 0.5 + ball.position.x * 0.5 + Math.sin(p.ph) * 2, gz = p.home.z * 0.4 + ball.position.z * 0.6 + Math.cos(p.ph) * 3;
        const r = p.b.root, dx = gx - r.position.x, dz = gz - r.position.z, d = Math.hypot(dx, dz);
        if (d > 0.3) { r.position.x += dx / d * Math.min(d, dt * 5); r.position.z += dz / d * Math.min(d, dt * 5); r.rotation.y = Math.atan2(dx, dz); }
        const sw = Math.sin(t * 12 + p.ph) * (d > 0.3 ? 0.8 : 0.1); p.b.legL.rotation.x = sw; p.b.legR.rotation.x = -sw;
      }
    });
  },
  // ---------- ক্রিকেট মাঠ: bowler runs in, batsman swings ----------
  cricket(c) {
    const { side } = c, H = c.H(c.sc), an = c.anchor(c.sc), X = k => side * (H + k);
    const field = mesh(new THREE.CylinderGeometry(24, 24, 0.1, 40), mat(0x4caf50), X(27), 0.05, 0, an);
    const pitch = c.plane(2.5, 12, mat(0xd8c08a), an); pitch.rotation.x = -Math.PI / 2; pitch.position.set(X(27), 0.12, 0);
    for (const z of [-6, 6]) for (const dx of [-0.15, 0, 0.15]) mesh(boxG(0.05, 0.7, 0.05), mat(0xf2e6c4), X(27) + dx, 0.35, z, an);
    mesh(boxG(0.4, 4, 8), mat(0xffffff), X(50), 2, 0, an);                                  // sight screen
    const bat = makeBuddy({ shirt: 0xffffff, pants: 0xffffff }); bat.root.position.set(X(27), 0, 6.6); bat.root.rotation.y = Math.PI; an.add(bat.root);
    const bowl = makeBuddy({ shirt: 0xffffff, pants: 0xffffff }); an.add(bowl.root);
    const ball = mesh(new THREE.SphereGeometry(0.14, 8, 6), mat(0xc0392b), X(27), 1, 0, an);
    for (let i = 0; i < 6; i++) { const f = makeBuddy({ shirt: 0xffffff, pants: 0xffffff }); const a = i / 6 * Math.PI * 2; f.root.position.set(X(27) + Math.cos(a) * 16, 0, Math.sin(a) * 16); an.add(f.root); }
    c.anim(t => {
      const k = (t % 4) / 4;                                                                 // 4-second ball
      const run = Math.min(1, k / 0.45);
      bowl.root.position.set(X(27) + 0.4, 0, -16 + run * 9.5);
      const sw = Math.sin(t * 14) * (k < 0.45 ? 0.8 : 0); bowl.legL.rotation.x = sw; bowl.legR.rotation.x = -sw;
      bowl.armR.rotation.x = k > 0.4 && k < 0.5 ? -Math.PI * (k - 0.4) * 20 : 0;
      if (k < 0.5) ball.position.set(X(27) + 0.4, 1.6, -6.4);
      else if (k < 0.62) { const u = (k - 0.5) / 0.12; ball.position.set(X(27), 0.6 + Math.abs(Math.sin(u * Math.PI)) * 0.8, -6 + u * 12.4); }
      else { const u = (k - 0.62) / 0.38; ball.position.set(X(27) + side * u * 18, 1 + Math.sin(u * Math.PI) * 9, 6.4 - u * 14); if (u < 0.02) c.sound('stick', c.sc); }
      bat.armR.rotation.x = k > 0.58 && k < 0.7 ? -2.4 + (k - 0.58) * 20 : -0.6; bat.armL.rotation.x = bat.armR.rotation.x;
    });
    c.sign(SIGHT_NAME.cricket, c.sc - 6, X(3), 2.4);
  },
  // ---------- কালীঘাট মন্দির ----------
  kalighat(c) {
    const { side } = c, H = c.H(c.sc), an = c.anchor(c.sc), X = k => side * (H + k);
    const W = mat(0xf5efe0), R = mat(0xb3261e);
    mesh(boxG(16, 1.2, 18), mat(0xd8cbb0), X(14), 0.6, 0, an);                              // plinth
    mesh(boxG(7, 7, 7), W, X(16), 4.7, 0, an);                                              // sanctum
    for (const y of [2.2, 6.8]) mesh(boxG(7.1, 0.35, 7.1), R, X(16), y, 0, an);              // red bands
    const roof = mesh(new THREE.SphereGeometry(5.4, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), W, X(16), 8.2, 0, an); roof.scale.set(1, 0.75, 1); // curved Bengal roof
    mesh(new THREE.TorusGeometry(5.2, 0.3, 6, 24), R, X(16), 8.25, 0, an).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) mesh(new THREE.ConeGeometry(1.6 - i * 0.45, 2.2, 8), i % 2 ? R : W, X(16), 12 + i * 1.6, 0, an); // spire
    mesh(boxG(0.08, 3, 0.08), mat(0x444444), X(16), 17.5, 0, an);
    const flag = c.plane(1.6, 0.9, new THREE.MeshLambertMaterial({ color: 0xd62828, side: THREE.DoubleSide }), an); flag.position.set(X(16), 18.4, 0.8);
    c.anim(t => { flag.rotation.y = Math.sin(t * 3) * 0.4; });
    mesh(boxG(6, 0.5, 12), W, X(9), 5, 0, an);                                              // nat-mandir: the pillared hall
    for (const z of [-5, -1.7, 1.7, 5]) for (const x of [6.5, 11.5]) mesh(boxG(0.5, 4.2, 0.5), W, X(x), 2.9, z, an);
    for (let k = 0; k < 3; k++) {                                                           // flower-garland stalls by the road
      const z = -12 + k * 12;
      mesh(boxG(1.4, 0.9, 2.2), mat(0x8b5a2b), X(1.6), 0.65, z, an);
      for (let i = 0; i < 10; i++) mesh(new THREE.SphereGeometry(0.12, 6, 4), mat(i % 2 ? 0xff8c00 : 0xffd400), X(1.6) + (i % 2 - 0.5) * 0.4, 1.2, z - 0.9 + i * 0.2, an);
    }
    for (let i = 0; i < 5; i++) c.npc(c.sc - 8 + i * 4, X(4 + (i % 2) * 2), 0.2, '');
    let next = 0; c.anim(t => { if (t > next) { next = t + 5 + Math.random() * 5; c.sound('bell', c.sc); } });
    c.sign(SIGHT_NAME.kalighat, c.sc - 16, X(2.4), 2.5);
  },
  // ---------- গঙ্গার ঘাট: steps down to the water (river side) ----------
  ghat(c) {
    const side = 1, H = c.H(c.sc), an = c.anchor(c.sc), X = k => side * (H + k);           // the river is on the + side
    const stone = mat(0xc9b896);
    for (let i = 0; i < 6; i++) mesh(boxG(1.1, 0.4, 16), stone, X(4.5 + i * 1.0), 0.1 - i * 0.35, 0, an);
    mesh(boxG(4, 0.4, 5), stone, X(3), 0.2, -11, an);                                       // the little shrine at the top
    for (const x of [1.4, 4.6]) for (const z of [-13, -9]) mesh(boxG(0.35, 3, 0.35), mat(0xf5efe0), X(x), 1.7, z, an);
    mesh(halfDome(2.6, 12, 6), mat(0xf5efe0), X(3), 3.2, -11, an);
    const boats = [];
    for (let i = 0; i < 3; i++) { const b = makeBoat(); b.position.set(X(13 + i * 2), -0.7, -10 + i * 9); b.rotation.y = Math.PI / 2 + i * 0.3; an.add(b); boats.push(b); }
    c.anim(t => boats.forEach((b, i) => { b.position.y = -0.7 + Math.sin(t * 1.3 + i) * 0.07; }));
    for (let i = 0; i < 4; i++) c.npc(c.sc - 6 + i * 4, X(5 + (i % 3)), 0.1 - (i % 3) * 0.35, '');
    c.sign(SIGHT_NAME.ghat, c.sc - 12, X(2.2), 2.4);
  },
  // ---------- দুর্গাপুজো: a pandal and a lights gate over the road ----------
  festival(c) {
    const { side } = c, tr = c.track, s = c.sc, H = c.H(s), an = c.anchor(s), X = k => side * (H + k);
    const cloth = mat(0xd62828), gold = mat(0xffcc33), cream = mat(0xfff1d6);
    mesh(boxG(10, 9, 16), cloth, X(22), 4.5, 0, an);                                        // pandal
    for (let i = 0; i < 3; i++) mesh(boxG(1, 8 - i * 2, 14 - i * 4), i % 2 ? gold : cream, X(16.6 - i * 0.3), 4 - i, 0, an); // layered facade
    mesh(halfDome(5, 16, 8), gold, X(22), 9, 0, an);
    mesh(boxG(0.3, 3.4, 5), glow(0xffe0a0), X(16), 2.2, 0, an);                             // the lit idol inside
    const bulbs = [];
    const bulb = (p, parent = an) => { const b = mesh(new THREE.SphereGeometry(0.16, 6, 4), glow(0xffe14a), p.x, p.y, p.z, parent); bulbs.push(b); };
    for (let i = 0; i < 40; i++) { const a = i / 39 * Math.PI; bulb(new THREE.Vector3(X(16), 4 + Math.sin(a) * 4.5, Math.cos(a) * 7)); }
    for (let i = 0; i < 30; i++) bulb(new THREE.Vector3(X(16.2), 0.6 + (i % 2) * 0.1, -8 + i * 0.55));
    // the lights gate over the road
    for (const lat of [-1, 1]) { const p = mesh(boxG(0.5, 7, 0.5), gold); tr.place(p, s - 18, lat * (H + 0.6), 3.5); c.g.add(p); }
    for (let i = 0; i <= 24; i++) { const u = i / 24, lat = (u * 2 - 1) * (H + 0.6); const p = tr.pos(s - 18, lat, 7 + Math.sin(u * Math.PI) * 1.4, V()); const b = mesh(new THREE.SphereGeometry(0.2, 6, 4), glow(0xffe14a), p.x, p.y, p.z, c.g); bulbs.push(b); }
    const banner = c.plane(9, 1.4, c.basicSign(SIGHT_NAME.festival, '#7a1f00', '#ffe14a'), c.g); tr.place(banner, s - 18, 0, 6.2); banner.rotation.y += Math.PI;
    const cols = [0xffe14a, 0xff4d4d, 0x4dd2ff, 0x7dff8a, 0xff7ae0];
    let next = 0;
    c.anim(t => {
      const k = Math.floor(t * 4);
      bulbs.forEach((b, i) => b.material.color.setHex(cols[(i + k) % cols.length]));
      if (t > next) { next = t + 3 + Math.random() * 3; c.sound('dhak', s); }
    });
  },

  // ===== "along" sights: built for every chunk [a, b] of the segment =====
  // হাওড়া ব্রিজ: a steel cantilever truss over the road — towers near both ends, the top chord dips in the middle
  howrah(c) {
    const tr = c.track, { a, b } = c, S0 = c.seg.s0, L = c.seg.len, steel = new THREE.MeshLambertMaterial({ color: 0x75808a });
    const topY = s => { const u = (s - S0) / L; if (u < 0.18) return 6 + 22 * u / 0.18; if (u > 0.82) return 6 + 22 * (1 - u) / 0.18; const d = Math.abs(u - 0.5) / 0.32; return 15 + 13 * d * d; };
    const H = s => c.H(s) + 0.5;
    for (let s = Math.ceil(a / 4) * 4; s < b; s += 4) {
      for (const sd of [-1, 1]) {
        const p0 = tr.pos(s, sd * H(s), 0.4, V()), p1 = tr.pos(s, sd * H(s), topY(s), V());
        const q0 = tr.pos(s + 4, sd * H(s + 4), 0.4, V()), q1 = tr.pos(s + 4, sd * H(s + 4), topY(s + 4), V());
        beam(c.g, p0, p1, 0.35, steel); beam(c.g, p1, q1, 0.55, steel); beam(c.g, p0, q0, 0.55, steel);
        beam(c.g, (s / 4) % 2 ? p0 : p1, (s / 4) % 2 ? q1 : q0, 0.22, steel);              // diagonals
      }
      if ((s / 4) % 2 === 0 && topY(s) > 8) beam(c.g, tr.pos(s, -H(s), topY(s) - 0.3, V()), tr.pos(s, H(s), topY(s) - 0.3, V()), 0.35, steel); // overhead cross beams
    }
    for (const u of [0.18, 0.82]) { const s = S0 + u * L; if (s < a || s >= b) continue;  // the two great towers
      for (const sd of [-1, 1]) beam(c.g, tr.pos(s, sd * (H(s) + 0.4), -6, V()), tr.pos(s, sd * (H(s) + 0.4), 32, V()), 1.6, steel);
      beam(c.g, tr.pos(s, -H(s) - 0.4, 30, V()), tr.pos(s, H(s) + 0.4, 30, V()), 1.2, steel);
    }
    if (S0 - 8 >= a && S0 - 8 < b) c.sign(SIGHT_NAME.howrah, S0 - 8, -(c.H(S0) + 2.2), 2.6);
  },
  // বিদ্যাসাগর সেতু: two tall pylons with fanned cables
  setu(c) {
    const tr = c.track, { a, b } = c, S0 = c.seg.s0, L = c.seg.len, py = mat(0xd9d9d9), cab = mat(0xf2c84b);
    for (const u of [0.3, 0.7]) {
      const sp = S0 + u * L, H = c.H(sp) + 0.8;
      if (sp >= a && sp < b) {
        for (const sd of [-1, 1]) beam(c.g, tr.pos(sp, sd * H, -8, V()), tr.pos(sp, sd * H * 0.4, 36, V()), 1.4, py);
        for (const y of [12, 30]) beam(c.g, tr.pos(sp, -H * (1 - y / 60), y, V()), tr.pos(sp, H * (1 - y / 60), y, V()), 1, py);
      }
      for (let k = 1; k <= 9; k++) for (const dir of [-1, 1]) {
        const ds = sp + dir * k * 6; if (ds < a || ds >= b) continue;
        for (const sd of [-1, 1]) beam(c.g, tr.pos(sp, sd * H * 0.45, 34 - k * 1.2, V()), tr.pos(ds, sd * (c.H(ds) + 0.6), 0.6, V()), 0.08, cab);
      }
    }
    if (S0 - 8 >= a && S0 - 8 < b) c.sign(SIGHT_NAME.setu, S0 - 8, -(c.H(S0) + 2.2), 2.6);
  },
  // রেললাইন beside the road (the train itself is driven by World)
  rail(c) {
    const { a, b, side } = c, tr = c.track, lat = s => side * (c.H(s) + 10);
    c.ribbon(a, b, s => lat(s) - 2.4, s => lat(s) + 2.4, 0.08, mat(0x7a756c));                // ballast
    for (const off of [-0.75, 0.75]) c.ribbon(a, b, s => lat(s) + off - 0.06, s => lat(s) + off + 0.06, 0.32, mat(0x9aa0a6));
    for (let s = Math.ceil(a); s < b; s += 1.2) { const sl = mesh(boxG(2.4, 0.12, 0.3), mat(0x5a4636)); tr.place(sl, s, lat(s), 0.2); c.g.add(sl); }
    for (let s = Math.ceil(a / 22) * 22; s < b; s += 22) {                                  // catenary poles
      const p = mesh(boxG(0.3, 7, 0.3), mat(0x6e6e6e)); tr.place(p, s, lat(s) + side * 2.6, 3.5); c.g.add(p);
      const arm = mesh(boxG(3, 0.15, 0.15), mat(0x6e6e6e)); tr.place(arm, s, lat(s) + side * 1.2, 6.6); c.g.add(arm);
    }
    for (let s = Math.ceil(a / 3) * 3; s < b; s += 3) { const f = mesh(boxG(0.1, 1.2, 0.1), mat(0x555555)); tr.place(f, s, side * (c.H(s) + 5), 0.6); c.g.add(f); } // fence
    c.ribbon(a, b, s => side * (c.H(s) + 5) - 0.03, s => side * (c.H(s) + 5) + 0.03, 1.05, mat(0x555555));
    if (c.seg.s0 + 6 >= a && c.seg.s0 + 6 < b) c.sign(SIGHT_NAME.rail, c.seg.s0 + 6, side * (c.H(c.seg.s0) + 4), 2.2);
  },
  // ট্রাম লাইন: rails in the left lane and the overhead wire
  tram(c) {
    const { a, b } = c, tr = c.track, lane = s => c.H(s) * 0.45;
    for (const off of [-0.72, 0.72]) c.ribbon(a, b, s => lane(s) + off - 0.05, s => lane(s) + off + 0.05, 0.02, mat(0x3a3a3a));
    for (let s = Math.ceil(a / 24) * 24; s < b; s += 24) {
      const p = mesh(boxG(0.25, 7, 0.25), mat(0x4a5a4a)); tr.place(p, s, c.H(s) + 0.7, 3.5); c.g.add(p);
      beam(c.g, tr.pos(s, c.H(s) + 0.7, 6.8, V()), tr.pos(s, lane(s), 6.8, V()), 0.12, mat(0x4a5a4a));
    }
    c.ribbon(a, b, s => lane(s) - 0.03, s => lane(s) + 0.03, 6.75, mat(0x222222));
    if (c.seg.s0 + 4 >= a && c.seg.s0 + 4 < b) c.sign(SIGHT_NAME.tram, c.seg.s0 + 4, c.H(c.seg.s0) + 2.2, 2.4);
  },
};

// A local train running beside the road on the rail-line segments (one train, owned by World, not by a chunk).
export class Train {
  constructor(scene, track, seg, side) {
    this.track = track; this.seg = seg; this.side = side; this.s = seg.s0 - 80; this.wait = 0;
    this.g = new THREE.Group(); scene.add(this.g); this.cars = [];
    for (let i = 0; i < 6; i++) {                                                           // green-and-yellow local EMU
      const car = new THREE.Group(); this.g.add(car);
      mesh(boxG(2.6, 2.6, 11), mat(0x2e7d32), 0, 2, 0, car);
      mesh(boxG(2.65, 0.6, 11), mat(0xf2c200), 0, 1.0, 0, car);
      for (let z = -4.5; z <= 4.5; z += 1.5) mesh(boxG(2.7, 0.7, 0.9), mat(0x2a3440), 0, 2.4, z, car);
      mesh(boxG(2.4, 0.2, 11), mat(0x8a8a8a), 0, 3.35, 0, car);
      this.cars.push(car);
    }
    this.scene = scene;
  }
  update(dt, playerS, sound) {
    const { seg } = this, end = seg.s0 + seg.len + 80;
    if (this.wait > 0) { this.wait -= dt; this.g.visible = false; return; }
    this.g.visible = true;
    if (this.s < seg.s0 - 70 && playerS > seg.s0 - 40) sound('horn2', playerS);               // horn as it comes in
    this.s += dt * 17;
    if (this.s > end) { this.s = Math.max(seg.s0 - 80, playerS - 60); this.wait = 6 + Math.random() * 6; }
    this.cars.forEach((car, i) => {
      const s = this.s - i * 11.6, lat = this.side * (this.track.half(s) + 10);
      this.track.place(car, s, lat, 0.25); car.visible = s > seg.s0 - 20 && s < seg.s0 + seg.len + 20;
    });
    if (Math.abs(this.s - playerS) < 30 && Math.random() < dt * 3) sound('clack', playerS);
  }
  destroy() { this.scene.remove(this.g); }
}
