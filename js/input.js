// Unified input: keyboard + gamepad + touch, with remappable bindings saved to localStorage.
const STORE = 'buddyrace.controls.v1';
export const isTouchDevice = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export const ACTIONS = [
  { id: 'left', bn: 'Move left', en: 'Steer left', hold: true },
  { id: 'right', bn: 'Move right', en: 'Steer right', hold: true },
  { id: 'sprint', bn: 'Sprint', en: 'Hold to run fast', hold: true },
  { id: 'jump', bn: 'Jump', en: 'Jump over things' },
  { id: 'duck', bn: 'Crawl', en: 'Hold to crawl under ladders, beams, fallen trees', hold: true },
  { id: 'attack', bn: 'Hit', en: 'Slap · kick · stick · throw' },
  { id: 'cam', bn: 'Camera', en: 'Change camera' },
  { id: 'pause', bn: 'Pause', en: 'Open the menu' },
  { id: 'mute', bn: 'Mute', en: 'Sound on / off' },
];
const HOLD = new Set(ACTIONS.filter(a => a.hold).map(a => a.id));

const DEFAULTS = {
  keys: { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], sprint: ['Shift', 'ArrowUp'], jump: ['Space', ''], duck: ['KeyS', 'ArrowDown'],
    attack: ['Control', 'KeyF'], cam: ['KeyC', ''], pause: ['Escape', 'KeyP'], mute: ['KeyM', ''] },
  // standard gamepad mapping: b0=A b1=B b2=X b3=Y b4=LB b5=RB b6=LT b7=RT b9=Start b14/15=D-pad ←/→, a0=left stick X
  pad: { left: ['a0-', 'b14'], right: ['a0+', 'b15'], sprint: ['b7', 'b5'], jump: ['b0', ''], duck: ['b1', 'b13'], attack: ['b2', ''],
    cam: ['b3', ''], pause: ['b9', ''], mute: ['b8', ''] },
  touch: { mode: 'auto', scheme: 'gyro', size: 1, opacity: 0.9, leftHanded: false, gyroLevel: 4, gyroInvert: false, gyroTilt: true, gyroTiltInvert: false },
  game: { slang: 2, slangChosen: false, bystanders: true, voice: true, name: '' }, // slang is on unless the player turns it off
};
const clone = o => JSON.parse(JSON.stringify(o));
let cfg = load();
function load() {
  const c = clone(DEFAULTS);
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (s) for (const k of ['keys', 'pad', 'touch', 'game']) Object.assign(c[k], s[k] || {});
    if (c.game.slang === 1) c.game.slang = 2; // old 3-step setting → on
    if ('gyroSens' in c.touch) { // old setting was 'degrees for a full turn'; 25 was the old default → now the gentler level 4
      c.touch.gyroLevel = c.touch.gyroSens === 25 ? 4 : Math.max(1, Math.min(10, Math.round((48 - c.touch.gyroSens) / 3.8))); delete c.touch.gyroSens;
    }
    if ((c.pad.attack || []).includes('b1') && (c.pad.duck || []).includes('b1')) c.pad.attack = c.pad.attack.map(b => (b === 'b1' ? '' : b)); // B is crawl now
    if ('foul' in c.game) { if (c.game.slang == null || !('slang' in (s.game || {}))) c.game.slang = c.game.foul ? 2 : 0; delete c.game.foul; }
    if (!c.game.slangChosen) c.game.slang = 2; // never picked in Settings (older saves stored the old default, off) → on
  } catch (e) { /* storage blocked — use defaults */ }
  return c;
}
function save() { try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch (e) { /* ignore */ } }

// ---------- state ----------
const kbDown = new Set();
const touchHeld = {};
const padHeld = {};
let handler = () => {};
let capture = null; // { type: 'key' | 'pad', action, slot, base }
let panelOpen = false, onPanelClose = null, activeTab = 'game';

const normKey = c => c.replace(/^(Shift|Control|Alt|Meta)(Left|Right)$/, '$1');
export function held(a) {
  if (padHeld[a] || touchHeld[a]) return true;
  for (const k of cfg.keys[a] || []) if (k && kbDown.has(k)) return true;
  return false;
}
export const touchEnabled = () => cfg.touch.mode === 'on' || (cfg.touch.mode === 'auto' && isTouchDevice);
export const isPanelOpen = () => panelOpen;
export const setting = k => cfg.game[k];
export function setSetting(k, v) { cfg.game[k] = v; save(); }

// ---------- names ----------
const KEYNAMES = { Space: 'Space', Control: 'Ctrl', Shift: 'Shift', Alt: 'Alt', Meta: 'Meta', Escape: 'Esc', Enter: 'Enter', Tab: 'Tab',
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Backquote: '`', Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/',
  Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\' };
export function keyName(c) {
  if (!c) return '—';
  if (KEYNAMES[c]) return KEYNAMES[c];
  return c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
}
const PADNAMES = ['A / ✕', 'B / ○', 'X / □', 'Y / △', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L-stick press', 'R-stick press', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →', 'Home'];
const AXISNAMES = { 'a0-': 'L-stick ←', 'a0+': 'L-stick →', 'a1-': 'L-stick ↑', 'a1+': 'L-stick ↓', 'a2-': 'R-stick ←', 'a2+': 'R-stick →', 'a3-': 'R-stick ↑', 'a3+': 'R-stick ↓' };
export function padName(b) {
  if (!b) return '—';
  if (b[0] === 'a') return AXISNAMES[b] || b;
  return PADNAMES[+b.slice(1)] || 'Button ' + b.slice(1);
}
export function bindingLabel(a) {
  return (cfg.keys[a] || []).filter(Boolean).map(keyName).join(' / ') || '—';
}

// ---------- keyboard ----------
function actionsForKey(code) { return ACTIONS.filter(a => (cfg.keys[a.id] || []).includes(code)).map(a => a.id); }
addEventListener('keydown', e => {
  const code = normKey(e.code);
  if (capture && capture.type === 'key') {
    e.preventDefault();
    if (code === 'Escape') { capture = null; renderPanel(); return; }
    assign('keys', capture.action, capture.slot, (code === 'Backspace' || code === 'Delete') ? '' : code);
    return;
  }
  if (capture && code === 'Escape') { e.preventDefault(); capture = null; renderPanel(); return; }
  const acts = actionsForKey(code);
  if (!acts.length) return;
  e.preventDefault();
  if (kbDown.has(code)) return; // auto-repeat
  kbDown.add(code);
  for (const a of acts) if (!HOLD.has(a)) handler(a);
});
addEventListener('keyup', e => kbDown.delete(normKey(e.code)));
addEventListener('blur', () => { kbDown.clear(); for (const k in touchHeld) touchHeld[k] = false; });

// ---------- touch ----------
// Three mobile layouts (Settings → মোবাইল): 'slider' (drag bar on the left), 'gyro' (tilt the phone), 'buttons' (◀ ▶).
let sliderVal = 0, gyroVal = 0, gyroRoll = null, gyroZero = null, gyroOn = false;
function initTouch() {
  document.querySelectorAll('#touch [data-k]').forEach(btn => {
    const a = btn.dataset.k;
    const down = e => {
      e.preventDefault(); btn.setPointerCapture?.(e.pointerId); btn.classList.add('on');
      touchHeld[a] = true; if (!HOLD.has(a)) handler(a);
    };
    const up = e => { e.preventDefault(); btn.classList.remove('on'); touchHeld[a] = false; };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up); btn.addEventListener('lostpointercapture', up);
  });
  // Slide gestures (Slide and Gyro layouts), anywhere on the screen that isn't a button:
  //   slide left / right (keep the finger down) = steer · swipe up = jump · swipe down = crawl (while the finger stays down)
  // Each finger is separate, so one thumb can steer while the other swipes.
  const zone = document.getElementById('zone');
  const STEER_PX = 70, SWIPE = 34, fingers = new Map();
  zone.addEventListener('pointerdown', e => {
    if (cfg.touch.scheme === 'buttons') return;
    e.preventDefault(); zone.setPointerCapture?.(e.pointerId);
    fingers.set(e.pointerId, { x0: e.clientX, y0: e.clientY, cx: e.clientX, mode: '', duckT: 0 });
  });
  zone.addEventListener('pointermove', e => {
    const f = fingers.get(e.pointerId); if (!f) return;
    const dx = e.clientX - f.x0, dy = e.clientY - f.y0;
    if (!f.mode) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) { f.mode = 'steer'; f.cx = f.x0; showStick(f.x0, f.y0); }
      else if (Math.abs(dy) > SWIPE && Math.abs(dy) > Math.abs(dx)) {
        if (dy < 0) { f.mode = 'jump'; handler('jump'); flash('⤒'); }
        else { f.mode = 'duck'; touchHeld.duck = true; f.duckT = performance.now(); flash('⤓'); }
      }
    }
    if (f.mode === 'steer') {
      let d = (e.clientX - f.cx) / STEER_PX;
      if (Math.abs(d) > 1) { f.cx = e.clientX - Math.sign(d) * STEER_PX; d = Math.sign(d); } // the centre follows the finger: reversing is instant
      sliderVal = Math.max(-1, Math.min(1, d)); moveStick(sliderVal);
    }
  });
  const rel = e => {
    const f = fingers.get(e.pointerId); if (!f) return;
    fingers.delete(e.pointerId);
    if (f.mode === 'steer' && ![...fingers.values()].some(o => o.mode === 'steer')) { sliderVal = 0; hideStick(); }
    if (f.mode === 'duck' && ![...fingers.values()].some(o => o.mode === 'duck')) {
      const left = 650 - (performance.now() - f.duckT); // a quick flick still crawls for a moment
      if (left > 0) setTimeout(() => { if (![...fingers.values()].some(o => o.mode === 'duck')) touchHeld.duck = false; }, left); else touchHeld.duck = false;
    }
  };
  zone.addEventListener('pointerup', rel); zone.addEventListener('pointercancel', rel); zone.addEventListener('lostpointercapture', rel);
  applyTouch();
}
const stickEl = () => document.getElementById('stick');
function showStick(x, y) { const k = stickEl(); if (!k) return; k.style.left = x + 'px'; k.style.top = y + 'px'; k.classList.add('on'); moveStick(0); }
function moveStick(v) { const k = stickEl(); if (k) k.firstElementChild.style.transform = `translateX(${v * 34}px)`; }
function hideStick() { const k = stickEl(); if (k) k.classList.remove('on'); }
function flash(t) { const f = document.getElementById('swipeFx'); if (!f) return; f.textContent = t; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
function applyTouch() {
  const t = document.getElementById('touch');
  t.style.setProperty('--tsize', cfg.touch.size);
  t.style.setProperty('--topa', cfg.touch.opacity);
  t.classList.toggle('lefty', !!cfg.touch.leftHanded);
  for (const k of ['slider', 'gyro', 'buttons']) t.classList.toggle('scheme-' + k, cfg.touch.scheme === k);
  if (cfg.touch.scheme === 'gyro') startGyro(); else gyroVal = 0;
}

// gyro: the phone is a steering wheel. Uses gravity from devicemotion, measured in screen space so it works in either landscape.
function onMotion(e) {
  const g = e.accelerationIncludingGravity; if (!g || g.x == null) return;
  const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  let sx, sy;
  const gz = g.z || 0;
  switch (((ang % 360) + 360) % 360) {
    case 90: sx = -g.y; sy = g.x; break;
    case 270: sx = g.y; sy = -g.x; break;
    case 180: sx = -g.x; sy = -g.y; break;
    default: sx = g.x; sy = g.y;
  }
  const roll = Math.atan2(sx, sy);
  gyroRoll = gyroRoll == null ? roll : gyroRoll + wrap(roll - gyroRoll) * 0.35; // smooth
  if (gyroZero == null) gyroZero = gyroRoll;
  const deg = -wrap(gyroRoll - gyroZero) * 180 / Math.PI;
  let v = deg / gyroDegrees();
  if (Math.abs(v) < 0.08) v = 0;
  gyroVal = Math.max(-1, Math.min(1, v)) * (cfg.touch.gyroInvert ? -1 : 1);
  const ind = document.getElementById('gyroInd'); if (ind) ind.style.transform = `rotate(${Math.max(-45, Math.min(45, gyroVal * 45))}deg)`;
  // tilt up / down: top edge towards you = jump, away from you = crawl (relative to how you usually hold it)
  const pitch = Math.atan2(gz, Math.hypot(sx, sy)) * 180 / Math.PI * (cfg.touch.gyroTiltInvert ? -1 : 1);
  gyroPitch = gyroPitch == null ? pitch : gyroPitch + (pitch - gyroPitch) * 0.4;
  if (pitchZero == null) pitchZero = gyroPitch;
  const dp = gyroPitch - pitchZero, T = 22;
  if (Math.abs(dp) < T * 0.4) pitchZero += dp * 0.02; // slowly follows the way you hold the phone
  if (!cfg.touch.gyroTilt || cfg.touch.scheme !== 'gyro') { tiltDuck(false); return; }
  if (dp < -T && !tiltJumped) { tiltJumped = true; handler('jump'); flash('⤒'); }
  else if (dp > -T * 0.4) tiltJumped = false;
  tiltDuck(dp > T || (tiltDucking && dp > T * 0.5));
}
let gyroPitch = null, pitchZero = null, tiltJumped = false, tiltDucking = false;
function tiltDuck(on) {
  if (on === tiltDucking) return;
  tiltDucking = on; touchHeld.duck = on; if (on) flash('⤓');
}
// sensitivity 1 (gentle: big tilt for a full turn) … 10 (twitchy)
export const gyroDegrees = () => 48 - Math.max(1, Math.min(10, cfg.touch.gyroLevel || 4)) * 3.8;
export function gyroSensitivity(step) {
  if (step) { cfg.touch.gyroLevel = Math.max(1, Math.min(10, (cfg.touch.gyroLevel || 4) + step)); save(); }
  return cfg.touch.gyroLevel || 4;
}
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export async function startGyro() { // must be called from a tap on iPhone (permission prompt)
  if (gyroOn || cfg.touch.scheme !== 'gyro') return gyroOn;
  if (!('DeviceMotionEvent' in window)) return false;
  try {
    if (typeof DeviceMotionEvent.requestPermission === 'function' && await DeviceMotionEvent.requestPermission() === 'denied') return false;
    addEventListener('devicemotion', onMotion); gyroOn = true;
  } catch (e) { addEventListener('devicemotion', onMotion); } // no tap yet (iPhone): listen anyway, ask again on the next tap
  return gyroOn;
}
export function calibrateGyro() { gyroZero = gyroRoll; pitchZero = gyroPitch; }
export function recenterGyro() { gyroRoll = null; gyroZero = null; gyroPitch = null; pitchZero = null; } // next reading becomes "straight"
export const gyroWorking = () => gyroRoll != null;
export const gyroDebug = () => ({ gyroRoll, gyroZero, gyroVal });

// steering axis: -1 (left) … +1 (right), combining keys, gamepad stick, slider and gyro
export function steerAxis() {
  let v = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
  const p = activePad();
  if (p && Math.abs(p.axes[0] || 0) > 0.15 && (cfg.pad.left.includes('a0-') || cfg.pad.right.includes('a0+'))) v = p.axes[0];
  if (touchEnabled()) {
    if (cfg.touch.scheme === 'gyro' && gyroVal) v = gyroVal;
    if (cfg.touch.scheme !== 'buttons' && sliderVal) v = sliderVal; // a slide on the screen overrides the tilt
  }
  return Math.max(-1, Math.min(1, v));
}

// ---------- gamepad ----------
let padId = '';
const padPrev = {};
function activePad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p && p.connected) return p;
  return null;
}
function padInputOn(p, b) {
  if (!b) return false;
  if (b[0] === 'a') {
    const v = p.axes[+b.slice(1, -1)] || 0;
    return b.endsWith('-') ? v < -0.5 : v > 0.5;
  }
  const btn = p.buttons[+b.slice(1)];
  return !!btn && (btn.pressed || btn.value > 0.5);
}
function padSnapshot(p) {
  const s = new Set();
  p.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.5) s.add('b' + i); });
  p.axes.forEach((v, i) => { if (v < -0.6) s.add(`a${i}-`); if (v > 0.6) s.add(`a${i}+`); });
  return s;
}
export function pollGamepad() {
  const p = activePad();
  const id = p ? p.id : '';
  if (id !== padId) { padId = id; if (panelOpen && activeTab === 'pad') renderPanel(); }
  if (!p) { for (const a in padHeld) padHeld[a] = false; return; }
  if (capture && capture.type === 'pad') {
    const now = padSnapshot(p);
    if (!capture.base) capture.base = now;
    for (const b of now) if (!capture.base.has(b)) { assign('pad', capture.action, capture.slot, b); return; }
    for (const b of [...capture.base]) if (!now.has(b)) capture.base.delete(b);
    return;
  }
  for (const a of ACTIONS) {
    const on = (cfg.pad[a.id] || []).some(b => padInputOn(p, b));
    if (on && !padPrev[a.id] && !a.hold) handler(a.id);
    padPrev[a.id] = on; padHeld[a.id] = on;
  }
}

function assign(kind, action, slot, value) {
  if (value) for (const a in cfg[kind]) cfg[kind][a] = cfg[kind][a].map(v => (v === value ? '' : v)); // no duplicates
  cfg[kind][action][slot] = value;
  capture = null; save(); renderPanel(); renderKeyHelp();
}

// ---------- help text on title screen ----------
export function renderKeyHelp() {
  const el = document.getElementById('keysHelp');
  if (!el) return;
  const rows = [['sprint', 'জোরে দৌড় (চেপে রাখো)'], ['left', 'বাঁদিকে'], ['right', 'ডানদিকে'], ['jump', 'লাফ'], ['duck', 'হামাগুড়ি (চেপে রাখো)'],
    ['attack', 'চড় · লাথি · লাঠি · পাথর'], ['cam', 'ক্যামেরা'], ['pause', 'মেনু / বিরতি'], ['mute', 'শব্দ']];
  el.innerHTML = rows.map(([a, t]) => `<div><b>${bindingLabel(a)}</b> ${t}</div>`).join('') +
    '<div class="span2">🪨🪵🍬 পাথর, লাঠি, রসগোল্লা — উপর দিয়ে দৌড়লেই তুলে নেবে · 🎮 গেমপ্যাডও চলবে</div>';
}

// ---------- controls panel ----------
export function openControls(onClose) {
  panelOpen = true; onPanelClose = onClose; capture = null;
  document.getElementById('controls').classList.remove('hidden');
  renderPanel();
}
export function closeControls() {
  if (!panelOpen) return;
  panelOpen = false; capture = null;
  document.getElementById('controls').classList.add('hidden');
  const cb = onPanelClose; onPanelClose = null; cb && cb();
}

function rowsHTML(kind) {
  return ACTIONS.map(a => {
    const slots = cfg[kind][a.id] || ['', ''];
    const cell = i => {
      const cap = capture && capture.type === (kind === 'keys' ? 'key' : 'pad') && capture.action === a.id && capture.slot === i;
      const label = cap ? (kind === 'keys' ? 'Press a key…' : 'Press a button…') : (kind === 'keys' ? keyName(slots[i]) : padName(slots[i]));
      return `<button class="bind${cap ? ' cap' : ''}" data-kind="${kind}" data-a="${a.id}" data-s="${i}">${label}</button>`;
    };
    return `<div class="bindRow"><span><b>${a.bn}</b><small>${a.en}</small></span>${cell(0)}${cell(1)}</div>`;
  }).join('');
}

function renderPanel() {
  if (!panelOpen) return;
  const body = document.getElementById('ctlBody');
  document.querySelectorAll('#controls [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === activeTab));
  if (activeTab === 'game') {
    const g = cfg.game;
    body.innerHTML = `
      <div class="setRow"><span><b>Bengali slang (গালাগালি)</b><small>For grown-ups only 🔞</small></span>
        <div class="segs">${[['Off', 0], ['On', 2]].map(([l, v]) => `<button class="seg${(+g.slang ? 2 : 0) === v ? ' on' : ''}" data-slang="${v}">${l}</button>`).join('')}</div></div>
      <p class="hint">${[
        'Off — clean, fine for the whole family.',
        'On — মজার গালি: "কানা ডোচা", "বোকা পাঁঠা", "কালা ডোচা", "আলবাল বকিস না", "তুই ছিঁড়ে নিবি?", "শুয়োরের নাতি"…'][+g.slang ? 1 : 0]}</p>
      <div class="setRow"><span><b>Bystander comments</b><small>People on the road shout at you</small></span>
        <label class="switch"><input type="checkbox" id="gBy" ${g.bystanders ? 'checked' : ''}><i></i></label></div>
      <div class="setRow"><span><b>Bengali voice (বাংলা আওয়াজ)</b><small>Comments &amp; slang are spoken aloud</small></span>
        <label class="switch"><input type="checkbox" id="gVo" ${g.voice ? 'checked' : ''}><i></i></label></div>`;
    body.querySelectorAll('[data-slang]').forEach(b => b.onclick = () => { g.slang = +b.dataset.slang; g.slangChosen = true; save(); renderPanel(); });
    body.querySelector('#gBy').onchange = e => { g.bystanders = e.target.checked; save(); };
    body.querySelector('#gVo').onchange = e => { g.voice = e.target.checked; save(); window.dispatchEvent(new CustomEvent('voicesetting', { detail: g.voice })); };
  } else if (activeTab === 'kb') {
    body.innerHTML = `<p class="hint">Tap a box, then press a key. <b>Backspace</b> clears, <b>Esc</b> cancels.</p>${rowsHTML('keys')}`;
  } else if (activeTab === 'pad') {
    body.innerHTML = `<p class="hint">${padId ? `🎮 Connected: <b>${escapeHTML(padId.slice(0, 48))}</b>` : '🎮 No gamepad found — connect one and <b>press any button</b>.'}<br>
      Tap a box, then press a button or push a stick.</p>${rowsHTML('pad')}`;
  } else {
    const t = cfg.touch;
    const seg = (key, v, l) => `<button class="seg${t[key] === v ? ' on' : ''}" data-${key}="${v}">${l}</button>`;
    const pics = {
      slider: '<div class="pic"><b style="left:50%;top:14px;transform:translateX(-50%)">⇠✛⇢</b><i class="pc" style="right:6px;bottom:6px"></i><i class="pc" style="right:30px;bottom:6px"></i></div>',
      gyro: '<div class="pic"><b style="left:50%;top:14px;transform:translateX(-50%)">📱↻ ✛</b><i class="pc" style="right:6px;bottom:6px"></i><i class="pc" style="right:30px;bottom:6px"></i></div>',
      buttons: '<div class="pic"><i class="pc sq sm" style="left:5px;bottom:4px"></i><i class="pc sq sm" style="left:22px;bottom:4px"></i><i class="pc sm" style="right:5px;bottom:4px"></i><i class="pc sm" style="right:5px;bottom:21px"></i><i class="pc sm" style="right:5px;bottom:38px"></i><i class="pc sm" style="right:22px;bottom:4px"></i></div>',
    };
    const card = (v, l, d) => `<button class="scheme${t.scheme === v ? ' on' : ''}" data-scheme="${v}">${pics[v]}<b>${l}</b><small>${d}</small></button>`;
    const lvl = t.gyroLevel || 4;
    const sw = (id, on) => `<label class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i></i></label>`;
    body.innerHTML = `
      <div class="schemes">${card('slider', 'Slide', 'Swipe anywhere: ⇠⇢ steer, ⇡ jump, ⇣ crawl')}${card('gyro', 'Gyro', 'Tilt to steer · tilt up / down · slide works too')}${card('buttons', 'Buttons', '◀ ▶ + jump, crawl, hit, sprint')}</div>
      ${t.scheme === 'gyro' ? `
      <div class="setRow"><span><b>Gyro sensitivity</b><small>${lvl <= 3 ? 'Low — needs a bigger tilt' : lvl <= 6 ? 'Normal' : 'High — turns with a small tilt'}</small></span>
        <div class="sens"><button class="ghost" id="gLess">−</button><div class="sensBar">${Array.from({ length: 10 }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}<b>${lvl}</b></div><button class="ghost" id="gMore">+</button></div></div>
      <div class="setRow"><span><b>Tilt up / down</b><small>Tilt the top towards you = jump, away = crawl</small></span>${sw('gTilt', t.gyroTilt)}</div>
      <div class="setRow"><span><b>Swap up / down</b><small>If jump and crawl are the wrong way round</small></span>${sw('gTiltInv', t.gyroTiltInvert)}</div>
      <div class="setRow"><span><b>Invert steering</b><small>If it steers the wrong way</small></span>${sw('gInv', t.gyroInvert)}</div>
      <div class="setRow"><span><b>Re-centre</b><small>Hold the phone the way you play and tap</small></span><button class="ghost" id="gCal">⟲ Set straight</button></div>
      <p class="hint" id="gStat">${gyroWorking() ? '✅ Gyro is working — tilt to test: <span id="gyroInd" class="gyroInd">⬆</span>' : '⏳ Starting gyro… If it does not work, open the game over https and allow motion access.'}</p>` : ''}
      ${t.scheme !== 'buttons' ? '<p class="hint">🏃 sprint and 👊 hit are buttons. Each finger works on its own, so you can steer with one and swipe with the other.</p>' : ''}
      <div class="setRow"><span><b>Touch controls</b><small>Show the on-screen controls</small></span><div class="segs">${seg('mode', 'auto', 'Auto')}${seg('mode', 'on', 'On')}${seg('mode', 'off', 'Off')}</div></div>
      <div class="setRow"><span><b>Button size</b><small>Small ↔ large</small></span><input type="range" id="tSize" min="0.7" max="1.4" step="0.05" value="${t.size}"></div>
      <div class="setRow"><span><b>Opacity</b><small>See-through ↔ solid</small></span><input type="range" id="tOpa" min="0.3" max="1" step="0.05" value="${t.opacity}"></div>
      <div class="setRow"><span><b>Left-handed</b><small>Mirror the buttons</small></span>${sw('tLeft', t.leftHanded)}</div>`;
    body.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { t.mode = b.dataset.mode; save(); renderPanel(); });
    body.querySelectorAll('[data-scheme]').forEach(b => b.onclick = async () => {
      t.scheme = b.dataset.scheme; save(); applyTouch();
      if (t.scheme === 'gyro') { await startGyro(); setTimeout(() => panelOpen && activeTab === 'touch' && renderPanel(), 600); }
      renderPanel();
    });
    const q = id => body.querySelector(id);
    if (q('#gLess')) q('#gLess').onclick = () => { gyroSensitivity(-1); renderPanel(); };
    if (q('#gMore')) q('#gMore').onclick = () => { gyroSensitivity(+1); renderPanel(); };
    if (q('#gTilt')) q('#gTilt').onchange = e => { t.gyroTilt = e.target.checked; save(); };
    if (q('#gTiltInv')) q('#gTiltInv').onchange = e => { t.gyroTiltInvert = e.target.checked; save(); };
    if (q('#gInv')) q('#gInv').onchange = e => { t.gyroInvert = e.target.checked; save(); };
    if (q('#gCal')) q('#gCal').onclick = () => { calibrateGyro(); q('#gCal').textContent = '✓ Done'; };
    q('#tSize').oninput = e => { t.size = +e.target.value; save(); applyTouch(); };
    q('#tOpa').oninput = e => { t.opacity = +e.target.value; save(); applyTouch(); };
    q('#tLeft').onchange = e => { t.leftHanded = e.target.checked; save(); applyTouch(); };
  }
  body.querySelectorAll('.bind').forEach(b => b.onclick = () => {
    const same = capture && capture.action === b.dataset.a && capture.slot === +b.dataset.s;
    const pad = b.dataset.kind === 'pad' ? activePad() : null;
    capture = same ? null : { type: b.dataset.kind === 'keys' ? 'key' : 'pad', action: b.dataset.a, slot: +b.dataset.s, base: pad ? padSnapshot(pad) : null };
    renderPanel();
  });
}
const escapeHTML = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function initPanel() {
  document.querySelectorAll('#controls [data-tab]').forEach(b => b.onclick = () => { activeTab = b.dataset.tab; capture = null; renderPanel(); });
  document.getElementById('ctlReset').onclick = () => {
    const kind = { kb: 'keys', pad: 'pad', touch: 'touch', game: 'game' }[activeTab];
    cfg[kind] = clone(DEFAULTS[kind]); capture = null; save(); applyTouch(); renderPanel(); renderKeyHelp();
  };
  document.getElementById('ctlDone').onclick = () => closeControls();
  document.getElementById('ctlBack').onclick = () => closeControls();
}

export function initInput(onAction) {
  handler = onAction;
  initTouch(); initPanel(); renderKeyHelp();
  addEventListener('gamepadconnected', () => pollGamepad());
}
