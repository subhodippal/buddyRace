// Unified input: keyboard + gamepad + touch, with remappable bindings saved to localStorage.
const STORE = 'buddyrace.controls.v1';
export const isTouchDevice = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

export const ACTIONS = [
  { id: 'left', bn: 'Move left', en: 'Steer left', hold: true },
  { id: 'right', bn: 'Move right', en: 'Steer right', hold: true },
  { id: 'sprint', bn: 'Sprint', en: 'Hold to run fast', hold: true },
  { id: 'jump', bn: 'Jump', en: 'Jump over things' },
  { id: 'attack', bn: 'Hit', en: 'Slap · kick · stick · throw' },
  { id: 'cam', bn: 'Camera', en: 'Change camera' },
  { id: 'pause', bn: 'Pause', en: 'Open the menu' },
  { id: 'mute', bn: 'Mute', en: 'Sound on / off' },
];
const HOLD = new Set(ACTIONS.filter(a => a.hold).map(a => a.id));

const DEFAULTS = {
  keys: { left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], sprint: ['Shift', 'ArrowUp'], jump: ['Space', ''],
    attack: ['Control', 'KeyF'], cam: ['KeyC', ''], pause: ['Escape', 'KeyP'], mute: ['KeyM', ''] },
  // standard gamepad mapping: b0=A b1=B b2=X b3=Y b4=LB b5=RB b6=LT b7=RT b9=Start b14/15=D-pad ←/→, a0=left stick X
  pad: { left: ['a0-', 'b14'], right: ['a0+', 'b15'], sprint: ['b7', 'b5'], jump: ['b0', ''], attack: ['b2', 'b1'],
    cam: ['b3', ''], pause: ['b9', ''], mute: ['b8', ''] },
  touch: { mode: 'auto', scheme: 'slider', size: 1, opacity: 0.9, leftHanded: false, gyroSens: 25, gyroInvert: false },
  game: { slang: 0, bystanders: true, name: '' },
};
const clone = o => JSON.parse(JSON.stringify(o));
let cfg = load();
function load() {
  const c = clone(DEFAULTS);
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (s) for (const k of ['keys', 'pad', 'touch', 'game']) Object.assign(c[k], s[k] || {});
    if (c.game.slang === 1) c.game.slang = 2; // old 3-step setting → on
    if ('foul' in c.game) { if (c.game.slang == null || !('slang' in (s.game || {}))) c.game.slang = c.game.foul ? 2 : 0; delete c.game.foul; }
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
  // steering slider: drag anywhere on the bar, it springs back to the middle when released
  const bar = document.getElementById('slider'), knob = document.getElementById('sliderKnob');
  let sid = null;
  const setKnob = () => { knob.style.transform = `translateX(calc(-50% + ${sliderVal * (bar.clientWidth / 2 - knob.clientWidth / 2)}px))`; };
  const move = e => {
    const r = bar.getBoundingClientRect();
    const v = (e.clientX - (r.left + r.width / 2)) / (r.width / 2 - knob.clientWidth / 2);
    sliderVal = Math.max(-1, Math.min(1, v)); setKnob();
  };
  bar.addEventListener('pointerdown', e => { e.preventDefault(); sid = e.pointerId; bar.setPointerCapture?.(e.pointerId); bar.classList.add('on'); move(e); });
  bar.addEventListener('pointermove', e => { if (e.pointerId === sid) move(e); });
  const rel = e => { if (e.pointerId !== sid) return; sid = null; sliderVal = 0; bar.classList.remove('on'); setKnob(); };
  bar.addEventListener('pointerup', rel); bar.addEventListener('pointercancel', rel); bar.addEventListener('lostpointercapture', rel);
  applyTouch();
}
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
  let v = deg / cfg.touch.gyroSens;
  if (Math.abs(v) < 0.08) v = 0;
  gyroVal = Math.max(-1, Math.min(1, v)) * (cfg.touch.gyroInvert ? -1 : 1);
  const ind = document.getElementById('gyroInd'); if (ind) ind.style.transform = `rotate(${Math.max(-45, Math.min(45, gyroVal * 45))}deg)`;
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
export function calibrateGyro() { gyroZero = gyroRoll; }
export const gyroWorking = () => gyroRoll != null;
export const gyroDebug = () => ({ gyroRoll, gyroZero, gyroVal });

// steering axis: -1 (left) … +1 (right), combining keys, gamepad stick, slider and gyro
export function steerAxis() {
  let v = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
  const p = activePad();
  if (p && Math.abs(p.axes[0] || 0) > 0.15 && (cfg.pad.left.includes('a0-') || cfg.pad.right.includes('a0+'))) v = p.axes[0];
  if (touchEnabled()) {
    if (cfg.touch.scheme === 'slider' && sliderVal) v = sliderVal;
    if (cfg.touch.scheme === 'gyro' && gyroVal) v = gyroVal;
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
  const rows = [['sprint', 'জোরে দৌড় (চেপে রাখো)'], ['left', 'বাঁদিকে'], ['right', 'ডানদিকে'], ['jump', 'লাফ'],
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
        <label class="switch"><input type="checkbox" id="gBy" ${g.bystanders ? 'checked' : ''}><i></i></label></div>`;
    body.querySelectorAll('[data-slang]').forEach(b => b.onclick = () => { g.slang = +b.dataset.slang; save(); renderPanel(); });
    body.querySelector('#gBy').onchange = e => { g.bystanders = e.target.checked; save(); };
  } else if (activeTab === 'kb') {
    body.innerHTML = `<p class="hint">Tap a box, then press a key. <b>Backspace</b> clears, <b>Esc</b> cancels.</p>${rowsHTML('keys')}`;
  } else if (activeTab === 'pad') {
    body.innerHTML = `<p class="hint">${padId ? `🎮 Connected: <b>${escapeHTML(padId.slice(0, 48))}</b>` : '🎮 No gamepad found — connect one and <b>press any button</b>.'}<br>
      Tap a box, then press a button or push a stick.</p>${rowsHTML('pad')}`;
  } else {
    const t = cfg.touch;
    const seg = (key, v, l) => `<button class="seg${t[key] === v ? ' on' : ''}" data-${key}="${v}">${l}</button>`;
    const pics = {
      slider: '<div class="pic"><i class="pbar"><u></u></i><i class="pc" style="right:8px;bottom:6px"></i><i class="pc" style="right:34px;bottom:6px"></i><i class="pc" style="right:8px;bottom:32px"></i></div>',
      gyro: '<div class="pic"><b>📱↻</b><i class="pc" style="left:8px;bottom:6px"></i><i class="pc" style="right:8px;bottom:6px"></i><i class="pc" style="right:8px;bottom:32px"></i></div>',
      buttons: '<div class="pic"><i class="pc sq" style="left:8px;bottom:6px"></i><i class="pc sq" style="left:34px;bottom:6px"></i><i class="pc" style="right:8px;bottom:6px"></i><i class="pc" style="right:34px;bottom:6px"></i><i class="pc" style="right:8px;bottom:32px"></i></div>',
    };
    const card = (v, l, d) => `<button class="scheme${t.scheme === v ? ' on' : ''}" data-scheme="${v}">${pics[v]}<b>${l}</b><small>${d}</small></button>`;
    body.innerHTML = `
      <div class="schemes">${card('slider', 'Slider', 'Drag the bar to steer')}${card('gyro', 'Gyro', 'Tilt the phone to steer')}${card('buttons', 'Buttons', '◀ ▶ buttons')}</div>
      ${t.scheme === 'gyro' ? `
      <div class="setRow"><span><b>Gyro sensitivity</b><small>Lower = turns with a small tilt</small></span><input type="range" id="gSens" min="10" max="45" step="1" value="${t.gyroSens}"></div>
      <div class="setRow"><span><b>Invert</b><small>Turn on if it steers the wrong way</small></span><label class="switch"><input type="checkbox" id="gInv" ${t.gyroInvert ? 'checked' : ''}><i></i></label></div>
      <div class="setRow"><span><b>Re-centre</b><small>Hold the phone straight and tap</small></span><button class="ghost" id="gCal">⟲ Set straight</button></div>
      <p class="hint" id="gStat">${gyroWorking() ? '✅ Gyro is working — tilt to test: <span id="gyroInd" class="gyroInd">⬆</span>' : '⏳ Starting gyro… If it does not work, open the game over https and allow motion access.'}</p>` : ''}
      <div class="setRow"><span><b>Touch controls</b><small>Show the on-screen controls</small></span><div class="segs">${seg('mode', 'auto', 'Auto')}${seg('mode', 'on', 'On')}${seg('mode', 'off', 'Off')}</div></div>
      <div class="setRow"><span><b>Button size</b><small>Small ↔ large</small></span><input type="range" id="tSize" min="0.7" max="1.4" step="0.05" value="${t.size}"></div>
      <div class="setRow"><span><b>Opacity</b><small>See-through ↔ solid</small></span><input type="range" id="tOpa" min="0.3" max="1" step="0.05" value="${t.opacity}"></div>
      <div class="setRow"><span><b>Left-handed</b><small>Swap the two sides</small></span><label class="switch"><input type="checkbox" id="tLeft" ${t.leftHanded ? 'checked' : ''}><i></i></label></div>`;
    body.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { t.mode = b.dataset.mode; save(); renderPanel(); });
    body.querySelectorAll('[data-scheme]').forEach(b => b.onclick = async () => {
      t.scheme = b.dataset.scheme; save(); applyTouch();
      if (t.scheme === 'gyro') { await startGyro(); setTimeout(() => panelOpen && activeTab === 'touch' && renderPanel(), 600); }
      renderPanel();
    });
    const q = id => body.querySelector(id);
    if (q('#gSens')) q('#gSens').oninput = e => { t.gyroSens = +e.target.value; save(); };
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
