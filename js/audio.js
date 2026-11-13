import { voiceKey } from './voicekey.js';
// Tiny synthesized sound engine — no audio files needed.
let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
let muted = false, musicTimer = null, nextNoteTime = 0, step = 0;


export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended' && !paused) ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.22; musicBus.connect(master);
  voiceBus = ctx.createGain(); voiceBus.gain.value = 1.25; voiceBus.connect(master);
  loadBank(); loadSamples();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}


export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.6;
  if (m) stopVoice();
}
export const isMuted = () => muted;
// pause menu: silence everything at once (sounds already playing freeze, queued comments are dropped)
let paused = false;
export function pauseAudio() { paused = true; stopVoice(); if (ctx && ctx.state === 'running') ctx.suspend(); }
export function resumeAudio() { paused = false; if (ctx && ctx.state === 'suspended') ctx.resume(); }

function env(g, t, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone(type, f0, f1, dur, vol = 0.3, delay = 0, bus = sfxBus) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  env(g, t, 0.01, vol, dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, freq, q = 1, vol = 0.4, type = 'bandpass', delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, 0.005, vol, dur);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

// voiced animal noise: a buzzy source with a pitch contour, shaped by vowel formants (sounds like a throat, not a beep)
function animal(f0s, dur, formants, vol = 0.3, delay = 0, breath = 0.15) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0s[0], t);
  f0s.slice(1).forEach((f, i) => o.frequency.linearRampToValueAtTime(f, t + dur * (i + 1) / (f0s.length - 1)));
  const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 6; vg.gain.value = f0s[0] * 0.03;
  vib.connect(vg); vg.connect(o.frequency);
  const out = ctx.createGain(); env(out, t, Math.min(0.06, dur * 0.2), vol, dur);
  for (const [f, q, g] of formants) {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const gg = ctx.createGain(); gg.gain.value = g; o.connect(bp); bp.connect(gg); gg.connect(out);
  }
  if (breath) { // a bit of air in the voice
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = formants[0][0] * 1.5; f.Q.value = 1;
    const g = ctx.createGain(); g.gain.value = breath; s.connect(f); f.connect(g); g.connect(out); s.start(t); s.stop(t + dur + 0.05);
  }
  out.connect(sfxBus); o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
}

// ---------- real recordings: animals and the cycle bell (audio/other, see CREDITS.md) ----------
const SAMPLES = { bell: ['bell1', 'bell2'], dog: ['dog1', 'dog2', 'dog3'], cow: ['cow1', 'cow2'], goat: ['goat1', 'goat2', 'goat3', 'goat4'] };
const sampleBufs = {};
function loadSamples() {
  for (const [k, files] of Object.entries(SAMPLES)) sampleBufs[k] = [];
  for (const [k, files] of Object.entries(SAMPLES)) for (const f of files)
    fetch(`audio/other/${f}.mp3`).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => sampleBufs[k].push(buf)).catch(() => {});
}
let busyUntil = {}, lastPick = {};
function sample(k, rate = 1, vol = 0.8, far = false) { // true if a recording was played
  const list = sampleBufs[k];
  if (!ctx || !list || !list.length) return false;
  const now = performance.now();
  if (now < (busyUntil[k] || 0)) return true; // this animal is still calling: don't stack another on top
  let i = (Math.random() * list.length) | 0;
  if (list.length > 1 && i === lastPick[k]) i = (i + 1) % list.length; // a different recording each time
  lastPick[k] = i;
  const buf = list[i];
  busyUntil[k] = now + Math.max(350, buf.duration / rate * 700); // most of the call
  const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol;
  if (far) { // far away: duller and softer
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = k === 'goat' ? 2200 : 1200;
    s.connect(lp); lp.connect(g);
  } else s.connect(g);
  g.connect(sfxBus); s.start();
  return true;
}

export const sfx = {
  slap() { noise(0.09, 2500, 0.8, 0.7, 'highpass'); tone('square', 900, 300, 0.06, 0.08); },
  kick() { tone('sine', 160, 40, 0.22, 0.7); noise(0.1, 600, 1, 0.4); },
  stick() { tone('triangle', 300, 120, 0.12, 0.4); noise(0.12, 1200, 2, 0.5); },
  hurt() { tone('sawtooth', 500, 180, 0.25, 0.15); },
  jump() { tone('sine', 280, 620, 0.14, 0.2); },
  land() { noise(0.06, 300, 1, 0.2, 'lowpass'); },
  pick() { tone('sine', 700, 1300, 0.1, 0.2); tone('sine', 1300, 1700, 0.08, 0.15, 0.08); },
  throw() { noise(0.18, 1500, 3, 0.3); tone('sine', 900, 300, 0.18, 0.08); },
  stone() { tone('square', 1200, 400, 0.05, 0.15); noise(0.08, 3000, 2, 0.3); },
  bark() { if (sample('dog', 0.92 + Math.random() * 0.2, 0.75)) return; // real bark; synth below is the fallback
    // "woof-woof": sharp attack, falling pitch, open vowel
    const p = 0.8 + Math.random() * 0.5, n = Math.random() < 0.6 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      animal([480 * p, 620 * p, 300 * p], 0.16, [[900 * p, 3, 1.4], [1700 * p, 5, 0.6], [2600, 6, 0.25]], 0.55, i * 0.2, 0.5);
      noise(0.05, 1400 * p, 1.5, 0.35, 'bandpass', i * 0.2);
    }
  },
  horn() { tone('square', 420, 420, 0.18, 0.1); tone('square', 350, 350, 0.25, 0.1, 0.22); },
  bell() { if (sample('bell', 0.97 + Math.random() * 0.06, 0.55)) return; tone('sine', 2100, 2000, 0.25, 0.15); tone('sine', 2100, 2000, 0.25, 0.15, 0.14); }, // ক্রিং ক্রিং
  moo() { if (sample('cow', 0.97 + Math.random() * 0.06, 0.95)) return;
    // "hammmbaaa": closed hum opening into a long falling 'aa'
    animal([105, 118, 132, 120, 96], 1.3, [[300, 4, 1.2], [700, 6, 0.9], [1150, 8, 0.4]], 0.4, 0, 0.08);
    animal([210, 236, 264, 240, 192], 1.3, [[700, 6, 0.25]], 0.12, 0, 0);
  },
  baa() { if (sample('goat', 0.96 + Math.random() * 0.08, 0.85)) return;
    // goat "myaa-a-a": high bleat with heavy tremolo
    animal([380, 420, 400, 360], 0.7, [[800, 5, 1.2], [1800, 6, 0.6], [2800, 8, 0.3]], 0.3, 0, 0.1);
    for (let i = 0; i < 5; i++) animal([400, 370], 0.11, [[900, 4, 0.8]], 0.12, 0.1 + i * 0.12, 0);
  },
  crash() { noise(0.4, 400, 0.5, 0.6, 'lowpass'); tone('square', 200, 60, 0.3, 0.15); },
  beep(hi) { tone('square', hi ? 1046 : 523, hi ? 1046 : 523, hi ? 0.5 : 0.18, 0.18); },
  whistle() { for (let i = 0; i < 3; i++) tone('square', 2400, 2300, 0.12, 0.08, i * 0.05); tone('sine', 2500, 2400, 0.6, 0.12, 0.15); },
  splash() { noise(0.5, 700, 0.6, 0.6, 'lowpass'); noise(0.3, 2500, 1, 0.3, 'bandpass', 0.05); },
  slip() { tone('sine', 300, 1400, 0.35, 0.18); noise(0.15, 300, 1, 0.3, 'lowpass', 0.35); },
  // distant animals for the background (quieter, a little lower)
  barkFar() { if (!sample('dog', 0.9 + Math.random() * 0.1, 0.25, true)) tone('sawtooth', 420, 260, 0.12, 0.05); },
  mooFar() { if (!sample('cow', 0.96 + Math.random() * 0.06, 0.4, true)) animal([100, 120, 92], 1.1, [[300, 4, 1.2], [700, 6, 0.8]], 0.12); },
  baaFar() { if (!sample('goat', 0.97 + Math.random() * 0.08, 0.35, true)) animal([380, 400, 360], 0.5, [[800, 5, 1]], 0.1); },
  crow() { // কা কা: two or three hoarse caws
    const n = 2 + (Math.random() * 2 | 0), p = 0.9 + Math.random() * 0.2;
    for (let i = 0; i < n; i++) { animal([620 * p, 560 * p, 480 * p], 0.22, [[1300 * p, 3, 1.0], [2300, 4, 0.5]], 0.12, i * 0.32, 0.9); }
  },
  birds() { // a few quick chirps
    const n = 3 + (Math.random() * 4 | 0);
    for (let i = 0; i < n; i++) { const f = 2600 + Math.random() * 1600; tone('sine', f, f * (Math.random() < 0.5 ? 1.35 : 0.75), 0.07, 0.045, i * (0.09 + Math.random() * 0.08)); }
  },
  quack() { // প্যাঁক প্যাঁক
    const n = 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) animal([520, 440], 0.14, [[1100, 4, 1.1], [2400, 6, 0.4]], 0.18, i * 0.18, 0.5);
  },
  horn2() { // the local train's horn: two long tones
    tone('sawtooth', 330, 330, 0.9, 0.09); tone('sawtooth', 415, 415, 0.9, 0.07);
    tone('sawtooth', 330, 330, 1.2, 0.09, 1.1); tone('sawtooth', 415, 415, 1.2, 0.07, 1.1);
  },
  clack() { noise(0.05, 900, 2, 0.25, 'bandpass'); noise(0.05, 900, 2, 0.2, 'bandpass', 0.14); }, // wheels over rail joints
  dhak() { // festival drums: a quick ঢাক pattern
    [0, 0.18, 0.36, 0.45, 0.54, 0.72].forEach((t, i) => { tone('sine', i % 3 ? 140 : 95, 55, 0.22, 0.55, t); noise(0.06, 2200, 1, i % 2 ? 0.25 : 0.12, 'bandpass', t); });
  },
  thunder() { noise(2.2, 120, 0.4, 0.9, 'lowpass'); noise(1.4, 300, 0.6, 0.45, 'lowpass', 0.15); },
  frog() { // ব্যাঙ: a low croak or two
    const n = 1 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) animal([150, 120, 140], 0.18, [[500, 5, 1.2], [1100, 6, 0.5]], 0.14, i * 0.28, 0.3);
  },
  hen() { // "kok-kok-kokaak"
    const n = 3 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) animal(i === n - 1 ? [700, 1000, 800] : [650, 820], i === n - 1 ? 0.25 : 0.07, [[1200, 5, 1.2], [2600, 6, 0.5]], 0.25, i * 0.12, 0.2);
  },
  cheer() { noise(0.9, 1800, 0.4, 0.25, 'bandpass'); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, 0.18, 0.14, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f, 0.25, 0.2, i * 0.18)); },
};

// ---------- Bengali voice lines ----------
// Lines are pre-rendered MP3 clips (audio/voice/<voice>/, made by tools/make-voices.mjs from the two *.comment.json files), played
// through Web Audio so they work in every browser and obey mute. Voices (all angry): friend, bystander, shopkeeper,
// driver, super, female. A small playback-rate change on top makes each speaker a bit different.
// Only lines that have a clip are heard (everything in the comment files except prequal); anything else is shown silently.
let bank = null, voiceBus = null, voiceOn = true;
const clipCache = new Map();
function loadBank() {
  if (bank) return;
  bank = {};
  // index.json lists every clip: { f: 'slang/friendChase/03.mp3', t: line, v: voice }. The folders mirror the comment files.
  fetch('audio/voice/index.json').then(r => r.ok ? r.json() : {}).then(j => {
    const b = {};
    for (const c of j.clips || []) (b[c.v] ||= {})[c.t] = c.f;
    bank = b;
  }).catch(() => {});
}
function clipFor(text, voice) { // -> Promise<AudioBuffer|null>, or null when there is no clip for this line
  const k = voiceKey(text);
  if (!k || !bank) return null;
  if (!bank[voice] || !bank[voice][k]) return null;
  const url = `audio/voice/${bank[voice][k]}`;
  if (!clipCache.has(url)) clipCache.set(url, fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).catch(() => null));
  return clipCache.get(url);
}
export function setVoice(on) { voiceOn = on; if (!on) stopVoice(); }

// play one line now; resolves when it has finished (or right away if it can't be played)
const live = new Set();
function playLine(text, voice, rate = 1) {
  if (!ctx || muted || !voiceOn) return Promise.resolve();
  const c = clipFor(text, voice);
  if (!c) return Promise.resolve(); // no clip → silent
  return c.then(buf => new Promise(done => {
    if (!buf || muted || !voiceOn) return done();
    const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    s.connect(voiceBus); s.start(); live.add(s); s._done = done;
    s.onended = () => { live.delete(s); done(); };
  }));
}
export function stopVoice() {
  for (const s of live) { try { s.onended = null; s.stop(); } catch (e) { /* already stopped */ } s._done && s._done(); }
  live.clear(); chatQ.length = 0; chatBusy = false;
}

// in-game chatter: one voice at a time, max 2 waiting, stale lines dropped; pri lines (you, Super Sir) jump ahead
const chatQ = [];
let chatBusy = false;
export function say(text, opt = {}) {
  if (!ctx || muted || paused || !voiceOn || !text) return;
  const item = { text, voice: opt.voice || 'bystander', rate: opt.pitch || 1, at: performance.now(), pri: opt.pri || 0 };
  if (item.pri) { const i = chatQ.findIndex(q => !q.pri); chatQ.splice(i < 0 ? chatQ.length : i, 0, item); }
  else chatQ.push(item);
  while (chatQ.length > 2) { const i = chatQ.findLastIndex(q => !q.pri); chatQ.splice(i < 0 ? chatQ.length - 1 : i, 1); }
  pumpChat();
}
function pumpChat() {
  if (chatBusy) return;
  let it;
  while ((it = chatQ.shift()) && performance.now() - it.at > 1500) { /* the moment has passed */ }
  if (!it) return;
  chatBusy = true;
  playLine(it.text, it.voice, it.rate).then(() => { chatBusy = false; setTimeout(pumpChat, 20); });
}

// ---------- rain: filtered noise on a loop ----------
let rainSrc = null;
export function startRain() {
  if (!ctx || rainSrc) return;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
  const g = ctx.createGain(); g.gain.value = 0.22;
  src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(sfxBus); src.start();
  rainSrc = src;
}
export function stopRain() { if (rainSrc) { try { rainSrc.stop(); } catch (e) { /* */ } rainSrc = null; } }

// ---------- cheerful chase music (simple step sequencer) ----------
const BPM = 150, STEP = 60 / BPM / 2;
const mel = [72, 0, 74, 76, 79, 0, 76, 74, 72, 0, 69, 72, 74, 0, 0, 0, 76, 0, 79, 81, 79, 0, 76, 74, 72, 74, 76, 0, 72, 0, 0, 0];
const bass = [48, 0, 55, 0, 45, 0, 52, 0, 41, 0, 48, 0, 43, 0, 50, 0];
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

function schedule() {
  while (nextNoteTime < ctx.currentTime + 0.12) {
    const t = nextNoteTime - ctx.currentTime;
    const m = mel[step % mel.length];
    if (m) tone('square', midi(m), midi(m), STEP * 0.9, 0.12, t, musicBus);
    const b = bass[step % bass.length];
    if (b) tone('triangle', midi(b), midi(b), STEP * 1.6, 0.35, t, musicBus);
    if (step % 2 === 0) { // dhol-ish beat
      const tt = nextNoteTime;
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = step % 4 === 0 ? 'lowpass' : 'highpass'; f.frequency.value = step % 4 === 0 ? 180 : 5000;
      const g = ctx.createGain(); env(g, tt, 0.003, step % 4 === 0 ? 0.9 : 0.12, 0.09);
      s.connect(f); f.connect(g); g.connect(musicBus); s.start(tt); s.stop(tt + 0.12);
    }
    nextNoteTime += STEP; step++;
  }
}

// story slides: a tense, driving action loop (minor key, pounding toms, stabs)
const ACT_STEP = 60 / 172 / 2;
const actBass = [40, 40, 52, 40, 40, 50, 40, 47, 38, 38, 50, 38, 38, 48, 43, 45];
const actStab = [64, 0, 0, 64, 0, 0, 67, 0, 62, 0, 0, 62, 0, 0, 66, 69, 64, 0, 0, 64, 0, 0, 71, 0, 72, 0, 71, 0, 69, 0, 67, 66];
let musicKind = 'race';
function drum(t, lowHz, hiCut, vol, dur = 0.12, type = 'lowpass') {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = lowHz; f.Q.value = hiCut;
  const g = ctx.createGain(); env(g, t, 0.003, vol, dur);
  s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
function scheduleAction() {
  while (nextNoteTime < ctx.currentTime + 0.12) {
    const t = nextNoteTime - ctx.currentTime, tt = nextNoteTime;
    const b = actBass[step % actBass.length];
    tone('sawtooth', midi(b), midi(b), ACT_STEP * 0.8, 0.22, t, musicBus);
    tone('square', midi(b + 12), midi(b + 12), ACT_STEP * 0.5, 0.05, t, musicBus);
    const m = actStab[step % actStab.length];
    if (m) { tone('square', midi(m), midi(m), ACT_STEP * 1.4, 0.09, t, musicBus); tone('sawtooth', midi(m - 5), midi(m - 5), ACT_STEP * 1.4, 0.05, t, musicBus); }
    if (step % 4 === 0) { tone('sine', 130, 45, 0.18, 0.9, t, musicBus); drum(tt, 160, 1, 0.8); }          // kick
    if (step % 8 === 4) drum(tt, 1800, 0.8, 0.6, 0.16, 'bandpass');                                       // snare
    if (step % 2 === 1) drum(tt, 7000, 1, 0.12, 0.04, 'highpass');                                        // hat
    if (step % 16 >= 12) tone('sine', 220 - (step % 4) * 40, 70, 0.16, 0.45, t, musicBus);                 // tom fill
    nextNoteTime += ACT_STEP; step++;
  }
}

export function startMusic(kind = 'race') {
  if (!ctx) return;
  if (musicTimer && musicKind === kind) return;
  stopMusic(); musicKind = kind;
  nextNoteTime = ctx.currentTime + 0.05; step = 0;
  if (musicBus) musicBus.gain.value = kind === 'action' ? 0.32 : 0.22;
  musicTimer = setInterval(kind === 'action' ? scheduleAction : schedule, 40);
}
export function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
export function setMusicFast(fast) { if (musicBus) musicBus.gain.value = fast ? 0.3 : 0.22; }
