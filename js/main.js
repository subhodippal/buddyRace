// Buddy Race 3D — game logic. Everything runs in track space (s along the road, x sideways, y up);
// Track.pos() converts to world space for rendering.
import * as THREE from 'three';
import { Track } from './track.js';
import { World } from './world.js';
import { LEVELS } from './levels.js';
import * as M from './models.js';
import { initAudio, sfx, say as tts, setVoice, pauseAudio, resumeAudio, setMuted, isMuted, startMusic as startMusicA, stopMusic as stopMusicA, setMusicFast, startRain, stopRain } from './audio.js';
import { Sky } from './sky.js';
import { playSlides, closeStory } from './intro.js';
import { STORIES, line, introSlides, endingSlides, storyForLevel, FRIENDS, levelScript, levelLine, resetLines, isLevelLine } from './stories.js';
import { VOICE_RATE, SUPER_RATE } from './voicekey.js';
import { applyMenu, menuText, TEXTS, split } from './texts.js';
import { initInput, held, pollGamepad, openControls, closeControls, isPanelOpen, touchEnabled, bindingLabel, isTouchDevice as isTouch, setting, setSetting, steerAxis, startGyro, calibrateGyro, recenterGyro } from './input.js';
import { net, hostRoom, joinRoom, findMatch, lanAvailable, lanRooms, lanHost, send, sendTo, broadcast, leave } from './net.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = v => Math.round(v * 100) / 100;
const bnNum = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const escapeHTML = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------- tuning ----------------
const BASE_SPEED = 11, SPRINT_SPEED = 15.5, PANIC_BONUS = 3.5, DOG_MAX_SPEED = 17.5;
const SPRINT_TIME = 4, REGEN_TIME = 15; // full sprint lasts 4 s; an empty bar refills in 15 s (same for everyone)
const STEER_SPEED = 7.5, JUMP_V = 9.2, GRAVITY = 25;
const DMG = { slap: 7, kick: 10, stick: 15, stone: 9, bite: 8 };
const POW = { slap: 'চটাস!', kick: 'ধিসুম!', stick: 'দুম!', stone: 'ঠকাস!', bite: 'ঘ্যাঁক!' };
const ATK = ['slap', 'kick', 'stick', 'throw'];
const BRAWL_POWS = ['ধিসুম!', 'ঢিসুম!', 'চটাস!', 'দুম!', 'ধপাস!', 'ঠাস!', 'ধাঁই!'];

const CHARS = [
  { name: FRIENDS[0], en: 'Poltu', color: '#ff5533', shirt: 0xff5533, pants: 0x2d3f73, skin: 0xc68642 },
  { name: FRIENDS[1], en: 'Gopal', color: '#2e86de', shirt: 0x2e86de, lungi: 0x3c8d5a, skin: 0xa8703f },
  { name: FRIENDS[2], en: 'Kelo', color: '#27ae60', shirt: 0x27ae60, pants: 0x6b4f2a, skin: 0xd19a66, glasses: true },
  { name: FRIENDS[3], en: 'Lombu', color: '#e1b000', shirt: 0xf1c40f, pants: 0x333333, skin: 0xb87a4b, hair: 0x2b1a10 },
  // seats 5–8, only used in a friends' room (bigger groups)
  { name: 'বিল্টু', en: 'Biltu', color: '#9b59b6', shirt: 0x9b59b6, pants: 0x2c2c54, skin: 0xc68642 },
  { name: 'হাবুল', en: 'Habul', color: '#e67e22', shirt: 0xe67e22, lungi: 0x6d4c41, skin: 0xa8703f },
  { name: 'ঝন্টু', en: 'Jhontu', color: '#16a085', shirt: 0x1abc9c, pants: 0x444444, skin: 0xd19a66, hair: 0x2b1a10 },
  { name: 'পটলা', en: 'Potla', color: '#e84393', shirt: 0xe84393, pants: 0x2d3f73, skin: 0xb87a4b, glasses: true },
];
const SEATS = 4;      // single player and online matches: four runners, computer fills empty seats
const ROOM_MAX = 8;   // friends' room / Wi-Fi room: 2–8 real players, no computer runners
const ROOM_MIN = 2;
const BASE_NAMES = LEVELS.map(L => L.bn);
function levelTitles() { // level names come from the comment file in use → prequal → lN.title
  LEVELS.forEach((L, i) => { const t = (levelScript(i + 1, setting('slang')) || {}).title; L.bn = typeof t === 'string' && t.trim() ? t.trim() : BASE_NAMES[i]; });
}

// ---------------- renderer / scene ----------------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.6 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const SKY = 0xa8dcff;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 60, 175);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
const hemi = new THREE.HemisphereLight(0xffffff, 0x9a8a6a, 2.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0cc, 1.8);
sun.position.set(-20, 40, -10); scene.add(sun);
const sky = new Sky(scene, hemi, sun);
let weather = { evening: false, rainy: false };
// music + rain sound go together (both stop on pause / at the finish)
function startMusic(kind) { startMusicA(kind); if (weather.rainy && kind !== 'action') startRain(); }
function stopMusic() { stopMusicA(); stopRain(); }

let portrait = false, baseFov = 60;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; portrait = w < h; baseFov = portrait ? 80 : (h < 540 ? 62 : 58); // portrait: wider view so the road still fits
  camera.updateProjectionMatrix();
  document.body.classList.toggle('portrait', portrait);
  document.body.classList.toggle('touchdev', !!isTouch);
}
let lastPortrait = portrait;
addEventListener('resize', () => {
  resize();
  if (portrait !== lastPortrait) { lastPortrait = portrait; recenterGyro(); } // phone turned: the gyro's "straight" changes
});
resize();
// phones: go fullscreen on the first tap (Android). Portrait and landscape both work, so the orientation is not locked.
async function goFullscreen() {
  if (!isTouch) return;
  try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { /* not allowed */ }
}
for (const id of ['btnPlay', 'btnMP']) $(id).addEventListener('click', () => { goFullscreen(); startGyro(); });

// ---------------- game state ----------------
let levelIdx = 0, level = LEVELS[0], track = null, world = null;
let state = 'title'; // title | levels | lobby | story | countdown | playing | ending | results
let menuOpen = false, goReceived = false;
const runners = [];      // the runners in this race (index = slot)
const ALL_RUNNERS = []; // every runner model (8); runners is the first N of these
let player = null;
let obstacles = [], pickups = [], projectiles = [], dogs = [];
const obById = new Map(), pkById = new Map(), dogById = new Map();
let time = 0, raceTime = 0, camMode = 0, shake = 0, nextId = 1;
let nextSpawnS = 0, nextPickupS = 0, dogEvents = [], dogTime = 0, brawlEvents = [], brawl = null;
let finishOrder = [], endTimer = -1, bystanderT = 0;
let story = STORIES[0], cast = { culprit: 1, victim: 0 };
let superM = null;
const superObj = { x: 0, y: 0, z: 0 };
const brawlCloud = makeBrawlCloud();

const L = cat => line(cat, setting('slang'), story, level.id, track && player ? clamp(player.z / track.finish, 0, 1) : 0);
// obstacles that talk (only lines from the comment files): stall carts = shopkeepers, walkers, vehicle drivers.
// Animals, bells and horns make their sound but show no text.
const isVehicle = o => o.vehicle || ['rickshaw', 'cycle', 'auto', 'toto', 'bike', 'taxi', 'tram', 'handrick'].includes(o.kind);
const wordOf = o => (o.kind === 'thela' ? L('shopkeeper') : o.kind === 'walker' ? L('walker') : isVehicle(o) ? L('driver') : '');
const humans = () => runners.filter(r => r.human);

// ---------------- network event outbox (host → clients) ----------------
const OUT = [];
const emit = ev => { if (net.active && net.host) OUT.push(ev); };
function refOf(o) {
  if (o.isRunner) return ['r', o.idx];
  if (o === superObj) return ['s', 0];
  if (o.isDog) return ['d', o.id];
  if (o.id) return ['o', o.id];
  return null;
}
function resolveRef(k, i) { return k === 'r' ? runners[i] : k === 's' ? superObj : k === 'd' ? dogById.get(i) : obById.get(i); }

// ---------------- labels (DOM overlays) ----------------
const labelsEl = $('labels');
const bubbles = [], pows = [];
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
function screenPos(lat, y, s) {
  track.pos(s, lat, y, tmpV).project(camera);
  if (tmpV.z > 1 || tmpV.z < -1 || Math.abs(tmpV.x) > 1.3) return null;
  return [(tmpV.x + 1) / 2 * innerWidth, (1 - tmpV.y) / 2 * innerHeight];
}
const feedEl = $('feed'), feed = [];
function speakerOf(obj) {
  if (obj.isRunner) return { name: obj.label, color: obj.def.color };
  if (obj === superObj) return { name: 'সুপার স্যার', color: '#444' };
  return null;
}
function feedAdd(who, text) { // a small running chat log, so every line can be read even in a crowd
  const el = document.createElement('div');
  el.innerHTML = `<b style="color:${who.color}">${escapeHTML(who.name)}</b> ${escapeHTML(text)}`;
  feedEl.appendChild(el); feed.push({ el, life: 4.5 });
  while (feed.length > 4) feed.shift().el.remove();
}
// who gets a voice, and how they sound. Every clip is an angry voice with its own tune per group (see
// tools/make-voices.mjs): friend, bystander, shopkeeper, driver, super, female. pitch = a small playback-rate
// change on top, so two people of the same group still sound a little different.
function voiceOf(obj) {
  if (obj.isRunner) return { voice: 'friend', pitch: VOICE_RATE[obj.idx % VOICE_RATE.length], pri: obj === player ? 1 : 0 };
  if (obj === superObj) return { voice: 'super', pitch: SUPER_RATE, pri: 1 };
  // people on the road (pri: their lines are never dropped from the voice queue, so friends can't drown them out)
  if (world && world.npcs.has(obj)) return { voice: obj.female ? 'female' : obj.role === 'shop' ? 'shopkeeper' : 'bystander', pitch: obj.vPitch ??= rand(0.95, 1.05), pri: 1 };
  if (obj.kind === 'thela') return { voice: 'shopkeeper', pitch: 0.97, pri: 1 };
  if (obj.kind === 'walker') return { voice: 'bystander', pitch: 1.02, pri: 1 };
  if (isVehicle(obj)) return { voice: 'driver', pitch: obj.vPitch ??= rand(0.95, 1.05), pri: 1 };
  return null;
}
function voice(obj, text) {
  if (!setting('voice') || !(state === 'playing' || state === 'countdown')) return;
  let v = voiceOf(obj); if (!v) return;
  if (isLevelLine(text)) v = { ...v, pri: 1 };
  if (obj !== player && Math.abs((obj.z || 0) - player.z) > 18) return; // only what you can hear
  tts(text, v);
}
const saidAt = new Map(); // text → time it was last said
let lastLineAt = 0;       // when anyone last said anything (the chatter keeps silences under 3 s)
function bubble(obj, text, life = 2.2, yOff = 2.8, silent = false) {
  if (!obj || !text || menuOpen) return; // nothing new is said while paused
  const now = performance.now();
  if (now - (saidAt.get(text) || -1e9) < 4000) return; // the same line again within 4 s: stay quiet
  saidAt.set(text, now); lastLineAt = now;
  if (!silent) voice(obj, text);
  const who = speakerOf(obj);
  if (brawl && obj.isRunner && obj.inBrawl) { if (bubbles.length >= 3 && obj !== player) return; yOff = 4.4; } // float above the dust cloud
  if (obj._bub) { obj._bub.txt.textContent = text; obj._bub.life = life; obj._bub.w = 0; return; }
  if (bubbles.length >= 4 && obj !== player) return; // the feed has every line; keep the screen readable
  const el = document.createElement('div'); el.className = 'bubble';
  if (who) { el.innerHTML = '<i></i><span></span>'; el.firstChild.textContent = who.name; el.firstChild.style.color = who.color; el.style.borderColor = who.color; }
  else el.innerHTML = '<span></span>';
  el.lastChild.textContent = text;
  labelsEl.appendChild(el);
  const b = { el, txt: el.lastChild, obj, yOff, life, w: 0, h: 0 }; obj._bub = b; bubbles.push(b);
}
function talk(obj, cat, life = 1.5, yOff) { // a line from a category; clients pick their own text (their foul setting)
  bubble(obj, L(cat), life, yOff, cat === 'fall' && obj !== player); // you only hear your own fall cries
  const ref = refOf(obj); if (ref) emit({ e: 'tk', k: ref[0], i: ref[1], c: cat, l: life, y: yOff });
}
let othersLeft = 3, othersNextT = 10, crawlHinted = false;
function otherCanTalk() { return othersLeft > 0 && raceTime >= othersNextT; }
function otherTalked() { othersLeft--; othersNextT = raceTime + rand(3, 6); }
// Chatter: never more than ~3 s without a line. Each machine picks someone near its own player — a friend, a bystander,
// a shopkeeper, a driver or a walker — and they shout (only on this screen, so nothing extra goes over the network).
const SILENCE_MAX = 3000;
function updateChatter() {
  if (state !== 'playing' || menuOpen || !player) return;
  const quiet = performance.now() - lastLineAt >= SILENCE_MAX, outsiderTurn = setting('bystanders') && otherCanTalk();
  if (!quiet && !outsiderTurn) return;
  const near = (o, d = 16) => o && Math.abs(o.z - player.z) < d;
  const friends = [], others = [];
  for (const r of runners) if (r !== player && !r.gone && near(r)) friends.push(() => bubble(r, L(r.inBrawl ? 'brawl' : 'chase'), 1.2));
  if (setting('bystanders')) {
    for (const n of world.npcs) if (near(n)) others.push(() => bubble(n, L(n.role === 'shop' ? 'shopkeeper' : n.female ? 'bystanderF' : 'bystander'), 1.8, 2.5));
    for (const o of obstacles) if (o.root && near(o) && (o.kind === 'thela' || o.kind === 'walker' || isVehicle(o))) others.push(() => bubble(o, wordOf(o), 1.3, o.vehicle ? 2.9 : 2));
  }
  const shuffle = a => a.sort(() => Math.random() - 0.5);
  if (outsiderTurn && others.length) { // people on the road get their own turn every 3–6 s
    const before = lastLineAt;
    for (const f of shuffle(others).slice(0, 4)) { f(); if (lastLineAt !== before) { otherTalked(); return; } }
  }
  if (!quiet) return;
  // outsiders get every other turn when there are any around; friends otherwise
  const order = Math.random() < 0.5 ? [...shuffle(others), ...shuffle(friends)] : [...shuffle(friends), ...shuffle(others)];
  const before = lastLineAt;
  for (const f of order.slice(0, 6)) { f(); if (lastLineAt !== before) return; }
  if (!player.caught) bubble(player, L(player.inBrawl ? 'brawl' : 'chase'), 1.2); // nobody near: you shout yourself
  if (lastLineAt === before) lastLineAt = performance.now() - SILENCE_MAX + 800; // everything is used up: try again soon
}
function otherSay(o, text, life, yOff) { // text can be a function, so a line is only used up when it is really said
  if (!otherCanTalk()) return; const t = typeof text === 'function' ? text() : text; if (!t) return; otherTalked(); say(o, t, life, yOff);
}
function say(obj, text, life = 1.5, yOff) {
  bubble(obj, text, life, yOff);
  const ref = refOf(obj); if (ref) emit({ e: 'tx', k: ref[0], i: ref[1], x: text, l: life, y: yOff });
}
function powLocal(x, y, z, text) {
  const el = document.createElement('div'); el.className = 'pow'; el.textContent = text;
  labelsEl.appendChild(el); pows.push({ el, x, y, z, life: 0.8 });
}
function pow(x, y, z, text) { powLocal(x, y, z, text); emit({ e: 'pw', x: r2(x), y: r2(y), z: r2(z), t: text }); }
function place(el, p) {
  if (!p) { el.style.display = 'none'; return; }
  el.style.display = ''; el.style.left = p[0] + 'px'; el.style.top = p[1] + 'px';
}
const placed = [];
function updateLabels(dt) {
  const camS = player.z, W = innerWidth;
  const inRace = state === 'countdown' || state === 'playing';
  const tagTop = new Map();
  for (const r of runners) { // small name + health tags
    const show = inRace && !r.gone && Math.abs(r.z - camS) < 45 && !(brawl && r.inBrawl && r !== player);
    const p = show ? screenPos(r.x, r.y + 2.45 - r.fall * 1.8 - (r.caught ? 0.4 : 0), r.z) : null;
    place(r.tag, p);
    if (p) { r.hpEl.style.width = Math.max(0, r.hp) + '%'; tagTop.set(r, p[1] - 17); }
  }
  // speech bubbles: anchored above the name tag, kept on screen and pushed apart so they never overlap
  placed.length = 0;
  const order = bubbles.slice().sort((a, b) => (b.obj === player) - (a.obj === player));
  for (const b of order) {
    b.life -= dt;
    if (b.life <= 0 || b.obj.dead) continue;
    let p = Math.abs(b.obj.z - camS) > 60 ? null : screenPos(b.obj.x, (b.obj.y || 0) + b.yOff, b.obj.z);
    if (p && tagTop.has(b.obj)) p = [p[0], tagTop.get(b.obj)];
    if (!p) { b.el.style.display = 'none'; continue; }
    b.el.style.display = '';
    if (!b.w) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; }
    let x = clamp(p[0], b.w / 2 + 6, W - b.w / 2 - 6), y = Math.max(p[1], b.h + 4);
    for (let k = 0; k < 6; k++) { // move up past any bubble already placed here
      const hitR = placed.find(q => Math.abs(q.x - x) < (q.w + b.w) / 2 + 4 && y > q.y - q.h - 3 && y - b.h < q.y + 3);
      if (!hitR) break;
      y = hitR.y - hitR.h - 4;
    }
    if (y - b.h < 2) y = b.h + 2;
    placed.push({ x, y, w: b.w, h: b.h });
    b.el.style.left = x + 'px'; b.el.style.top = y + 'px';
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    if (b.life <= 0 || b.obj.dead) { b.el.remove(); b.obj._bub = null; bubbles.splice(i, 1); }
  }
  for (let i = pows.length - 1; i >= 0; i--) {
    const p = pows[i]; p.life -= dt;
    if (p.life <= 0) { p.el.remove(); pows.splice(i, 1); continue; }
    place(p.el, p.obj ? screenPos(p.obj.x, p.obj.y + 2.0, p.obj.z) : screenPos(p.x, p.y, p.z));
  }
  for (let i = feed.length - 1; i >= 0; i--) { const f = feed[i]; f.life -= dt; if (f.life <= 0) { f.el.remove(); feed.splice(i, 1); } else if (f.life < 0.6) f.el.style.opacity = f.life / 0.6; }
  feedEl.classList.toggle('brawl', !!(brawl && player.inBrawl));
}
function clearLabels() {
  for (const b of bubbles) { b.el.remove(); b.obj._bub = null; }
  for (const p of pows) p.el.remove();
  for (const f of feed) f.el.remove();
  bubbles.length = 0; pows.length = 0; feed.length = 0;
}

// ---------------- runners ----------------
class Runner {
  constructor(def, idx) {
    this.def = def; this.idx = idx; this.isRunner = true;
    this.m = M.makeBuddy(def); scene.add(this.m.root);
    this.tag = document.createElement('div'); this.tag.className = 'tagName';
    this.tag.innerHTML = `<span></span><i class="hp"><b></b></i>`;
    this.tag.style.background = def.color;
    this.nameEl = this.tag.firstChild; this.hpEl = this.tag.querySelector('b');
    labelsEl.appendChild(this.tag);
    this.human = idx === 0; this.remote = false; this.netName = '';
    this.reset();
  }
  get label() { return this === player ? 'তুমি' : (this.netName || this.def.name); }
  reset() {
    const startX = [-0.6, -2.8, 1.6, 3.8, -1.7, 0.5, 2.7, -3.9]; // seats 5–8 start a step behind
    this.x = startX[this.idx]; this.z = 0; this.startZ = this.idx >= SEATS ? -1.8 : 0; this.gone = false; this.y = 0; this.vy = 0; this.vx = 0; this.speed = 0;
    this.stun = 0; this.inv = 0; this.fall = 0; this.slow = 0; this.spin = 0; this.ko = 0; this.boostT = 0; this.bumpCd = 0;
    this.hp = 100; this.stick = false; this.stones = 0; this.kickDir = 1; this.attackT = 0; this.attackType = null; this.attackSide = 1;
    this.cd = 0; this.kickNext = false; this.phase = Math.random() * 6; this.stamina = 1;
    this.finished = false; this.caught = false; this.finishTime = 0; this.lineSlot = 0; this.talkT = rand(0.3, 1.2);
    this.inBrawl = false; this.brawlScore = 0; this.brawlSlot = 0; this.sprinting = false; this.tired = false; this.dustT = 0; this.sweatT = 0;
    this.ai = { tx: this.x, think: rand(0.5, 2), sprintT: 0, skill: rand(0.78, 0.92) + level.aiBoost * 0.03,
      aggro: rand(0.5, 1.0), lastObs: null, lastOk: true, dodge: false };
    this.nameEl.textContent = this.label;
    this.tag.classList.toggle('me', this === player);
  }
}
// race with the first n runners; the rest are hidden
function useRunners(n) {
  runners.length = 0;
  ALL_RUNNERS.forEach((r, i) => { const on = i < n; if (on) runners.push(r); r.gone = false; r.m.root.visible = on; r.tag.style.display = on ? '' : 'none'; });
}
function makeInput() { return { dirX: 0, bias: 0, jump: false, attack: false, sprint: false, duck: false }; }

// ---------------- input ----------------
const edge = { jump: false, attack: false };
const remoteIn = {}; // host only: slot → { l, r, s, jump, attack }
function onAction(a) {
  if (isPanelOpen()) { if (a === 'pause') closeControls(); return; }
  if (state === 'title') { if (a === 'jump' || a === 'attack') $('btnPlay').click(); return; }
  if (state === 'story' || state === 'ending') return;
  if (a === 'jump' || a === 'attack') {
    if (menuOpen) { if (a === 'jump') closeMenu(); return; }
    if (state === 'playing') { if (net.active && !net.host) send({ t: 'a', a }); else edge[a] = true; }
    else if (state === 'results' && !net.active) $('btnAgain').click();
    return;
  }
  if (a === 'cam') cycleCam();
  else if (a === 'pause') togglePause();
  else if (a === 'mute') toggleMute();
}
initInput(onAction);
addEventListener('blur', () => { if (state === 'playing' && !menuOpen && !net.active) togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing' && !menuOpen && !net.active) togglePause(); });
addEventListener('beforeunload', e => { if (state === 'playing' || net.active) { e.preventDefault(); e.returnValue = ''; } });
addEventListener('contextmenu', e => e.preventDefault());

function refreshTouch() {
  const inGame = state === 'countdown' || state === 'playing';
  $('touch').classList.toggle('hidden', !(touchEnabled() && inGame && !menuOpen));
}
$('btnCam').onclick = () => cycleCam();
$('btnMute').onclick = () => toggleMute();
$('btnPause').onclick = () => togglePause();
function toggleMute() { setMuted(!isMuted()); $('btnMute').textContent = isMuted() ? '🔇' : '🔊'; }

// ---------------- camera (2 modes: behind / top) ----------------
const CAMS = [
  { name: 'পিছন থেকে', off: [4.3, -7.6], look: [1.6, 7], follow: 0.7 },
  { name: 'উপর থেকে', off: [13, -9.5], look: [0, 9], follow: 0.4 },
];
const camLook = new THREE.Vector3(), camWant = new THREE.Vector3(), lookWant = new THREE.Vector3();
function cycleCam() { camMode = (camMode + 1) % CAMS.length; showBanner(CAMS[camMode].name, 'ক্যামেরা', 1.0, false); }
function updateCamera(dt, snap = false) {
  if (state === 'title' || state === 'levels' || state === 'lobby') { // slow orbit around the start line
    const c = track.pos(4, 0, 0, tmpV2), a = time * 0.22;
    camera.position.set(c.x + Math.sin(a) * 10, c.y + 4.5 + Math.sin(time * 0.4), c.z + Math.cos(a) * 10);
    camera.lookAt(c.x, c.y + 1.4, c.z);
    camera.fov = baseFov; camera.updateProjectionMatrix();
    return;
  }
  const c = CAMS[camMode], k = portrait ? 1.28 : 1, p = player;
  if (p.caught) { // watch the sit-up punishment from the superintendent's side
    const F = track.finish;
    track.pos(F + 19, 2.5, 4.2, camWant); track.pos(F + 8, 0, 1.2, lookWant);
  } else {
    let up = c.off[0] * k, back = c.off[1] * k, ahead = c.look[1];
    if (brawl && p.inBrawl) { up = Math.max(up, 7.5); back = Math.min(back, -9); ahead = 2; }
    const cs = p.z + back;
    const hFix = Math.max(0, track.h(p.z) - track.h(cs));
    track.pos(cs, p.x * c.follow, up + hFix, camWant);
    track.pos(p.z + ahead, p.x * c.follow, c.look[0], lookWant);
  }
  camera.position.lerp(camWant, snap ? 1 : 1 - Math.exp(-7 * dt));
  camLook.lerp(lookWant, snap ? 1 : 1 - Math.exp(-9 * dt));
  if (shake > 0) { camera.position.x += rand(-1, 1) * shake * 0.6; camera.position.y += rand(-1, 1) * shake * 0.6; shake -= dt; }
  camera.lookAt(camLook);
  const targetFov = baseFov + (p.speed > 13.5 ? 7 : 0) + (p.sprinting && dogTime > 0 ? 7 : 0);
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4);
  camera.updateProjectionMatrix();
}

// ---------------- HUD ----------------
let bannerT = 0;
function showBanner(text, sub = '', dur = 2, sync = true) {
  const b = $('banner'); b.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
  b.classList.add('show'); bannerT = dur;
  if (sync) emit({ e: 'bn', t: text, s: sub, d: dur });
}
const ORD = ['১ম', '২য়', '৩য়', '৪র্থ', '৫ম'];
const ordinal = n => ORD[n - 1] || bnNum(n);
function buildProgress() {
  $('progressTrack').innerHTML = runners.map(r => `<div class="dot${r === player ? ' me' : ''}" style="background:${r.def.color}"></div>`).join('');
}
function currentRank(r) {
  if (r.finished) return finishOrder.indexOf(r) + 1;
  return 1 + runners.filter(o => o !== r && (o.finished || o.z > r.z)).length;
}
function updateHUD(dt) {
  const rank = currentRank(player);
  $('rank').innerHTML = `${bnNum(rank)}<sup>${ordinal(rank).slice(1)}</sup>`;
  $('dist').textContent = `${bnNum(Math.max(0, Math.floor(Math.min(player.z, track.finish))))} / ${bnNum(Math.round(track.finish))} মি`;
  $('staminaFill').style.width = (player.stamina * 100).toFixed(0) + '%';
  $('stamina').classList.toggle('tired', player.tired || player.stamina < 0.2);
  $('stamina').classList.toggle('go', player.sprinting);
  $('hpFill').style.width = Math.max(0, player.hp) + '%';
  $('hpFill').style.background = player.hp > 50 ? '#2f9e44' : player.hp > 25 ? '#f7b733' : '#e03131';
  const dots = $('progressTrack').children;
  runners.forEach((r, i) => { if (dots[i]) dots[i].style.left = (clamp(r.z / track.finish, 0, 1) * 100) + '%'; });
  let it = (player.stick ? '🪵 লাঠি ' : '') + (player.stones ? `🪨×${player.stones} ` : '');
  if (it) it += `<small>${touchEnabled() ? '👊' : bindingLabel('attack')}</small>`;
  const itemEl = $('item'); if (itemEl.innerHTML !== it) itemEl.innerHTML = it;
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('show'); }
  const dogsBehind = dogTime > 0 && !brawl && dogs.some(d => d.target === player && d.z < player.z - 0.5 && player.z - d.z < 14);
  const panic = player.sprinting && dogTime > 0 && !player.inBrawl;
  $('dogWarn').classList.toggle('hidden', !dogsBehind);
  const dw = panic ? '💨 জান বাঁচা! 💨' : `🐕🐕 পিছনে কুকুর! <small>${touchEnabled() ? '🏃 চেপে ধরো' : bindingLabel('sprint') + ' চেপে ধরো'}!</small>`;
  if ($('dogWarn').dataset.t !== dw) { $('dogWarn').dataset.t = dw; $('dogWarn').innerHTML = dw; }
  const sf = $('speedFx');
  sf.classList.toggle('on', player.sprinting && !player.caught && state === 'playing');
  sf.classList.toggle('panic', panic);
  const bb = $('brawlBar');
  if (brawl && brawl.t > 0 && player.inBrawl) {
    bb.classList.remove('hidden');
    bb.innerHTML = `👊 মারপিট! <b>${bnNum(Math.ceil(brawl.t))}</b><small>${touchEnabled() ? 'মার বোতাম চাপো!' : bindingLabel('attack') + ' চাপো!'} · ${bnNum(player.brawlScore)} বার মেরেছ</small>`;
  } else bb.classList.add('hidden');
}

// ---------------- obstacles & pickups (created from params so clients can mirror them) ----------------
const VEH_SPEED = { rickshaw: 3.5, cycle: 5, toto: 4.5, auto: 7, bike: 8.5, thela: 2, tram: 3, handrick: 2.5 };
const OVERHEAD = { ladder: M.makeLadder, beam: M.makeBeam, tree: M.makeFallenTree }; // crawl under these
const MAKERS = { tram: M.makeTram, handrick: M.makeHandRickshaw, cowsit: M.makeCowSitting, goatsit: M.makeGoatSitting, ducks: M.makeDucks, cones: M.makeCones, rickshaw: M.makeRickshaw, cycle: M.makeCycle, auto: M.makeAuto, toto: M.makeToto, bike: M.makeBike, thela: M.makeThela,
  cow: M.makeCow, goat: M.makeGoat, pothole: M.makePothole, blocker: M.makeBlocker, banana: M.makeBanana, walker: M.makeWalker, hens: M.makeHens };
function createObstacle(p) {
  let o;
  if (p.kind === 'drain') o = M.makeDrain(p.half, p.plank);
  else if (p.kind === 'bumper') o = M.makeBumper(p.half);
  else if (OVERHEAD[p.kind]) o = OVERHEAD[p.kind](p.half);
  else o = MAKERS[p.kind]();
  Object.assign(o, { id: p.id, x: p.x, z: p.z, vz: p.vz || 0, vx: p.vx || 0, yaw: p.rot || 0, honkT: rand(0.5, 2), phase: Math.random() * 6 });
  if (o.kind in VEH_SPEED) o.vehicle = true;
  if ((o.kind === 'cow' || o.kind === 'goat') && Math.abs(Math.sin(o.yaw)) > 0.7) { const t = o.w; o.w = o.d; o.d = t; } // sideways = wider
  scene.add(o.root); obstacles.push(o); obById.set(o.id, o);
  placeObstacle(o);
  return o;
}
function placeObstacle(o) {
  let yaw = o.yaw;
  if (o.walker) yaw = o.vx > 0 ? Math.PI / 2 : -Math.PI / 2;
  track.place(o.root, o.z, o.full ? 0 : o.x, o.vehicle ? Math.abs(Math.sin(time * 9 + o.phase)) * 0.03 : 0, yaw);
}
function createPickup(p) {
  const k = p.item === 'stone' ? M.makeStonePickup() : p.item === 'stick' ? M.makeStickPickup() : M.makeSweetPickup();
  Object.assign(k, { id: p.id, item: p.item, x: p.x, z: p.z });
  track.place(k.root, k.z, k.x, 0); scene.add(k.root); pickups.push(k); pkById.set(k.id, k);
  return k;
}
function removePickup(k) { k.taken = true; scene.remove(k.root); pkById.delete(k.id); }

const ZONE_SPAWN = { // sitting animals, autos/totos and potholes kept rare; cycles stay common
  campus: [['pothole', 0.6], ['blocker', 3], ['goat', 1.2], ['cycle', 1.4], ['bumper', 1.5], ['walker', 1.8], ['banana', 0.68], ['ladder', 0.9], ['beam', 0.9]],
  city: [['cowsit', 0.15], ['handrick', 0.4], ['ladder', 0.9], ['tree', 0.4], ['pothole', 0.4], ['blocker', 1.5], ['cow', 0.6], ['goat', 0.4], ['rickshaw', 1.2], ['cycle', 1.6], ['auto', 0.5], ['toto', 0.5], ['bike', 1], ['banana', 0.99], ['walker', 1.8], ['bumper', 0.8], ['drain', 0.7]],
  market: [['cowsit', 0.3], ['handrick', 1.0], ['ladder', 0.8], ['beam', 0.6], ['walker', 3], ['thela', 2], ['banana', 1.57], ['cow', 0.5], ['cycle', 1.5], ['rickshaw', 1.2], ['toto', 0.4], ['pothole', 0.15]],
  village: [['ducks', 1.4], ['goatsit', 0.2], ['tree', 1.1], ['beam', 0.5], ['cow', 1], ['goat', 1], ['hens', 1.6], ['pothole', 0.4], ['drain', 1.2], ['cycle', 1.8], ['toto', 0.25], ['walker', 1], ['banana', 0.68]],
  river: [['tree', 0.6], ['bike', 1.5], ['auto', 0.6], ['cycle', 2], ['toto', 0.4], ['blocker', 1], ['walker', 1.2], ['pothole', 0.2], ['banana', 0.68]],
  highway: [['bike', 2], ['auto', 0.9], ['toto', 0.5], ['cycle', 1], ['blocker', 0.8], ['pothole', 0.1]],
  flyover: [['bike', 2], ['auto', 0.8], ['toto', 0.4], ['cycle', 0.8], ['blocker', 0.6]],
  underpass: [['bike', 1.6], ['auto', 0.6], ['cycle', 1.2], ['blocker', 0.6], ['banana', 0.3]],
  construction: [['cones', 2.5], ['blocker', 1.5], ['pothole', 0.5], ['walker', 1], ['ladder', 0.8], ['beam', 0.8]],
  bridge: [['bike', 1.5], ['auto', 0.4], ['cycle', 2], ['toto', 0.4], ['walker', 1.2], ['banana', 0.54]],
};
function weighted(list) {
  const w = ([k, v]) => (k in VEH_SPEED ? v * level.traffic : v);
  let r = Math.random() * list.reduce((a, e) => a + w(e), 0);
  for (const e of list) { r -= w(e); if (r <= 0) return e[0]; }
  return list[0][0];
}
function spawnObstacle(p) { p.id = nextId++; createObstacle(p); emit({ e: 'ob', ...p }); }
function spawnRow(s) {
  if (track.culverts.some(c => Math.abs(s - c) < 12)) return; // keep the little bridge (পুল) clear
  const seg = track.seg(s), zone = seg.zone, half = track.half(s), table = ZONE_SPAWN[seg.surface === 'construction' ? 'construction' : zone] || ZONE_SPAWN.city;
  if (seg.tram && Math.random() < 0.35) { // a tram comes along its rails in the left lane
    spawnObstacle({ kind: 'tram', x: r2(half * 0.45), z: r2(s + rand(-2, 2)), vz: r2(VEH_SPEED.tram * rand(0.9, 1.1)) });
    return;
  }
  const first = weighted(table);
  if (first === 'drain' || first === 'bumper' || OVERHEAD[first]) { // full-width hazards get the row to themselves
    spawnObstacle({ kind: first, x: 0, z: r2(s), half: r2(half), plank: r2(rand(-half + 1.5, half - 1.5)) });
    return;
  }
  const lanes = [-0.7, -0.24, 0.24, 0.7].map(f => f * half).sort(() => Math.random() - 0.5);
  const n = zone === 'campus' ? 1 : (Math.random() < 0.5 ? 2 : 1);
  for (let i = 0; i < n; i++) {
    let kind = i === 0 ? first : weighted(table);
    if (kind === 'drain' || kind === 'bumper' || OVERHEAD[kind]) kind = 'walker'; // second item in a row: never another pothole
    let x = lanes[i] + rand(-0.3, 0.3);
    const p = { kind, z: r2(s + rand(-2, 2)) };
    if (kind === 'tram') kind = 'auto'; // trams only on their rails
    if (kind in VEH_SPEED) { p.vz = r2(VEH_SPEED[kind] * rand(0.85, 1.15)); x = clamp(x, -half + 1.6, half - 1.6); }
    if (kind === 'blocker') x = clamp(x, -half + 1.3, half - 1.3);
    if (kind === 'walker') p.vx = r2(rand(1.2, 1.8) * (Math.random() < 0.5 ? 1 : -1));
    if (kind === 'hens' || kind === 'ducks') p.vx = r2(rand(2.2, 3.2) * (Math.random() < 0.5 ? 1 : -1));
    if (kind === 'cow' || kind === 'goat') p.rot = pick([Math.PI / 2, -Math.PI / 2, 0.4, -0.5, Math.PI]);
    p.x = r2(clamp(x, -half + 0.6, half - 0.6));
    spawnObstacle(p);
  }
}
function spawnAhead() {
  const ahead = Math.max(...humans().map(r => r.z)) + 130;
  while (nextSpawnS < Math.min(ahead, track.finish - 15)) {
    spawnRow(nextSpawnS);
    nextSpawnS += (track.zone(nextSpawnS) === 'campus' ? rand(17, 25) : rand(11, 17)) / Math.sqrt(level.traffic);
  }
  while (nextPickupS < Math.min(ahead, track.finish - 20)) {
    const r = Math.random(), half = track.half(nextPickupS);
    const p = { id: nextId++, item: r < 0.5 ? 'stone' : r < 0.8 ? 'stick' : 'sweet', x: r2(rand(-half + 1, half - 1)), z: r2(nextPickupS) };
    createPickup(p); emit({ e: 'pk', ...p });
    nextPickupS += rand(13, 22);
  }
}
function cleanup() {
  const minS = Math.min(...runners.map(r => r.z), player.z - 10) - 18;
  obstacles = obstacles.filter(o => {
    if (o.z + (o.d || 1) < minS) { if (o.root) scene.remove(o.root); o.dead = true; obById.delete(o.id); return false; }
    return true;
  });
  pickups = pickups.filter(p => { if (p.z < minS || p.taken) { if (!p.taken) removePickup(p); p.dead = true; return false; } return true; });
  dogs = dogs.filter(d => { if (d.z < minS - 30 && dogTime <= 0) { scene.remove(d.m.root); d.dead = true; dogById.delete(d.id); return false; } return true; });
}

// ---------------- sound (synced) ----------------
function play(name, z, who = -1) { // who = runner idx that "owns" the sound (only they hear it), -1 = anyone nearby
  if (who >= 0 ? who === player.idx : Math.abs(z - player.z) < 25) sfx[name] && sfx[name]();
  emit({ e: 'sx', n: name, z: r2(z), w: who });
}

// ---------------- combat ----------------
function autoPickup(r) {
  if (r.y > 1 || r.stun > 0) return;
  for (const p of pickups) {
    if (p.taken || Math.abs(p.x - r.x) > 1.0 || Math.abs(p.z - r.z) > 1.2) continue;
    removePickup(p); emit({ e: 'pt', id: p.id });
    if (p.item === 'stone') { r.stones = Math.min(9, r.stones + 3); pow(p.x, 1, p.z, '+৩ 🪨'); }
    else if (p.item === 'stick') { r.stick = true; pow(p.x, 1, p.z, '🪵'); }
    else { r.hp = Math.min(100, r.hp + 30); pow(p.x, 1.2, p.z, '+৩০ ❤️ রসগোল্লা!'); }
    if (r.human) { play('pick', r.z, r.idx);  }
  }
}
function throwTarget(r) {
  let tgt = null, bd = 1e9;
  for (const o of runners) {
    if (o === r || o.finished) continue;
    const dz = o.z - r.z, dx = Math.abs(o.x - r.x);
    if (dz > 2 && dz < 32 && dx < dz * 0.6 + 2 && dz < bd) { bd = dz; tgt = o; }
  }
  return tgt;
}
// One button, the move that suits: stick if you have one, slap someone beside you,
// kick someone in front of / behind you, or throw a stone at someone further ahead.
function doAttack(r) {
  r.cd = r.inBrawl ? (r.human ? 0.16 : rand(0.45, 0.9)) : (r.human ? 0.28 : 0.5);
  const range = r.stick ? 2.8 : 2.2;
  let best = null, bd = 1e9;
  for (const o of runners) {
    if (o === r || o.finished) continue;
    const dx = Math.abs(o.x - r.x), dz = Math.abs(o.z - r.z);
    if (dx > range || dz > range) continue;
    const score = dx + dz + (o.inv > 0 ? 5 : 0) + (r.inBrawl ? Math.random() * 2 : 0);
    if (score < bd) { bd = score; best = o; }
  }
  r.attackT = 0.32;
  if (best) {
    const dx = best.x - r.x, dz = best.z - r.z;
    r.attackType = r.stick ? 'stick' : (Math.abs(dz) > Math.abs(dx) * 0.8 ? 'kick' : 'slap');
    if (r.inBrawl && !r.stick && Math.random() < 0.5) r.attackType = r.kickNext ? 'kick' : 'slap';
    r.kickNext = !r.kickNext;
    r.attackSide = Math.sign(dx) || 1; r.kickDir = dz >= 0 ? 1 : -1;
    hit(best, r, r.attackType);
    if (Math.random() < (r.inBrawl ? 0.6 : 0.75)) talk(r, r.inBrawl ? 'brawl' : 'chase', 0.9); // a taunt with almost every hit
  } else {
    const tgt = r.stones > 0 && !r.inBrawl ? throwTarget(r) : null;
    if (tgt || (r.stones > 0 && r.human && !r.inBrawl)) { throwStone(r, tgt); return; }
    r.attackType = r.stick ? 'stick' : (r.kickNext ? 'kick' : 'slap');
    r.kickNext = !r.kickNext; r.attackSide = 1; r.kickDir = 1;
    if (r.human) play('throw', r.z, r.idx);
  }
  if (r === player && Math.random() < 0.15) say(r, L('chase'), 1.2);
}
function damage(t, amount) {
  t.hp -= amount;
  if (t.hp <= 0) { // knocked out
    t.hp = 60; t.stun = 3; t.inv = 4.5; t.ko = 3;
    pow(t.x, t.y + 2.2, t.z, 'অজ্ঞান! 💫'); talk(t, 'fall', 2);
  }
}
function hit(t, by, type) {
  if (t.inv > 0 || t.caught) return;
  const brawling = t.inBrawl && brawl;
  t.stun = brawling ? 0.3 : ({ stick: 1.4, kick: 1.1, slap: 0.85, stone: 1.0, bite: 0.7 }[type] || 1);
  t.inv = brawling ? 0.12 : t.stun + 0.7;
  if (!brawling) { t.speed *= 0.25; if (by) t.vx = (t.x >= by.x ? 1 : -1) * 6; }
  if (by && brawling) by.brawlScore++;
  pow(t.x, t.y + 1.8, t.z, brawling ? pick(BRAWL_POWS) : POW[type]);
  if (Math.random() < (brawling ? 0.08 : t === player ? 0.6 : 0.4)) talk(t, 'fall', 1.2);
  play(type === 'kick' ? 'kick' : type === 'stick' ? 'stick' : type === 'stone' ? 'stone' : type === 'bite' ? 'bark' : 'slap', t.z);
  if (t === player) shake = brawling ? 0.12 : 0.35;
  if (t.human) play('hurt', t.z, t.idx);
  if (by === player) shake = Math.max(shake, 0.12);
  damage(t, (DMG[type] || 6) * (brawling ? 0.25 : 1));
}
function throwStone(r, tgt) {
  r.stones--; r.attackT = 0.3; r.attackType = 'throw';
  const sp = 30, p = { x: r2(r.x), y: 1.9, z: r2(r.z + 0.6), o: r.idx };
  if (tgt) {
    const tt = (tgt.z - p.z) / Math.max(1, sp - tgt.speed);
    const ax = tgt.x + tgt.vx * tt, az = tgt.z + tgt.speed * tt;
    const dx = ax - p.x, dz = az - p.z, len = Math.hypot(dx, dz) || 1;
    p.vx = r2(dx / len * sp); p.vz = r2(dz / len * sp); p.vy = 1.5;
  } else { p.vx = 0; p.vz = sp; p.vy = 2; }
  p.vz = r2(p.vz + r.speed * 0.3);
  addProjectile(p); emit({ e: 'pr', ...p });
  play('throw', r.z);
}
function addProjectile(p) { const s = { m: M.makeStoneProjectile(), ...p, life: 1.6 }; scene.add(s.m); projectiles.push(s); }
function updateProjectiles(dt, authoritative) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const s = projectiles[i];
    s.life -= dt; s.vy -= 5 * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    track.pos(s.z, s.x, s.y, s.m.position); s.m.rotation.x += dt * 15;
    let done = s.life <= 0 || s.y < 0.05;
    if (authoritative) for (const r of runners) {
      if (done || r.idx === s.o || r.finished) continue;
      if (Math.abs(r.x - s.x) < 0.65 && Math.abs(r.z - s.z) < 0.9 && s.y > r.y + 0.2 && s.y < r.y + 2.5) { hit(r, runners[s.o], 'stone'); done = true; }
    }
    if (done) { scene.remove(s.m); projectiles.splice(i, 1); }
  }
}

// ---------------- obstacles ----------------
function hitObstacle(r, o) {
  const big = o.vehicle || o.kind === 'taxi';
  if (o.kind === 'bumper') {
    if (r.y < 0.1 && r.bumpCd <= 0) {
      r.vy = 4.3; r.bumpCd = 0.6; play('land', r.z);
      if (r.sprinting && Math.random() < 0.5) { r.stun = 0.4; pow(r.x, 1.4, r.z, 'উপস!'); }
    }
    return;
  }
  if (o.kind === 'drain') {
    if (Math.abs(r.x - o.plankX) < 0.6) return; // walking the plank
    r.stun = 1.6; r.speed = 0; r.inv = 2.4; r.z = o.z + o.d + 0.6;
    pow(r.x, 1, o.z, 'ছপাৎ!'); play('splash', r.z); talk(r, 'fall', 1.4);
    damage(r, 10);
  } else if (o.overhead) { // walked head-first into a ladder / beam / fallen tree
    r.stun = 1.2; r.speed = 0; r.inv = 2; r.z = Math.min(r.z, o.z - o.d - 0.5);
    pow(r.x, 1.9, r.z, 'ঠকাস! 🤕'); play('stick', r.z); talk(r, 'fall', 1.2);
    damage(r, 8);
  } else if (o.slip) {
    r.stun = 1.1; r.spin = 1; r.speed *= 0.3; r.inv = 1.8;
    pow(r.x, 1.4, r.z, 'পিছলে গেল!'); play('slip', r.z); talk(r, 'fall', 1.2);
    damage(r, 5);
  } else if (o.trip) {
    r.stun = 0.9; r.speed *= 0.3; r.inv = 1.6;
    pow(r.x, 0.8, r.z, 'ধপাস!'); play('land', r.z);
    talk(r, 'fall', 1.2); damage(r, 4);
  } else if (o.kind === 'hens' || o.kind === 'ducks') {
    r.stun = 0.5; r.speed *= 0.5; r.inv = 1.2; o.vx = -o.vx * 1.3;
    pow(r.x, 1.2, r.z, 'কঁক কঁক! 🪶'); play('hen', r.z); damage(r, 2);
  } else if (o.walker) {
    r.stun = 0.9; r.speed = 0; r.inv = 1.8; r.z = Math.min(r.z, o.z - 0.8);
    otherSay(o, () => wordOf(o), 1.3, 2.6); talk(r, 'fall', 1.2); pow(r.x, 1.6, r.z, 'ধাক্কা!'); play('kick', r.z); damage(r, 4);
  } else {
    r.stun = big ? 1.3 : 1.1; r.speed = 0; r.inv = r.stun + 0.9;
    r.z = Math.min(r.z, o.z - o.d - 0.45);
    if (big) { play('crash', r.z); talk(r, 'fall', 1.3); if (o.root) otherSay(o, () => wordOf(o), 1.2, 2.9); }
    else { if (o.sound) play(o.sound, r.z); otherSay(o, () => wordOf(o), 1.2, 2); play('kick', r.z); }
    pow(r.x, 1.6, r.z, big ? 'ধড়াম!' : 'ধপাস!');
    damage(r, big ? 14 : 6);
  }
  if (r === player) shake = 0.4;
}
function collideObstacles(r) {
  for (const o of obstacles) {
    if (Math.abs(r.z - o.z) > o.d + 0.32) continue;
    if (!o.full && Math.abs(r.x - o.x) > o.w + 0.3) continue;
    if (r.y > o.h) continue;
    if (o.overhead && r.duck) continue; // crawled under it
    if (r.inv > 0 && o.kind !== 'bumper') continue;
    hitObstacle(r, o);
    if (o.kind !== 'bumper') return;
  }
}
function updateObstacles(dt, authoritative) {
  for (const o of obstacles) {
    if (!o.root) continue; // parked taxis are static colliders only
    if (o.vehicle) o.z += o.vz * dt;
    if (o.walker) {
      o.x += o.vx * dt;
      const hw = track.half(o.z) + 1.5;
      if (Math.abs(o.x) > hw) { o.x = Math.sign(o.x) * hw; o.vx = -o.vx; }
      if (o.buddy) { const s = Math.sin(time * 9 + o.phase) * 0.7; o.buddy.legL.rotation.x = s; o.buddy.legR.rotation.x = -s; o.buddy.armL.rotation.x = -s * 0.6; o.buddy.armR.rotation.x = s * 0.6; }
      if (o.birds) o.birds.forEach((b, i) => { b.position.y = Math.abs(Math.sin(time * 14 + i)) * 0.15; });
    }
    if (o.overhead && state === 'playing' && o.z - player.z < 22 && o.z > player.z && !crawlHinted) { crawlHinted = true; showBanner('মাথা নিচু! ⬇️', touchEnabled() ? 'নিচে সোয়াইপ করে হামাগুড়ি দাও' : bindingLabel('duck') + ' চেপে হামাগুড়ি দাও', 2.2, false); }
    placeObstacle(o);
    if (o.head && !o.vehicle) o.head.rotation.y = Math.sin(time * 1.3 + o.phase) * 0.4;
    if (!authoritative) continue;
    o.honkT -= dt;
    if (o.honkT < 0 && (o.vehicle || o.sound)) {
      const animal = !o.vehicle && !o.walker || o.kind === 'hens' || o.kind === 'ducks';
      const near = humans().find(h => o.z - h.z > -6 && o.z - h.z < (animal ? 26 : 14) && Math.abs(o.x - h.x) < (animal ? 12 : 5));
      if (near) { if (o.sound) play(o.sound, o.z); if (!animal && Math.random() < 0.3) otherSay(o, () => wordOf(o), 1.2, o.vehicle ? 2.9 : 2); o.honkT = animal ? rand(1.5, 3.5) : rand(2.5, 5); }
      else o.honkT = 0.4;
    }
  }
  for (const p of pickups) { p.ring.material.opacity = 0.45 + Math.sin(time * 6) * 0.3; p.root.rotation.y += dt; }
}

// ---------------- dog gang ----------------
function startDogs() {
  dogTime = 12;
  const hs = humans().filter(r => !r.finished);
  const targets = [];
  hs.forEach(h => targets.push(h, h, ...(hs.length === 1 ? [h] : [])));
  targets.push(...runners.filter(r => !r.finished && !r.human));
  const list = targets.slice(0, 9).map((t, i) => {
    const side = i % 2 ? 1 : -1;
    return { id: nextId++, t: t.idx, x: r2(clamp(t.x + side * rand(1.5, 3), -5, 5)), z: r2(t.z - rand(3, 6)), sz: r2(rand(-2.2, 0.6)), sx: r2(side * rand(1.1, 2.0)) };
  });
  list.forEach(addDog);
  emit({ e: 'dg', l: list });
  showBanner('কুকুর! পালাও! 🐕', 'পিছনে কুকুরের দল — জোরে দৌড়াও!', 3);
  setMusicFast(true);
  play('bark', player.z);
}
function addDog(p) {
  const m = M.makeDog(); m.root.scale.setScalar(1.3);
  const t = runners[p.t];
  const d = { id: p.id, isDog: true, m, target: t, x: p.x, z: p.z, y: 0, cur: t.speed, slotZ: p.sz, slotX: p.sx, lungeT: rand(1, 2.5), lunge: 0, phase: Math.random() * 6, want: p.x };
  scene.add(m.root); dogs.push(d); dogById.set(d.id, d);
}
function updateDogs(dt) {
  if (dogTime > 0) { dogTime -= dt; if (dogTime <= 0) { setMusicFast(false); showBanner('বাঁচা গেল!', 'উফ্‌… কুকুরগুলো হাল ছেড়ে দিল', 1.8); } }
  for (const d of dogs) {
    const t = d.target;
    let tgtSpeed = 0, wantX = d.x;
    if (dogTime > 0 && t && !t.finished && !t.inBrawl) {
      let wantZ;
      if (d.lunge > 0) { d.lunge -= dt; wantZ = t.z - 0.1; wantX = t.x; }
      else {
        d.lungeT -= dt; wantZ = t.z + d.slotZ; wantX = t.x + d.slotX;
        if (d.lungeT < 0 && Math.abs(d.z - wantZ) < 1.5) {
          d.lunge = 0.8; d.lungeT = rand(1.8, 3.5);
          play('bark', d.z); 
        }
      }
      tgtSpeed = clamp(t.speed + (wantZ - d.z) * 2.2, 0, DOG_MAX_SPEED);
      if (d.lunge > 0 && Math.abs(t.z - d.z) < 1.0 && Math.abs(t.x - d.x) < 0.9 && t.y < 0.6 && t.inv <= 0) {
        hit(t, null, 'bite'); t.slow = 1.2; d.lunge = 0;
        if (Math.random() < 0.7) talk(t, 'fall', 1.4);
      }
    }
    d.cur += (tgtSpeed - d.cur) * Math.min(1, dt * 4);
    d.z += d.cur * dt;
    d.x = clamp(d.x + clamp(wantX - d.x, -1, 1) * 7 * dt, -track.half(d.z) + 0.3, track.half(d.z) - 0.3);
    d.want = wantX;
  }
}
function animDogs(dt) {
  for (const d of dogs) {
    d.phase += dt * (6 + d.cur);
    track.place(d.m.root, d.z, d.x, 0, clamp((d.want - d.x) * 0.3, -0.6, 0.6));
    const s = Math.sin(d.phase), runAmt = Math.min(1, d.cur / 8);
    d.m.legs.forEach((l, i) => { l.rotation.x = (i % 2 ? s : -s) * 0.9 * runAmt * (i < 2 ? 1 : -1); });
    d.m.body.position.y = Math.abs(Math.cos(d.phase)) * 0.12 * runAmt;
    d.m.tail.rotation.y = Math.sin(time * 18) * 0.6;
  }
}

// ---------------- group brawl (মারপিট) ----------------
function makeBrawlCloud() {
  const g = new THREE.Group();
  const puffM = new THREE.MeshLambertMaterial({ color: 0xfff8e8, emissive: 0x9a9080, transparent: true, opacity: 0.62, depthWrite: false });
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    const p = new THREE.Mesh(geo, puffM); p.position.set(Math.cos(a) * 1.9, 1.1 + Math.sin(i * 1.7) * 0.7, Math.sin(a) * 1.9);
    g.add(p); puffs.push(p);
  }
  const limbs = [], cols = [0xff5533, 0x2e86de, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xc68642];
  for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.22), new THREE.MeshLambertMaterial({ color: cols[i % 6] })); g.add(l); limbs.push(l); }
  const stars = [];
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: 0xffe14a })); g.add(s); stars.push(s); }
  g.visible = false; scene.add(g);
  return { g, puffs, limbs, stars };
}
function startBrawl() {
  const act = runners.filter(r => !r.finished && !r.caught);
  if (act.length < 2) return;
  const hs = humans().filter(r => !r.finished);
  const cs = (hs.length ? hs.reduce((a, r) => a + r.z, 0) / hs.length : player.z) + 5;
  brawl = { t: 10, s: cs, lat: 0, powT: 0 };
  act.forEach((r, k) => {
    r.inBrawl = true; r.brawlScore = 0; r.brawlSlot = k; r.stun = 0;
    if (Math.abs(r.z - cs) > 22) { r.z = cs - 7 - k; pow(r.x, 2, r.z, 'সাঁই!'); } // stragglers rush in
  });
  brawlSlots();
  emit({ e: 'bs', s: r2(cs) });
  onBrawlStart();
  for (const r of act) if (Math.random() < 0.85) setTimeout(() => brawl && talk(r, 'brawl', 0.9), rand(100, 900));
}
function onBrawlStart() {
  if (setting('bystanders')) for (const n of world.npcs) if (Math.abs(n.z - player.z) < 25 && Math.random() < 0.5) // the crowd joins in
    setTimeout(() => brawl && bubble(n, L(n.female ? 'bystanderF' : n.role === 'shop' ? 'shopkeeper' : 'bystander'), 1.6, 2.5), rand(400, 2500));
  showBanner('মারপিট! 👊 ধিসুম ধিসুম!', 'সবাই ১০ সেকেন্ড মারপিট — মার বোতাম চাপো!', 2.5, false);
  sfx.whistle(); setTimeout(() => sfx.kick(), 300); setTimeout(() => sfx.slap(), 500);
  brawlCloud.g.visible = true;
}
function brawlSlots() { // runners circle around the cloud centre
  const act = runners.filter(r => r.inBrawl), n = act.length;
  act.forEach(r => {
    const a = r.brawlSlot / n * Math.PI * 2 + brawl.t * 0.9;
    r.slotS = brawl.s + Math.sin(a) * 1.3; r.slotX = clamp(brawl.lat + Math.cos(a) * 1.7, -track.half(brawl.s) + 0.6, track.half(brawl.s) - 0.6);
  });
}
function updateBrawl(dt) {
  brawl.t -= dt;
  brawlSlots();
  brawl.powT -= dt;
  if (brawl.powT < 0) {
    brawl.powT = rand(0.18, 0.35);
    pow(brawl.lat + rand(-2, 2), rand(1.2, 3), brawl.s + rand(-1.5, 1.5), pick(BRAWL_POWS));
    if (Math.abs(brawl.s - player.z) < 25) (Math.random() < 0.5 ? sfx.slap : sfx.kick)();
  }
  if (brawl.t <= 0) endBrawl();
}
function endBrawl() {
  const act = runners.filter(r => r.inBrawl);
  const best = act.reduce((a, r) => (r.brawlScore > a.brawlScore ? r : a), act[0]);
  for (const r of act) {
    r.inBrawl = false; r.inv = 0.8;
    if (r === best) { r.boostT = 3.5;  }
    else { r.stun = 0.6; r.ko = 0.8; }
  }
  if (best) { showBanner(`${best.label} মারপিটে জিতল!`, `${bnNum(best.brawlScore)} বার মেরেছে — গতি বাড়ল!`, 2.2); pow(best.x, 2.6, best.z, 'চ্যাম্পিয়ন! 🏆'); }
  brawl = null; emit({ e: 'be' });
  brawlCloud.g.visible = false;
}
function animBrawlCloud() {
  const c = brawlCloud;
  track.pos(brawl.s, brawl.lat, 0, c.g.position); c.g.rotation.y = time * 0.6;
  c.puffs.forEach((p, i) => p.scale.setScalar(1.2 + Math.sin(time * 9 + i * 1.3) * 0.25));
  c.limbs.forEach((l, i) => {
    const a = time * (5 + i) + i * 0.8, rr = 1.8 + Math.sin(time * 7 + i) * 0.5;
    l.position.set(Math.cos(a) * rr, 1.3 + Math.sin(a * 1.3) * 0.9, Math.sin(a) * rr);
    l.rotation.set(a * 2, a, a * 1.5);
  });
  c.stars.forEach((st, i) => { const a = time * 3 + i * 1.26; st.position.set(Math.cos(a) * 1.2, 3.3 + Math.sin(time * 5 + i) * 0.2, Math.sin(a) * 1.2); st.rotation.y = time * 4; });
}

// ---------------- AI ----------------
function aiInput(r, dt) {
  const inp = makeInput(), ai = r.ai;
  const lim = track.half(r.z) - 0.6;
  ai.think -= dt; ai.sprintT -= dt;
  if (ai.think < 0) {
    ai.think = rand(1.2, 3);
    ai.tx = clamp(r.x + rand(-3, 3), -lim + 0.4, lim - 0.4);
    if (ai.sprintT < -2 && Math.random() < 0.3 + level.aiBoost * 0.08) ai.sprintT = rand(1.5, 4);
  }
  const look = r.speed * 0.7 + 3;
  let obs = null, od = 1e9;
  for (const o of obstacles) {
    const dz = (o.z - o.d) - r.z;
    if (dz < -0.3 || dz > look) continue;
    if (!o.full && Math.abs(o.x - r.x) > o.w + 0.7) continue;
    if (dz < od) { od = dz; obs = o; }
  }
  if (obs) {
    if (ai.lastObs !== obs) { ai.lastObs = obs; ai.lastOk = Math.random() < (obs.overhead ? Math.min(0.95, ai.skill + 0.1) : ai.skill); ai.dodge = !obs.jumpable || (!obs.full && Math.random() < 0.35); }
    if (ai.lastOk) {
      if (obs.overhead) { if (od < r.speed * 0.45 + 1) inp.duck = true; }
      else if (obs.kind === 'drain') { ai.tx = obs.plankX; ai.think = 1; if (Math.abs(r.x - obs.plankX) > 0.5 && od < r.speed * 0.22 + 0.2) inp.jump = true; }
      else if (obs.kind === 'bumper') { if (od < r.speed * 0.2 && Math.random() < 0.5) inp.jump = true; }
      else if (ai.dodge) {
        const side = r.x > obs.x ? 1 : -1;
        let tx = obs.x + side * (obs.w + 1.3);
        if (Math.abs(tx) > lim) tx = obs.x - side * (obs.w + 1.3);
        ai.tx = clamp(tx, -lim, lim); ai.think = 1;
        if (obs.jumpable && od < r.speed * 0.25) inp.jump = true;
      } else if (obs.jumpable && od < r.speed * 0.22 + 0.2) inp.jump = true;
    }
  }
  if (!r.stick || r.stones < 3 || r.hp < 60) {
    const p = pickups.find(p => !p.taken && p.z > r.z && p.z - r.z < 10 && Math.abs(p.x - r.x) < 3.5);
    if (p && !obs) ai.tx = p.x;
  }
  let near = null, nd = 1e9;
  for (const o of runners) {
    if (o === r || o.finished) continue;
    const d = Math.abs(o.z - r.z) + Math.abs(o.x - r.x);
    if (d < nd) { nd = d; near = o; }
  }
  if (near && nd < 5 && !obs && Math.random() < ai.aggro * dt * 2) ai.tx = clamp(near.x, -lim, lim);
  if (near && Math.abs(near.z - r.z) < 1.9 && Math.abs(near.x - r.x) < 1.9 && near.inv <= 0 && Math.random() < ai.aggro * dt * (near.human ? 1.6 : 3)) inp.attack = true; // gentler on players (they're close more often now)
  if (r.stones > 0 && throwTarget(r) && Math.random() < dt * (throwTarget(r).human ? 0.45 : 0.8)) inp.attack = true;
  if (raceTime < 2.5) inp.attack = false; // no cheap shots at the start line
  inp.dirX = clamp((ai.tx - r.x) * 0.9, -1, 1);
  const hs = humans(), focus = hs.length ? hs.reduce((a, h) => a + h.z, 0) / hs.length : player.z;
  // same top speed as the players — the AI only decides *when* to spend its 4 s of sprint
  const dogClose = dogTime > 0 && dogs.some(d => Math.abs(d.z - r.z) < 6 && d.z < r.z + 1);
  inp.sprint = ai.sprintT > 0 || (dogClose && r.stamina > 0.35) || (track.finish - r.z < 90 && r.stamina > 0.2)
    || (focus - r.z > 5 && r.stamina > 0.25);
  if (r.z - focus > 4) inp.sprint = false; // ahead of the players: no sprinting away
  // keep the pack around the player(s): far behind → run much faster, far ahead → ease off (beyond ±3 m)
  const gap = focus - r.z;
  inp.bias = Math.abs(gap) < 3 ? 0 : clamp((gap - Math.sign(gap) * 3) * (gap < 0 ? 0.5 : 0.3), -8, 5);
  if (hs.every(h => h.finished)) { inp.sprint = true; inp.bias = 1; }
  return inp;
}
function humanInput(r) {
  const inp = makeInput();
  if (r === player) {
    inp.dirX = -steerAxis(); // +x is the runner's left; keys, stick, slider or gyro
    inp.sprint = held('sprint'); inp.duck = held('duck');
    if (!menuOpen) { inp.jump = edge.jump; inp.attack = edge.attack; }
    edge.jump = edge.attack = false;
  } else {
    const ri = remoteIn[r.idx] || {};
    inp.dirX = ri.x != null ? -ri.x : (ri.l ? 1 : 0) - (ri.r ? 1 : 0); inp.sprint = !!ri.s; inp.duck = !!ri.d;
    inp.jump = !!ri.jump; inp.attack = !!ri.attack; ri.jump = ri.attack = false;
  }
  return inp;
}

// ---------------- runner physics (host / single player) ----------------
function updateRunner(r, dt) {
  r.cd -= dt; r.inv -= dt; r.attackT -= dt; r.slow -= dt; r.ko -= dt; r.boostT -= dt; r.bumpCd -= dt; r.spin = Math.max(0, r.spin - dt);
  if (r.gone) return; // left the room mid-race
  if (r.caught) return caughtRunner(r, dt);
  const inp = r.human ? humanInput(r) : aiInput(r, dt);
  if (r.inBrawl && brawl) return brawlRunner(r, dt, inp);

  const lim = track.half(r.z) - 0.6;
  if (r.stun > 0) {
    r.duck = false;
    r.stun -= dt;
    r.speed = Math.max(0, r.speed - 25 * dt);
    r.vx *= Math.max(0, 1 - 4 * dt);
  } else {
    let target = BASE_SPEED + inp.bias;
    r.sprinting = false;
    r.duck = inp.duck && r.y <= 0.05; // crawl: slow, but fits under ladders, beams and fallen trees
    if (r.duck) inp.sprint = false;
    if (r.stamina <= 0) r.tired = true; else if (r.stamina >= 0.2) r.tired = false; // empty → wait a bit before sprinting again
    if (inp.sprint && !r.tired) { target = SPRINT_SPEED + inp.bias; r.sprinting = true; r.stamina = Math.max(0, r.stamina - dt / SPRINT_TIME); }
    else r.stamina = Math.min(1, r.stamina + dt / REGEN_TIME);
    if (dogTime > 0) target += PANIC_BONUS;
    if (r.boostT > 0) target += 3;
    if (r.slow > 0) target *= 0.6;
    if (r.duck) target *= 0.55;
    const slope = (track.h(r.z + 1.5) - track.h(r.z - 1.5)) / 3; // uphill is slower
    target *= clamp(1 - slope * 1.6, 0.7, 1.25);
    if (track.seg(r.z).surface === 'soil') target *= 0.96;
    r.speed += (target - r.speed) * Math.min(1, dt * 2.6);
    r.vx += (inp.dirX * STEER_SPEED - r.vx) * Math.min(1, dt * 10);
    if (inp.jump && r.y <= 0.001) { r.vy = JUMP_V; if (r.human) play('jump', r.z, r.idx); }
    if (inp.attack && r.cd <= 0) doAttack(r);
  }
  r.x = clamp(r.x + r.vx * dt, -lim, lim);
  gravity(r, dt);
  r.z += r.speed * dt;
  collideObstacles(r); autoPickup(r);
  if (r.z >= track.finish) { // the Superintendent is waiting at the finish line
    r.finished = true; r.caught = true; r.finishTime = raceTime; finishOrder.push(r);
    r.lineSlot = finishOrder.length - 1;
    pow(r.x, 2.4, r.z, finishOrder.length === 1 ? 'প্রথম!' : ordinal(finishOrder.length));
    talk(superObj, 'super', 1.6, 3.2);
    play('whistle', r.z);
    if (r === player) showBanner('ধরা পড়েছি! 😱', 'সুপার স্যার ধরে ফেলেছেন!', 2.5, false);
    else if (finishOrder.length === 1) showBanner(`${r.label} প্রথম!`, 'সবার আগে পৌঁছে গেছে', 1.8);
  }
  r.talkT -= dt;
  if (r.talkT < 0) { // friends keep shouting: every 1–2.2 s while chasing, faster in a brawl
    r.talkT = r.inBrawl ? rand(0.6, 1.3) : rand(2.0, 3.5); // leaves room for the people on the road
    if (!r.human && Math.abs(r.z - player.z) < 25) talk(r, r.inBrawl ? 'brawl' : 'chase', 1.0);
  }
}
function gravity(r, dt) {
  if (r.y > 0 || r.vy > 0) {
    r.vy -= GRAVITY * dt; r.y += r.vy * dt;
    if (r.y <= 0) { r.y = 0; r.vy = 0; if (r.human) play('land', r.z, r.idx); }
  }
}
function brawlRunner(r, dt, inp) { // everyone circles in the dust cloud, hitting whoever is closest
  r.stun -= dt;
  r.speed += ((r.slotS - r.z) * 4 - r.speed) * Math.min(1, dt * 6);
  r.speed = clamp(r.speed, -6, 20);
  r.z += r.speed * dt;
  r.vx = clamp((r.slotX - r.x) * 5, -8, 8);
  r.x += r.vx * dt;
  gravity(r, dt);
  if (r.stun > 0) return;
  if (inp.jump && r.y <= 0.001) r.vy = JUMP_V * 0.7;
  if (!r.human && r.cd <= 0) inp.attack = true;
  if (inp.attack && r.cd <= 0) doAttack(r);
  r.talkT -= dt; // in a fight everyone shouts, players' runners too
  if (r.talkT < 0) { r.talkT = rand(0.9, 1.8); if (r !== player || Math.random() < 0.5) talk(r, 'brawl', 0.9); }
}
function caughtRunner(r, dt) { // walk to the punishment line-up in front of the Superintendent
  const F = track.finish, half = Math.min(4, track.half(F) - 0.8);
  const tz = F + 8, tx = -half + r.lineSlot * (half * 2 / Math.max(1, runners.length - 1));
  r.speed = clamp((tz - r.z) * 3, 0, 8);
  r.z += r.speed * dt;
  r.x += clamp(tx - r.x, -1, 1) * 4 * dt;
  r.stun = 0; r.inBrawl = false; gravity(r, dt);
}
function separate() {
  for (let i = 0; i < runners.length; i++) for (let j = i + 1; j < runners.length; j++) {
    const a = runners[i], b = runners[j];
    if (a.caught || b.caught) continue;
    const dx = b.x - a.x, dz = b.z - a.z;
    if (Math.abs(dz) < 0.7 && Math.abs(dx) < 0.75) {
      const push = (0.75 - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
      a.x -= push; b.x += push;
    }
  }
}

function animRunner(r, dt) {
  const m = r.m;
  const situp = r.caught && r.speed < 0.5;
  r.phase += dt * (3 + Math.abs(r.speed) * 0.95);
  const s = Math.sin(r.phase), amp = Math.min(1, Math.abs(r.speed) / 6) * 0.95;
  m.legL.rotation.set(s * amp, 0, 0); m.legR.rotation.set(-s * amp, 0, 0);
  m.armL.rotation.set(-s * amp * 0.9, 0, 0.1); m.armR.rotation.set(s * amp * 0.9, 0, -0.1);
  if (r.y > 0.05) { m.legL.rotation.x = -1.0; m.legR.rotation.x = 0.5; m.armL.rotation.set(-2.6, 0, 0.3); m.armR.rotation.set(-2.6, 0, -0.3); }
  if (r.speed < 0.5 && r.y <= 0 && r.stun <= 0 && !situp) { m.armL.rotation.set(0, 0, 0.6); m.armR.rotation.set(0, 0, -0.6); }
  if (r.attackT > 0) {
    const p = 1 - r.attackT / 0.32, k = Math.sin(p * Math.PI);
    if (r.attackType === 'slap') { m.armR.rotation.set(-1.3, 0, -1.4 + p * 2.4); if (r.attackSide < 0) m.armR.rotation.z = -m.armR.rotation.z; }
    else if (r.attackType === 'kick') { m.legR.rotation.x = (r.kickDir > 0 ? -1.8 : 1.3) * k; m.armL.rotation.x = -1 * k; }
    else m.armR.rotation.set(-2.9 + p * 3.4, 0, 0);
  }
  const panic = r.sprinting && dogTime > 0 && !r.inBrawl && !r.caught;
  if (r.sprinting && r.y <= 0.05 && r.attackT <= 0 && r.stun <= 0 && !situp) {
    if (panic) { // dogs behind: cartoon "wheel legs" and windmilling arms
      const w = r.phase * 1.5;
      m.legL.rotation.x = Math.sin(w) * 1.55; m.legR.rotation.x = -Math.sin(w) * 1.55;
      m.armL.rotation.set(-w * 1.3, 0, 0.55); m.armR.rotation.set(-w * 1.3 + Math.PI, 0, -0.55);
    } else { m.armL.rotation.x *= 1.5; m.armR.rotation.x *= 1.5; m.legL.rotation.x *= 1.25; m.legR.rotation.x *= 1.25; }
  }
  if (r.sprinting && r.y <= 0.05 && Math.abs(r.z - player.z) < 40) { // dust trail
    r.dustT -= dt;
    if (r.dustT <= 0) { r.dustT = panic ? 0.035 : 0.09; spawnDust(r, panic); }
  }
  if (panic && r === player) { r.sweatT -= dt; if (r.sweatT <= 0) { r.sweatT = rand(0.3, 0.55); sweat(r); } }
  let squat = 0;
  if (situp) { // কান ধরে ওঠবস — hands on ears, squat up and down
    squat = Math.sin(time * 6 + r.idx) * 0.5 + 0.5;
    m.armL.rotation.set(-0.3, 0, 2.7); m.armR.rotation.set(-0.3, 0, -2.7);
    m.legL.rotation.x = -squat * 1.1; m.legR.rotation.x = -squat * 1.1;
  }
  r.fall += ((r.stun > 0.15 && !r.inBrawl ? 1 : 0) - r.fall) * Math.min(1, dt * 10);
  r.crouch = (r.crouch || 0) + ((r.duck ? 1 : 0) - (r.crouch || 0)) * Math.min(1, dt * 14);
  if (r.crouch > 0.05) { // crawling: bent double, hands forward, short quick steps
    const c = r.crouch, w = Math.sin(r.phase * 1.4);
    m.legL.rotation.x = -1.2 * c + w * 0.4; m.legR.rotation.x = -1.2 * c - w * 0.4;
    m.armL.rotation.set(-1.5 * c - w * 0.4, 0, 0.2); m.armR.rotation.set(-1.5 * c + w * 0.4, 0, -0.2);
  }
  const bob = r.y <= 0 ? Math.abs(Math.cos(r.phase)) * 0.12 * amp : 0;
  if (r.fall > 0.05) { m.legL.rotation.x = 0.3; m.legR.rotation.x = -0.3; m.armL.rotation.set(-2.8, 0, 0.6); m.armR.rotation.set(-2.8, 0, -0.6); }
  m.body.rotation.x = (0.13 * Math.min(1, r.speed / 12) + (panic ? 0.32 : r.sprinting ? 0.14 : 0)) * (1 - r.fall) + 1.42 * r.fall + squat * 0.3 + (r.crouch || 0) * 1.0;
  m.body.position.y = bob * (1 - r.fall) + 0.22 * r.fall - squat * 0.45 - (r.crouch || 0) * 0.75;
  let yaw = clamp(r.vx * 0.05, -0.4, 0.4) * (1 - r.fall);
  if (r.spin > 0) yaw += r.spin * 12;
  if (r.inBrawl) yaw += Math.sin(time * 7 + r.idx) * 0.8;
  m.head.rotation.z = r.ko > 0 ? Math.sin(time * 10) * 0.3 : 0;
  m.head.rotation.y = panic && Math.sin(time * 2.6 + r.idx) > 0.55 ? 1.1 : 0; // panicked look back at the dogs
  track.place(m.root, r.z, r.x, r.y, yaw);
  m.stick.visible = r.stick; m.stone.visible = !r.stick && r.stones > 0;
  m.shadow.position.y = 0.03 - r.y; m.shadow.scale.setScalar(Math.max(0.5, 1.1 - r.y * 0.3));
  m.root.visible = !r.gone && !(r.inv > 0.2 && r.stun <= 0 && !r.inBrawl && !r.caught && Math.floor(time * 14) % 2);
}

// ---------------- sprint FX: dust puffs + sweat drops ----------------
const dustGeo = new THREE.IcosahedronGeometry(0.26, 0), dustPool = [];
function spawnDust(r, big) {
  let d = dustPool.find(p => p.life <= 0);
  if (!d) {
    if (dustPool.length > 80) return;
    d = { m: new THREE.Mesh(dustGeo, new THREE.MeshLambertMaterial({ color: 0xe8e0cc, transparent: true, opacity: 0.7, depthWrite: false })), life: 0 };
    scene.add(d.m); dustPool.push(d);
  }
  d.m.material.color.setHex(track.seg(r.z).surface === 'soil' ? 0xc79a62 : 0xece4d0);
  d.max = d.life = big ? 0.65 : 0.45;
  d.s = r.z - 0.45; d.lat = r.x + rand(-0.35, 0.35); d.y = 0.15; d.vy = rand(0.6, 1.5); d.size = big ? 1.35 : 0.8;
  d.m.visible = true;
}
function updateDust(dt) {
  for (const d of dustPool) {
    if (d.life <= 0) continue;
    d.life -= dt;
    if (d.life <= 0) { d.m.visible = false; continue; }
    const k = 1 - d.life / d.max;
    d.y += d.vy * dt; d.lat += Math.sin(d.s * 7) * dt * 0.5;
    track.pos(d.s, d.lat, d.y, d.m.position);
    d.m.scale.setScalar(d.size * (0.5 + k * 1.6)); d.m.material.opacity = 0.75 * (1 - k);
  }
}
function clearDust() { for (const d of dustPool) { d.life = 0; d.m.visible = false; } }
function sweat(r) {
  const el = document.createElement('div'); el.className = 'sweat';
  el.textContent = pick(['💦', '💦', '😱', '💨']);
  el.style.setProperty('--dx', (Math.random() < 0.5 ? -1 : 1) * rand(18, 40) + 'px');
  labelsEl.appendChild(el); pows.push({ el, obj: r, life: 0.7 });
}

function animSuper() { // the Superintendent waits past the finish line, wagging his cane
  if (!superM) return;
  superObj.z = track.finish + 12; superObj.x = 0; superObj.y = 0;
  track.place(superM.root, superObj.z, 0, 0, Math.PI);
  const anyCaught = runners.some(r => r.caught);
  superM.armR.rotation.set(anyCaught ? -2.2 + Math.sin(time * 8) * 0.6 : -0.4, 0, 0);
  superM.armL.rotation.set(0, 0, anyCaught ? 0.9 : 0.2);
  superM.head.rotation.y = Math.sin(time * 1.5) * 0.4;
}

// ---------------- local-only fun: bystanders wave and comment ----------------
// ---------------- background animal life (local only): crows in town, birds on campus, cattle in the village… ----------------
let ambientT = 3;
const AMBIENT = {
  city: ['crow', 'crow', 'barkFar', 'crow'], market: ['crow', 'barkFar', 'crow', 'hen'], campus: ['birds', 'birds', 'crow'],
  village: ['mooFar', 'baaFar', 'hen', 'birds', 'mooFar', 'quack'], river: ['birds', 'frog', 'frog', 'crow'], bridge: ['birds', 'crow'],
  highway: ['horn'], flyover: ['horn'], underpass: ['horn'], // no animals up there / down there
};
function updateAmbient(dt) {
  if (state !== 'playing' || menuOpen) return;
  ambientT -= dt;
  if (ambientT > 0) return;
  ambientT = rand(3, 7);
  const list = AMBIENT[track.zone(player.z)] || AMBIENT.city;
  const k = pick(list); sfx[k] && sfx[k]();
}
function updateBystanders(dt) {
  updateAmbient(dt);
  bystanderT -= dt;
  for (const n of world.npcs) {
    if (Math.abs(n.z - player.z) > 30) continue;
    n.phase += dt;
    const near = Math.abs(n.z - player.z) < 9;
    n.m.armR.rotation.z = near ? -2.4 + Math.sin(time * 10 + n.phase) * 0.4 : -0.1;
    n.m.armL.rotation.x = near ? Math.sin(time * 8 + n.phase) * 0.5 : 0;
    n.talkT -= dt;
    if (setting('bystanders') && near && n.talkT < 0 && bystanderT < 0 && state === 'playing' && otherCanTalk()) {
      n.talkT = rand(8, 15);
      const t = L(n.role === 'shop' ? 'shopkeeper' : n.female ? 'bystanderF' : 'bystander');
      if (t) { bystanderT = rand(2.5, 4.5); otherTalked(); bubble(n, t, 1.8, 2.5); }
    }
  }
}

// ---------------- level / race setup ----------------
function setupLevel(idx) {
  levelIdx = idx; level = LEVELS[idx];
  if (world) world.destroy();
  track = new Track(level);
  world = new World(scene, track, level.seed);
  weather = sky.apply(level.time, level.weather);                    // time of day + weather of this level
  world.setEvening(weather.evening);
  world.mats.road.color.setHex(weather.rainy ? 0x8a8f96 : 0xffffff);  // wet road in the rain
  world.onSound = (n, s) => { if (Math.abs(s - player.z) < 45 && state === 'playing' && !menuOpen) sfx[n] && sfx[n](); }; // local only
  world.onStatic = st => obstacles.push({ ...st, id: 0, root: null, vz: 0, vx: 0, honkT: 9 });
  if (!superM) { superM = M.makeSuper(); scene.add(superM.root); }
}
function clearEntities() {
  for (const o of obstacles) if (o.root) scene.remove(o.root);
  for (const p of pickups) scene.remove(p.root);
  for (const s of projectiles) scene.remove(s.m);
  for (const d of dogs) scene.remove(d.m.root);
  obstacles = []; pickups = []; projectiles = []; dogs = [];
  obById.clear(); pkById.clear(); dogById.clear();
  clearLabels(); clearDust();
}
function resetRace() {
  clearEntities();
  world.reset();
  const dbgS = +new URLSearchParams(location.search).get('z') || 0; // debug: ?z=600 starts further along
  runners.forEach(r => { r.reset(); r.z = dbgS + r.startZ; r.ai.tx = r.x; animRunner(r, 0); });
  othersLeft = 999; othersNextT = rand(3, 5); crawlHinted = false; lastLineAt = performance.now(); // other people: a line every 3–6 s at most
  resetLines(); // every line can be said again (max 3 times a race)
  nextSpawnS = dbgS + 34; nextPickupS = dbgS + 18; raceTime = 0; finishOrder = []; dogTime = 0; shake = 0; endTimer = -1;
  brawl = null; brawlCloud.g.visible = false;
  dogEvents = level.dogs.filter(z => z > dbgS + 20);
  brawlEvents = (level.brawls || [0.34, 0.7]).map(f => f * track.finish).filter(z => z > dbgS + 30);
  edge.jump = edge.attack = false;
  setMusicFast(false);
  world.update(dbgS - 60, dbgS + 200);
  if (!net.active || net.host) spawnAhead();
  updateCamera(0, true);
  if (dbgS) window.__dbg = { // test hooks, only with ?z=
    startDogs, startBrawl, runners, get state() { return state; }, get raceTime() { return raceTime; }, get dogs() { return dogs; }, get camera() { return camera; },
    get brawl() { return brawl; }, get track() { return track; }, get obstacles() { return obstacles; }, attack: () => doAttack(player),
    give(kind) { const p = { id: nextId++, item: kind, x: player.x, z: player.z + 5 }; createPickup(p); emit({ e: 'pk', ...p }); },
    get player() { return player; }, get world() { return world; },
    hazard(kind, ahead = 14) { const z = player.z + ahead; spawnObstacle({ kind, x: 0, z: r2(z), half: r2(track.half(z)) }); },
  };
}

function chooseStory(levelIdx) { // the level decides the story; prequal says who did it (random if it doesn't)
  const k = storyForLevel(levelIdx), sc = levelScript(levelIdx + 1, setting('slang')) || {};
  const N = SEATS, slot = n => CHARS.slice(0, SEATS).findIndex(c => c.name === n); // the story is always about the four friends
  let culprit = slot(sc.culprit), victim = slot(sc.victim);
  if (culprit < 0) culprit = Math.random() < 0.25 ? 0 : 1 + ((Math.random() * (N - 1)) | 0);
  if (victim < 0 || victim === culprit) do { victim = (Math.random() * N) | 0; } while (victim === culprit);
  return { story: k, culprit, victim };
}
function castNames() { // the story slides use the four friends' names; "labels" are what the race shows (তুমি / online names)
  return { names: CHARS.map(c => c.name), enNames: CHARS.map(c => c.en), labels: ALL_RUNNERS.map(r => r.label),
    colors: CHARS.map(c => c.color) };
}

function startGame(idx, pickS = chooseStory(idx)) {
  initAudio();
  hideScreens(); closeMenu(); levelTitles();
  setupLevel(idx);
  resetRace();
  story = STORIES[pickS.story]; cast = { culprit: pickS.culprit, victim: pickS.victim };
  goReceived = false;
  state = 'story';
  $('hud').classList.add('hidden'); refreshTouch();
  const ctx = { ...castNames(), ...cast, levelName: level.bn, levelNo: level.id };
  playSlides(introSlides(story, ctx, setting('slang')), () => {
    if (net.active && !net.host && !goReceived) { $('waitHost').classList.remove('hidden'); return; } // the host says when to go
    if (net.active && net.host) broadcast({ t: 'go' });
    startCountdown();
  });
}
function startCountdown() {
  $('waitHost').classList.add('hidden');
  state = 'countdown';
  $('hud').classList.remove('hidden'); refreshTouch(); buildProgress();
  runners.forEach(r => { r.nameEl.textContent = r.label; r.tag.classList.toggle('me', r === player); });
  const cd = $('countdown'); cd.classList.remove('hidden');
  calibrateGyro(); // whatever angle the phone is held at now counts as "straight"
  const steps = ['৩', '২', '১', 'দৌড়!'];
  let i = 0;
  const tick = () => {
    if (state !== 'countdown') { cd.classList.add('hidden'); return; }
    cd.innerHTML = `<span>${steps[i]}</span>`; sfx.beep(i === 3);
    if (i === 3) {
      state = 'playing'; startMusic(); refreshTouch();
      // the level's special line opens the chase
      if (!net.active || net.host) { { const sp = levelLine(level.id, setting('slang')); if (sp) say(runners[cast.victim % runners.length], sp, 1.8); else talk(runners[cast.victim % runners.length], 'chase', 1.6); } talk(runners[(cast.victim + 2) % runners.length], 'chase', 1.6); }
      showBanner(`${level.bn}!`, 'ধর ধর!', 1.6, false);
      setTimeout(() => cd.classList.add('hidden'), 800);
      return;
    }
    i++; setTimeout(tick, 800);
  };
  tick();
}

function checkEnd(dt) {
  if (!humans().every(h => h.caught)) return;
  if (endTimer < 0) endTimer = 9;
  endTimer -= dt;
  if (runners.every(r => r.gone || r.caught && r.z > track.finish + 7) && endTimer > 3) endTimer = 3;
  if (endTimer <= 0) {
    const order = [...finishOrder, ...runners.filter(r => !r.finished).sort((a, b) => b.z - a.z)].map(r => r.idx);
    const times = runners.map(r => (r.gone ? -1e6 : r.finished ? r2(r.finishTime) : -Math.round(track.finish - r.z)));
    if (net.active) { hostNetTick(1); broadcast({ t: 'end', order, times }); }
    showEnding(order, times);
  }
}
function showEnding(order, times) {
  state = 'ending'; endTimer = -1;
  $('hud').classList.add('hidden'); closeMenu(); refreshTouch(); stopMusic();
  const ctx = { ...castNames(), ...cast, winner: order[0], levelName: level.bn, levelNo: level.id };
  playSlides(endingSlides(story, ctx, setting('slang')), () => showResults(order, times), { dur: 3000 });
}
function unlocked() { try { return +(localStorage.getItem('buddyrace.unlocked') || 0); } catch (e) { return 0; } }
function unlock(i) { try { if (i > unlocked()) localStorage.setItem('buddyrace.unlocked', String(i)); } catch (e) { /* ignore */ } }
function showResults(order, times) {
  state = 'results';
  const rank = order.indexOf(player.idx) + 1, winner = runners[order[0]];
  unlock(Math.min(LEVELS.length - 1, levelIdx + 1));
  rank === 1 ? sfx.win() : sfx.lose();
  $('resultHead').textContent = rank === 1 ? 'তুমি প্রথম! 🏆' : 'ভালো হচ্ছে না কিন্তু!';
  $('resultSub').innerHTML = `${level.bn} · ${story.bn}<br>` + (rank === 1 ? 'দৌড়ে জিতলে… তবু শাস্তি থেকে রেহাই নেই 😂'
    : `তুমি <b>${ordinal(rank)}</b> হয়েছ। জিতেছে ${escapeHTML(winner.label)}।`);
  $('resultList').innerHTML = order.map((i, k) => {
    const r = runners[i], t = times[i] <= -1e6 ? 'চলে গেছে' : times[i] >= 0 ? `${bnNum(times[i].toFixed(1))} সে` : `${bnNum(-times[i])} মি পিছনে`;
    return `<li><span class="sw" style="background:${r.def.color}"></span><b>${ordinal(k + 1)}</b> ${escapeHTML(r.label)}<i class="hpm"><b style="width:${Math.max(0, r.hp)}%"></b></i><em>${t}</em></li>`;
  }).join('');
  const client = net.active && !net.host;
  $('btnNext').classList.toggle('hidden', levelIdx >= LEVELS.length - 1 || client);
  $('btnAgain').classList.toggle('hidden', client);
  $('btnLevels').classList.toggle('hidden', net.active);
  $('btnLobby').classList.toggle('hidden', !(net.active && net.host));
  $('resultWait').classList.toggle('hidden', !client);
  $('result').classList.remove('hidden');
}

// ---------------- pause / menu (multiplayer keeps running underneath) ----------------
function togglePause() {
  if (state !== 'playing' && state !== 'countdown') return;
  if (menuOpen) return closeMenu();
  menuOpen = true; $('pause').classList.remove('hidden'); refreshTouch();
  stopMusic(); pauseAudio(); // all sound and comments stop while the menu is open
  $('pauseNote').classList.toggle('hidden', !net.active);
}
function closeMenu() {
  if (!menuOpen) return;
  closeControls();
  menuOpen = false; $('pause').classList.add('hidden'); refreshTouch();
  resumeAudio();
  if (state === 'playing') startMusic();
  last = performance.now();
}
$('btnResume').onclick = () => closeMenu();
$('btnCtlPause').onclick = () => { $('pause').classList.add('hidden'); openControls(() => { if (menuOpen) $('pause').classList.remove('hidden'); refreshTouch(); }); };
$('btnCtlTitle').onclick = () => { $('title').classList.add('hidden'); openControls(() => $('title').classList.remove('hidden')); };
$('btnQuit').onclick = () => { closeMenu(); stopMusic(); quitToTitle(); };
$('btnAgain').onclick = () => { hideScreens(); if (net.active) hostStart(levelIdx); else startGame(levelIdx); };
$('btnNext').onclick = () => { hideScreens(); if (net.active) hostStart(levelIdx + 1); else startGame(levelIdx + 1); };
$('btnLevels').onclick = () => { hideScreens(); showLevels(); };
$('btnLobby').onclick = () => { hideScreens(); broadcast({ t: 'lobby' }); showLobby(); };

function hideScreens() { for (const id of ['title', 'levels', 'mp', 'result', 'pause', 'waitHost']) $(id).classList.add('hidden'); }
function quitToTitle() {
  stopLobbyTimers();
  if (net.active) leave();
  closeStory(); hideScreens(); clearEntities();
  state = 'title'; menuOpen = false;
  $('hud').classList.add('hidden'); $('countdown').classList.add('hidden'); refreshTouch(); stopMusic();
  useRunners(SEATS);
  runners.forEach(r => { r.human = r.idx === 0; r.remote = false; r.netName = ''; });
  player = runners[0];
  setupLevel(levelIdx); resetRace();
  $('title').classList.remove('hidden');
}

// ---------------- level select ----------------
function showLevels() {
  state = 'levels';
  const un = unlocked();
  levelTitles();
  $('levelGrid').innerHTML = LEVELS.map((lv, i) => `<button class="lvl${i > un ? ' locked' : ''}" data-i="${i}" ${i > un ? 'disabled' : ''}>
      <span class="num">${bnNum(i + 1)}</span><b>${lv.bn}</b><em>${lv.tags}</em>
      <span class="len">${bnNum(lv.segments.reduce((a, s) => a + s.len, 0))} মিটার${i > un ? ' · 🔒' : ''}</span></button>`).join('');
  $('levelGrid').querySelectorAll('.lvl').forEach(b => b.onclick = () => startGame(+b.dataset.i));
  $('levels').classList.remove('hidden');
}
setVoice(setting('voice'));
addEventListener('voicesetting', e => setVoice(e.detail));
$('btnPlay').onclick = () => { initAudio(); $('title').classList.add('hidden'); showLevels(); };
$('btnLevelsBack').onclick = () => { $('levels').classList.add('hidden'); state = 'title'; $('title').classList.remove('hidden'); };

// ================= MULTIPLAYER =================
// The room creator (host) runs the simulation — AI fills empty seats — and streams snapshots + events.
// Everyone else renders what the host sends and sends back their controls.
const roster = []; // [{slot, name, human, conn}]
let snapT = 0, inputT = 0, lastSnap = null, lastSnapAt = 0;
function myName() { return ($('mpName').value || '').trim().slice(0, 14) || menuText('#mpName@placeholder') || 'পল্টু'; }
function rosterMsg() { return { t: 'roster', level: levelIdx, roster: roster.map(r => ({ slot: r.slot, name: r.name, human: r.human })) }; }
// four ways to play: alone (btnPlay), a friends' room with a code, a match with strangers online, a Wi-Fi / hotspot room
let mpMode = 'room', lanPoll = 0, autoT = 0, autoTimer = 0;
const privateRoom = () => net.mode === 'room' || net.mode === 'lan'; // friends only: 2–8 players, no computer runners
const MP_TEXT = mode => split(((TEXTS.rooms || {})[mode]) || ({ room: 'বন্ধুদের রুম', match: 'অনলাইন ম্যাচ', lan: 'Wi-Fi / হটস্পট রুম' })[mode]);
function showMP(mode = 'room') {
  state = 'lobby'; mpMode = mode;
  $('mpName').value = (setting('name') && !['বন্ধু', 'Poltu'].includes(setting('name'))) ? setting('name') : (menuText('#mpName@placeholder') || 'পল্টু'); // default name, typed in the box
  $('mpTitle').textContent = MP_TEXT(mode)[0]; $('mpTag').textContent = MP_TEXT(mode)[1];
  $('mpNameRow').classList.remove('hidden');
  $('mpStart').classList.toggle('hidden', mode !== 'room'); $('mpFind').classList.toggle('hidden', mode !== 'match');
  $('mpLan').classList.add('hidden'); $('mpLobby').classList.add('hidden'); $('mpStatus').textContent = '';
  $('mp').classList.remove('hidden');
  if (mode === 'lan') lanAvailable().then(ok => {
    if (mpMode !== 'lan' || net.active) return;
    if (ok) { // served by server.js on this network: rooms work with no internet
      $('mpLan').classList.remove('hidden'); refreshLanRooms(); clearInterval(lanPoll); lanPoll = setInterval(refreshLanRooms, 2000);
    } else { // plain web page: use a normal room — data still goes phone-to-phone over the shared Wi-Fi
      $('mpStart').classList.remove('hidden');
    }
  });
}
async function refreshLanRooms() {
  const list = await lanRooms();
  $('mpLanRooms').innerHTML = list.length ? list.map(r => `<li><button class="ghost" data-room="${r.code}">📶 ${escapeHTML(r.name)} <small>${bnNum(r.players)} জন · ${r.code}</small></button></li>`).join('')
    : '<li class="empty">এখনও কোনো রুম নেই</li>';
  $('mpLanRooms').querySelectorAll('[data-room]').forEach(b => b.onclick = () => joinByCode('L-' + b.dataset.room));
}
function stopLobbyTimers() { clearInterval(lanPoll); lanPoll = 0; clearInterval(autoTimer); autoTimer = 0; }
$('btnMP').onclick = () => { initAudio(); $('title').classList.add('hidden'); showMP('room'); };
$('btnMatch').onclick = () => { initAudio(); $('title').classList.add('hidden'); showMP('match'); };
$('btnLan').onclick = () => { initAudio(); $('title').classList.add('hidden'); showMP('lan'); };
$('mpBack').onclick = () => { stopLobbyTimers(); if (net.active) leave(); $('mp').classList.add('hidden'); state = 'title'; $('title').classList.remove('hidden'); };
const mpErr = e => { $('mpStatus').textContent = '❌ ' + (e && e.message || 'যোগাযোগ হল না — আবার চেষ্টা করো'); };
function hostHandlers() {
  return {
    onJoin: conn => {
      if (privateRoom()) { // friends: add a seat (lowest free number), up to 8
        const used = new Set(roster.map(r => r.slot)), slot = [...Array(ROOM_MAX).keys()].find(i => !used.has(i));
        if (slot === undefined || !(state === 'lobby' || state === 'results')) { sendTo(conn, { t: 'full' }); setTimeout(() => conn.close(), 300); return; }
        roster.push({ slot, name: 'বন্ধু ' + (slot + 1), human: true, conn });
        sendTo(conn, { t: 'welcome', slot });
        broadcast(rosterMsg()); renderLobby(); return;
      }
      const free = roster.find(r => !r.human);
      if (!free || !(state === 'lobby' || state === 'results')) { sendTo(conn, { t: 'full' }); setTimeout(() => conn.close(), 300); return; }
      Object.assign(free, { human: true, conn, name: 'বন্ধু ' + free.slot });
      sendTo(conn, { t: 'welcome', slot: free.slot });
      broadcast(rosterMsg()); renderLobby();
    },
    onData: (conn, m) => hostOnData(conn, m),
    onLeave: conn => {
      const r = roster.find(x => x.conn === conn); if (!r) return;
      const who = r.name;
      if (privateRoom()) { // no computer takes over: the runner just leaves the race
        roster.splice(roster.indexOf(r), 1);
        const rn = runners[r.slot];
        if (rn && state !== 'lobby') { Object.assign(rn, { human: false, remote: false, gone: true, z: -9999 }); rn.m.root.visible = false; }
        if (state === 'playing') showBanner(`${who} চলে গেল`, '', 2);
        broadcast(rosterMsg()); renderLobby(); return;
      }
      Object.assign(r, { human: false, conn: null, name: CHARS[r.slot].name });
      const rn = runners[r.slot]; rn.human = false; rn.remote = false; rn.netName = '';
      if (state === 'playing') showBanner(`${who} চলে গেল`, 'এবার কম্পিউটার দৌড়বে', 2);
      broadcast(rosterMsg()); renderLobby();
    },
    onError: e => console.warn('peer error', e),
  };
}
function becomeHost() {
  $('mpStatus').textContent = '';
  roster.length = 0;
  if (privateRoom()) roster.push({ slot: 0, name: myName(), human: true, conn: null });
  else for (let i = 0; i < SEATS; i++) roster.push({ slot: i, name: i === 0 ? myName() : CHARS[i].name, human: i === 0, conn: null });
  showLobby();
}
const clientHandlers = () => ({ onData: clientOnData, onClose: () => { alert('হোস্ট রুম ছেড়ে চলে গেছে।'); quitToTitle(); } });
$('mpCreate').onclick = async () => {
  setSetting('name', myName());
  $('mpStatus').textContent = 'রুম বানানো হচ্ছে…';
  try { await hostRoom(hostHandlers()); becomeHost(); } catch (e) { mpErr(e); }
};
$('mpLanCreate').onclick = async () => {
  setSetting('name', myName());
  $('mpStatus').textContent = 'Wi-Fi রুম বানানো হচ্ছে…';
  try { await lanHost(hostHandlers(), myName()); stopLobbyTimers(); becomeHost(); } catch (e) { mpErr(e); }
};
async function joinByCode(code) {
  setSetting('name', myName());
  $('mpStatus').textContent = 'যোগ দেওয়া হচ্ছে ' + code.replace(/^L-/, '') + '…';
  try {
    await joinRoom(code, clientHandlers());
    stopLobbyTimers();
    send({ t: 'hello', name: myName() });
    $('mpStatus').textContent = '✅ যুক্ত হয়েছ — হোস্টের অপেক্ষায়';
  } catch (e) { mpErr(e); }
}
$('mpJoin').onclick = () => {
  const code = $('mpCode').value.trim().toUpperCase();
  if (code.length < 4) { $('mpStatus').textContent = 'রুম কোড লেখো'; return; }
  joinByCode(code);
};
$('mpSearch').onclick = async () => {
  setSetting('name', myName());
  $('mpSearch').disabled = true;
  try {
    const r = await findMatch(hostHandlers(), clientHandlers(), t => { $('mpStatus').textContent = t; });
    if (r.host) { becomeHost(); $('mpStatus').textContent = ''; }
    else { send({ t: 'hello', name: myName() }); $('mpStatus').textContent = '✅ ম্যাচ পাওয়া গেছে — শুরু হওয়ার অপেক্ষায়'; }
  } catch (e) { mpErr(e); } finally { $('mpSearch').disabled = false; }
};
function showLobby() {
  state = 'lobby';
  $('mp').classList.remove('hidden');
  $('mpStart').classList.add('hidden'); $('mpLobby').classList.remove('hidden');
  $('mpCodeShow').textContent = net.code.replace(/^L-/, '');
  $('mpNameRow').classList.add('hidden'); $('mpFind').classList.add('hidden'); $('mpLan').classList.add('hidden');
  $('mpCodeRow').classList.toggle('hidden', net.mode === 'public'); $('mpCopy').classList.toggle('hidden', net.mode === 'public');
  $('mpAuto').textContent = '';
  if (net.mode === 'public' && net.host && !autoTimer) { // strangers: start by itself after a short wait
    autoT = 30;
    autoTimer = setInterval(() => {
      if (state !== 'lobby' || !net.active) { clearInterval(autoTimer); autoTimer = 0; return; }
      autoT--;
      const humansIn = roster.filter(r => r.human).length;
      $('mpAuto').textContent = humansIn >= SEATS ? 'সবাই এসে গেছে!' : `আরও খেলোয়াড়ের অপেক্ষা… ${bnNum(Math.max(0, autoT))} সেকেন্ডে শুরু`;
      if (autoT <= 0 || humansIn >= SEATS) { clearInterval(autoTimer); autoTimer = 0; hostStart((Math.random() * LEVELS.length) | 0); }
    }, 1000);
  }
  $('mpHostCtl').classList.toggle('hidden', !net.host);
  $('mpWaitMsg').classList.toggle('hidden', net.host);
  $('mpLevel').innerHTML = LEVELS.map((lv, i) => `<option value="${i}" ${i === levelIdx ? 'selected' : ''}>${bnNum(i + 1)}. ${lv.bn}</option>`).join('');
  if (net.host) renderLobby();
}
function renderLobby(list = roster) {
  const n = list.filter(r => r.human).length, priv = privateRoom();
  if (net.host) { $('mpGo').disabled = priv && n < ROOM_MIN; $('mpAuto').textContent = priv && n < ROOM_MIN ? `আরও বন্ধুর অপেক্ষা… কমপক্ষে ${bnNum(ROOM_MIN)} জন লাগবে` : ''; }
  $('mpPlayers').innerHTML = `<li class="cnt">👥 <b>${bnNum(n)} / ${bnNum(priv ? ROOM_MAX : SEATS)}</b> জন খেলোয়াড় <small>${priv ? `(${bnNum(ROOM_MIN)}–${bnNum(ROOM_MAX)} জন, কম্পিউটার নেই)` : '(বাকিরা 🤖 কম্পিউটার)'}</small></li>` + list.slice().sort((a, b) => a.slot - b.slot).map(r => `<li><span class="sw" style="background:${CHARS[r.slot].color}"></span>
    ${r.human ? '👤' : '🤖'} <b>${escapeHTML(r.name)}</b>${r.slot === net.mySlot ? ' <small>(তুমি)</small>' : ''}${r.slot === 0 ? ' <small>· হোস্ট</small>' : ''}</li>`).join('');
}
$('mpCopy').onclick = () => {
  const url = `${location.origin}${location.pathname}?room=${net.code}`;
  const done = () => { $('mpCopy').textContent = '✓ কপি হয়েছে'; setTimeout(() => { $('mpCopy').innerHTML = menuText('#mpCopy') || '🔗 আমন্ত্রণ লিঙ্ক কপি করো'; }, 1500); };
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt('আমন্ত্রণ লিঙ্ক:', url)); else prompt('আমন্ত্রণ লিঙ্ক:', url);
};
$('mpLevel').onchange = () => { levelIdx = +$('mpLevel').value; broadcast(rosterMsg()); };
$('mpGo').onclick = () => hostStart(+$('mpLevel').value);
$('mpLeave').onclick = () => { stopLobbyTimers(); leave(); quitToTitle(); };

function applyRosterToRunners(list) {
  useRunners(list.length);
  for (const r of list) {
    const rn = runners[r.slot];
    rn.human = r.human; rn.remote = r.human && r.slot !== net.mySlot; rn.netName = r.human ? r.name : '';
  }
  player = runners[net.mySlot];
}
function hostStart(idx) {
  if (privateRoom()) {
    if (roster.length < ROOM_MIN) { hideScreens(); closeStory(); clearEntities(); $('hud').classList.add('hidden'); showLobby(); return; } // a friend left: wait in the lobby
    roster.sort((a, b) => a.slot - b.slot).forEach((r, i) => { // close the gaps so the seats are 1…N
      if (r.slot !== i) { r.slot = i; if (r.conn) sendTo(r.conn, { t: 'welcome', slot: i }); }
    });
  }
  const pickS = chooseStory(idx);
  applyRosterToRunners(roster);
  broadcast({ t: 'start', level: idx, pick: pickS, roster: roster.map(r => ({ slot: r.slot, name: r.name, human: r.human })) });
  for (const k in remoteIn) delete remoteIn[k];
  OUT.length = 0;
  startGame(idx, pickS);
}
function hostOnData(conn, m) {
  const r = roster.find(x => x.conn === conn); if (!r) return;
  const ri = remoteIn[r.slot] || (remoteIn[r.slot] = {});
  if (m.t === 'hello') { r.name = String(m.name || 'Poltu').slice(0, 14); broadcast(rosterMsg()); renderLobby(); }
  else if (m.t === 'in') { ri.x = typeof m.x === 'number' ? clamp(m.x, -1, 1) : null; ri.l = m.l; ri.r = m.r; ri.s = m.s; ri.d = m.d; }
  else if (m.t === 'a' && (m.a === 'jump' || m.a === 'attack')) ri[m.a] = true;
}
function clientOnData(m) {
  switch (m.t) {
    case 'welcome': net.mySlot = m.slot; break;
    case 'full': $('mpStatus').textContent = '❌ রুম ভর্তি, বা দৌড় শুরু হয়ে গেছে'; break;
    case 'roster':
      levelIdx = m.level;
      if (state === 'lobby' || state === 'title') { showLobby(); renderLobby(m.roster); $('mpLevelShow').textContent = `${m.level + 1}. ${LEVELS[m.level].en}`; }
      break;
    case 'start': hideScreens(); applyRosterToRunners(m.roster); lastSnap = null; startGame(m.level, m.pick); break;
    case 'go': goReceived = true; if (!$('waitHost').classList.contains('hidden')) startCountdown(); else if (state === 'story') closeStory(); break;
    case 's': lastSnap = m; lastSnapAt = performance.now(); break;
    case 'e': if (state === 'story' || state === 'countdown' || state === 'playing') for (const ev of m.l) applyEvent(ev); break;
    case 'end': closeStory(); showEnding(m.order, m.times); break;
    case 'lobby': closeStory(); hideScreens(); $('hud').classList.add('hidden'); clearEntities(); showLobby(); break;
  }
}
function applyEvent(e) {
  switch (e.e) {
    case 'ob': createObstacle(e); break;
    case 'pk': createPickup(e); break;
    case 'pt': { const k = pkById.get(e.id); if (k) removePickup(k); break; }
    case 'pr': addProjectile(e); break;
    case 'tk': { const o = resolveRef(e.k, e.i); bubble(o, L(e.c), e.l, e.y, e.c === 'fall' && o !== player); break; }
    case 'tx': bubble(resolveRef(e.k, e.i), e.x, e.l, e.y); break;
    case 'pw': powLocal(e.x, e.y, e.z, e.t); break;
    case 'sx': if (e.w >= 0 ? e.w === player.idx : Math.abs(e.z - player.z) < 25) sfx[e.n] && sfx[e.n](); if (e.n === 'hurt' && e.w === player.idx) shake = 0.3; break;
    case 'bn': showBanner(e.t, e.s, e.d, false); break;
    case 'dg': e.l.forEach(addDog); dogTime = 12; setMusicFast(true); break;
    case 'bs': brawl = { t: 10, s: e.s, lat: 0, powT: 0 }; onBrawlStart(); break;
    case 'be': brawl = null; brawlCloud.g.visible = false; break;
  }
}
function hostNetTick(dt) {
  if (OUT.length) broadcast({ t: 'e', l: OUT.splice(0) });
  snapT -= dt;
  if (snapT > 0) return;
  snapT = 1 / 15;
  broadcast({
    t: 's', dt: r2(dogTime), br: brawl ? [r2(brawl.t), r2(brawl.s)] : 0,
    rs: runners.map(r => [r2(r.x), r2(r.z), r2(r.y), r2(r.speed), r2(r.vx), r2(r.stun), r2(r.attackT), ATK.indexOf(r.attackType), r.attackSide, r.kickDir,
      Math.round(r.hp), r.stick ? 1 : 0, r.stones, (r.finished ? 1 : 0) | (r.caught ? 2 : 0) | (r.inBrawl ? 4 : 0) | (r.sprinting ? 8 : 0) | (r.tired ? 16 : 0) | (r.duck ? 32 : 0) | (r.gone ? 64 : 0), r2(r.stamina), r2(r.spin), r2(r.ko), r.brawlScore]),
    ob: obstacles.filter(o => o.id && (o.vehicle || o.walker)).map(o => [o.id, r2(o.x), r2(o.z), r2(o.vx)]),
    dg: dogs.map(d => [d.id, r2(d.x), r2(d.z), r2(d.cur), r2(d.want)]),
    fo: finishOrder.map(r => r.idx),
  });
}
function clientTick(dt) {
  inputT -= dt;
  if (inputT <= 0) { inputT = 1 / 15; send({ t: 'in', x: r2(steerAxis()), s: held('sprint'), d: held('duck') }); }
  const snap = lastSnap;
  if (snap) {
    const age = Math.min(0.3, (performance.now() - lastSnapAt) / 1000);
    snap.rs.forEach((a, i) => {
      const r = runners[i];
      const [x, z, y, speed, vx, stun, attackT, at, side, kd, hp, stick, stones, fl, stam, spin, ko, bs] = a;
      r.x += (x + vx * age - r.x) * Math.min(1, dt * 10);
      r.z += speed * dt; r.z += (z + speed * age - r.z) * Math.min(1, dt * 8);
      r.y += (y - r.y) * Math.min(1, dt * 15);
      Object.assign(r, { speed, vx, stun, hp, stick: !!stick, stones, stamina: stam, spin, ko, brawlScore: bs,
        finished: !!(fl & 1), caught: !!(fl & 2), inBrawl: !!(fl & 4), sprinting: !!(fl & 8), tired: !!(fl & 16), duck: !!(fl & 32), gone: !!(fl & 64), inv: 0 });
      if (attackT > 0.15 && r.attackT <= 0) Object.assign(r, { attackT, attackType: ATK[at], attackSide: side, kickDir: kd });
      r.attackT -= dt;
    });
    for (const [id, x, z, vx] of snap.ob) { const o = obById.get(id); if (o) { o.x += (x - o.x) * Math.min(1, dt * 6); o.z += (z - o.z) * Math.min(1, dt * 6); o.vx = vx; } }
    for (const [id, x, z, cur, want] of snap.dg) { const d = dogById.get(id); if (d) { d.x += (x - d.x) * Math.min(1, dt * 8); d.z += (z + cur * age - d.z) * Math.min(1, dt * 8); d.cur = cur; d.want = want; } }
    if (snap.dt <= 0 && dogTime > 0) setMusicFast(false);
    dogTime = snap.dt;
    if (snap.br && brawl) brawl.t = snap.br[0];
    finishOrder = snap.fo.map(i => runners[i]);
  }
  updateObstacles(dt, false);
  updateProjectiles(dt, false);
}

// ---------------- main loop ----------------
let last = performance.now();
function update(dt) {
  raceTime += dt;
  for (const r of runners) updateRunner(r, dt);
  separate();
  updateObstacles(dt, true);
  updateProjectiles(dt, true);
  updateDogs(dt);
  if (brawl) updateBrawl(dt);
  const lead = Math.max(-1e9, ...humans().filter(h => !h.finished).map(h => h.z));
  if (dogEvents.length && lead > dogEvents[0] && !brawl) { dogEvents.shift(); startDogs(); }
  if (brawlEvents.length && lead > brawlEvents[0] && dogTime <= 0) { brawlEvents.shift(); startBrawl(); }
  spawnAhead();
  cleanup();
  checkEnd(dt);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  time += dt;
  pollGamepad();
  if (!world) return;
  const live = !menuOpen || net.active; // single player pauses; multiplayer keeps running
  if (state === 'playing' && live) {
    if (net.active && !net.host) { raceTime += dt; clientTick(dt); cleanup(); }
    else update(dt);
  }
  if (net.active && net.host && (state === 'playing' || state === 'countdown')) hostNetTick(dt);
  if (live) { for (const r of runners) animRunner(r, dt); animDogs(dt); updateDust(dt); }
  if (brawl) animBrawlCloud();
  animSuper();
  updateCamera(dt);
  world.update(player.z - 50, player.z + 190);
  world.followGround(camera.position);
  if (live) { world.animate(dt, player.z); sky.update(dt, camera.position, () => { if (state === 'playing' && !menuOpen) sfx.thunder(); }); }
  if (state === 'countdown' || state === 'playing') updateHUD(dt);
  updateBystanders(dt);
  updateChatter();
  updateLabels(live ? dt : 0);
  renderer.render(scene, camera);
}

// ---------------- boot ----------------
async function boot() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 40px "Noto Sans Bengali"', 'বন্ধু দৌড়'), document.fonts.load('600 40px "Noto Sans Bengali"', 'বন্ধু দৌড়')]),
      new Promise(r => setTimeout(r, 4000)),
    ]);
  } catch (e) { /* fall back to system font */ }
  CHARS.forEach((c, i) => ALL_RUNNERS.push(new Runner(c, i)));
  useRunners(SEATS);
  player = runners[0];
  setupLevel(0);
  resetRace();
  $('loading').classList.add('hidden'); // nothing to say once it's loaded
  $('btnPlay').disabled = false;
  const room = new URLSearchParams(location.search).get('room');
  if (room) { $('title').classList.add('hidden'); showMP(room.startsWith('L-') ? 'lan' : 'room'); $('mpStart').classList.remove('hidden'); $('mpCode').value = room.toUpperCase(); }
  requestAnimationFrame(frame);
}
applyMenu(); // menu and button labels from texts.json
$('btnPlay').disabled = true;

// ---------------- installable app (PWA) ----------------
if (!window.__DEV__ && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'))
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('service worker', e)));
let installPrompt = null;
const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('btnInstall').classList.remove('hidden'); });
addEventListener('appinstalled', () => { installPrompt = null; $('btnInstall').classList.add('hidden'); });
$('btnInstall').onclick = async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => null);
  installPrompt = null; $('btnInstall').classList.add('hidden');
};
if (!standalone && /iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent)) $('iosInstall').classList.remove('hidden'); // Safari has no install prompt
boot();
