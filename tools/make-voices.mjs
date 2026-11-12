// Pre-renders every line in slangs.comment.json and noslangs.comment.json into small MP3 clips, so voices play in any
// browser, offline, even where the OS has no Bengali text-to-speech voice. The folders mirror the JSON files:
//
//   audio/voice/slang/<key>/01.mp3              = slangs.comment.json → <key>[0]
//   audio/voice/noSlang/<key>/02.mp3            = noslangs.comment.json → <key>[1]
//   audio/voice/slang/levelSpeceficFriends/level3/01.mp3 = slangs.comment.json → levelSpeceficFriends.l3[0]
//
// audio/voice/index.json lists every clip with its line (the game reads it). prequal and _help are never spoken.
//
//   pip install edge-tts            (once; needs internet + ffmpeg)
//   node tools/make-voices.mjs      (only new or changed lines are rendered)
//
// Set EDGE_TTS=/path/to/edge-tts if it is not on your PATH.
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { voiceKey, voiceId, VOICE_OF_KEY, VOICE_FILES } from '../js/voicekey.js';
const run = promisify(execFile);

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'audio/voice');
const EDGE = process.env.EDGE_TTS || 'edge-tts';

// Who sounds like what. Everyone is angry (fast, loud, squashed and a bit gritty); each group has its own tune.
export const VOICES = {
  friend:     { voice: 'bn-IN-BashkarNeural',  rate: '+24%', pitch: '+6Hz',  volume: '+35%' }, // young hostel boys
  bystander:  { voice: 'bn-BD-PradeepNeural',  rate: '+10%', pitch: '-16Hz', volume: '+35%' }, // older men on the road
  shopkeeper: { voice: 'bn-IN-BashkarNeural',  rate: '+8%',  pitch: '-22Hz', volume: '+35%' }, // gruff stall owners
  driver:     { voice: 'bn-BD-PradeepNeural',  rate: '+26%', pitch: '-4Hz',  volume: '+35%' }, // shouting, in a hurry
  super:      { voice: 'bn-BD-PradeepNeural',  rate: '-6%',  pitch: '-30Hz', volume: '+35%' }, // the old, deep Superintendent
  female:     { voice: 'bn-IN-TanishaaNeural', rate: '+18%', pitch: '+2Hz',  volume: '+30%' }, // bystandersFemale only
};
// Lines typed in English letters ("kane banra vora ache naki") are shown as typed, but spoken from a Bengali-script
// spelling. Spellings come from Google's transliteration and are saved in audio/voice/spoken.json —
// fix a word there if it is pronounced wrong, then run this script again.
const SPOKEN_FILE = path.join(OUT, 'spoken.json');
let spoken = {};
try { spoken = JSON.parse(fs.readFileSync(SPOKEN_FILE, 'utf8')); } catch (e) { /* none yet */ }
async function bengaliWord(w) {
  const k = w.toLowerCase();
  if (spoken[k]) return spoken[k];
  const r = await fetch('https://inputtools.google.com/request?itc=bn-t-i0-und&num=1&text=' + encodeURIComponent(k));
  const j = await r.json();
  const out = j[0] === 'SUCCESS' && j[1][0] && j[1][0][1][0];
  if (!out) throw new Error('no transliteration for ' + w);
  return (spoken[k] = out);
}
async function speakable(t) {
  let out = '';
  for (const part of t.split(/([A-Za-z]+)/)) out += /^[A-Za-z]+$/.test(part) ? await bengaliWord(part) : part;
  return out;
}

const BN = /[ঀ-৿]/;
const two = i => String(i + 1).padStart(2, '0');
// every spoken line, with the file it goes to
const want = []; // { sec, key, rel, t, v }
for (const [sec, file] of Object.entries(VOICE_FILES)) {
  const J = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const add = (key, list, sub) => (Array.isArray(list) ? list : []).forEach((x, i) => {
    const t = typeof x === 'string' ? voiceKey(x) : '';
    if (t && (BN.test(t) || /[A-Za-z]/.test(t))) want.push({ sec, key, t, v: VOICE_OF_KEY[key] || 'friend', rel: [sec, key, ...(sub ? [sub] : []), two(i) + '.mp3'].join('/') });
  });
  for (const [key, val] of Object.entries(J)) {
    if (key.startsWith('_') || key === 'prequal') continue;
    if (Array.isArray(val)) add(key, val);
    else if (val && typeof val === 'object') for (const [lk, list] of Object.entries(val)) add(key, list, lk.replace(/^l(\d+)$/, 'level$1'));
  }
}
if (process.argv.includes('--list')) { for (const w of want) console.log(w.rel, w.v, w.t); process.exit(0); }

// clips already made (any layout) are reused by id, so moving or reordering lines does not re-render them
const idxFile = path.join(OUT, 'index.json');
let old = {};
try { old = JSON.parse(fs.readFileSync(idxFile, 'utf8')); } catch (e) { /* first run */ }
const POOL = path.join(OUT, '.pool'); fs.rmSync(POOL, { recursive: true, force: true }); fs.mkdirSync(POOL, { recursive: true });
const stash = (id, f) => { if (fs.existsSync(f) && !fs.existsSync(path.join(POOL, id + '.mp3'))) fs.renameSync(f, path.join(POOL, id + '.mp3')); };
if (Array.isArray(old.clips)) for (const c of old.clips) stash(c.id, path.join(OUT, c.f));
else for (const v of Object.keys(old)) if (old[v] && typeof old[v] === 'object') for (const id of Object.values(old[v])) stash(id, path.join(OUT, v, id + '.mp3')); // old per-voice layout
for (const sec of Object.keys(VOICE_FILES)) fs.rmSync(path.join(OUT, sec), { recursive: true, force: true });
for (const d of Object.keys(VOICES)) fs.rmSync(path.join(OUT, d), { recursive: true, force: true }); // old per-voice folders

const clips = [], jobs = [];
for (const w of want) {
  const say = await speakable(w.t); // a fixed spelling in spoken.json or new voice settings give a new id → re-rendered
  const id = voiceId(w.t + '|' + say + '|' + JSON.stringify(VOICES[w.v])), file = path.join(OUT, w.rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  clips.push({ f: w.rel, t: w.t, v: w.v, id });
  const pooled = path.join(POOL, id + '.mp3');
  if (fs.existsSync(pooled)) fs.copyFileSync(pooled, file);
  else jobs.push({ v: w.v, t: w.t, say, id, file, pooled });
}
let made = 0, failed = 0;
async function render({ v, t, say, id, file, pooled }) {
  if (fs.existsSync(pooled)) { fs.copyFileSync(pooled, file); return; } // the same line was just rendered for another list
  const P = VOICES[v], raw = file + '.raw.mp3';
  try {
    await run(EDGE, ['--voice', P.voice, `--rate=${P.rate}`, `--pitch=${P.pitch}`, `--volume=${P.volume}`, '--text', say, '--write-media', raw]);
    // trim silence; squash + soft-clip + presence boost so it sounds shouted and angry; mono 40 kbps
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af',
      'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,' +
      'acompressor=threshold=-24dB:ratio=6:attack=3:release=70:makeup=5,volume=5dB,asoftclip=type=tanh,' +
      'equalizer=f=2600:t=q:w=1.2:g=4,equalizer=f=180:t=q:w=1:g=2,alimiter=limit=0.93',
      '-ac', '1', '-ar', '24000', '-b:a', '40k', file]);
    fs.copyFileSync(file, pooled); made++;
  } catch (e) { failed++; console.warn('skip', v, JSON.stringify(t), e.message.split('\n')[0]); }
  fs.rmSync(raw, { force: true });
}
const queue = jobs.slice();
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await render(queue.shift()); }));
fs.rmSync(POOL, { recursive: true, force: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.mp3')) fs.rmSync(path.join(OUT, f)); // strays from very old layouts

const ok = clips.filter(c => fs.existsSync(path.join(OUT, c.f)));
fs.writeFileSync(idxFile, JSON.stringify({ clips: ok.map(({ f, t, v, id }) => ({ f, t, v, id })) }, null, 1));
fs.writeFileSync(SPOKEN_FILE, JSON.stringify(spoken, null, 1));
const per = {}; for (const c of ok) { const k = c.f.split('/')[0]; per[k] = (per[k] || 0) + 1; }
console.log(Object.entries(per).map(([k, n]) => `${k}: ${n} clips`).join(', '), `| ${made} rendered, ${ok.length - made} reused, ${failed} failed`);
