// Pre-renders every line in noslangs.comment.json and slangs.comment.json into small MP3 clips (audio/voice/<voice>/*.mp3 + audio/voice/index.json),
// so voices play in any browser, offline, even where the OS has no Bengali text-to-speech voice.
//
//   pip install edge-tts            (once; needs internet + ffmpeg)
//   node tools/make-voices.mjs      (only new or changed lines are rendered)
//
// Set EDGE_TTS=/path/to/edge-tts if it is not on your PATH.
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { voiceKey, voiceId } from '../js/voicekey.js';
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
// which voice reads a list, from its key in the comment files
function voiceFor(keys) {
  if (keys.includes('outsiderFemale')) return 'female';
  if (keys.includes('superSir')) return 'super';
  if (keys.includes('driver')) return 'driver';
  if (keys.includes('shopkeeperShout')) return 'shopkeeper';
  if (keys.includes('outsiderMale') || keys.includes('walker') || keys.includes('levelSpeceficOutsider')) return 'bystander';
  return 'friend'; // friendChase, friendsFight, friendFall, levelSpeceficFriends
}

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
const want = Object.fromEntries(Object.keys(VOICES).map(v => [v, new Set()]));
const walk = (v, keys) => {
  const k = keys[keys.length - 1] || '';
  if (k.startsWith('_') || k === 'prequal') return; // help notes and the prequel story: shown only, never spoken
  if (typeof v === 'string') { const t = voiceKey(v); if (t && (BN.test(t) || /[A-Za-z]/.test(t))) want[voiceFor(keys)].add(t); }
  else if (v && typeof v === 'object') for (const [kk, vv] of Object.entries(v)) walk(vv, [...keys, kk]);
};
for (const f of ['noslangs.comment.json', 'slangs.comment.json']) walk(JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')), []);

if (process.argv.includes('--list')) { for (const [v, set] of Object.entries(want)) console.log(v, set.size, [...set].slice(0, 5)); process.exit(0); }

const idxFile = path.join(OUT, 'index.json');
let index = {};
try { index = JSON.parse(fs.readFileSync(idxFile, 'utf8')); } catch (e) { /* first run */ }
if (!index.friend) index = {}; // old single-voice index: start over
for (const v of Object.keys(index)) if (!VOICES[v]) delete index[v]; // voices that no longer exist
const jobs = [];
for (const [v, set] of Object.entries(want)) {
  index[v] ||= {};
  fs.mkdirSync(path.join(OUT, v), { recursive: true });
  for (const t of set) {
    const say = await speakable(t); // a fixed spelling in spoken.json or new voice settings give a new id → re-rendered
    const id = voiceId(t + '|' + say + '|' + JSON.stringify(VOICES[v])), file = path.join(OUT, v, id + '.mp3');
    if (index[v][t] === id && fs.existsSync(file)) continue;
    jobs.push({ v, t, say, id, file });
  }
}
let made = 0, failed = 0;
async function render({ v, t, say, id, file }) {
  const P = VOICES[v], raw = file + '.raw.mp3';
  try {
    await run(EDGE, ['--voice', P.voice, `--rate=${P.rate}`, `--pitch=${P.pitch}`, `--volume=${P.volume}`, '--text', say, '--write-media', raw]);
    // trim silence; squash + soft-clip + presence boost so it sounds shouted and angry; mono 40 kbps
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af',
      'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,' +
      'acompressor=threshold=-24dB:ratio=6:attack=3:release=70:makeup=5,volume=5dB,asoftclip=type=tanh,' +
      'equalizer=f=2600:t=q:w=1.2:g=4,equalizer=f=180:t=q:w=1:g=2,alimiter=limit=0.93',
      '-ac', '1', '-ar', '24000', '-b:a', '40k', file]);
    index[v][t] = id; made++;
  } catch (e) { failed++; console.warn('skip', v, JSON.stringify(t), e.message.split('\n')[0]); }
  fs.rmSync(raw, { force: true });
}
const queue = jobs.slice();
await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await render(queue.shift()); }));

// drop clips for lines that are gone, and anything left over from the old single-voice layout
for (const v of Object.keys(index)) for (const t of Object.keys(index[v])) if (!want[v] || !want[v].has(t)) delete index[v][t];
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.mp3')) fs.rmSync(path.join(OUT, f));
for (const v of Object.keys(want)) {
  const keep = new Set(Object.values(index[v]).map(id => id + '.mp3'));
  for (const f of fs.readdirSync(path.join(OUT, v))) if (!keep.has(f)) fs.rmSync(path.join(OUT, v, f));
}
fs.writeFileSync(idxFile, JSON.stringify(index));
fs.writeFileSync(SPOKEN_FILE, JSON.stringify(spoken, null, 1));
for (const d of fs.readdirSync(OUT)) if (fs.statSync(path.join(OUT, d)).isDirectory() && !VOICES[d]) fs.rmSync(path.join(OUT, d), { recursive: true });
console.log(Object.entries(want).map(([v, s]) => `${v}: ${s.size}`).join(', '), `| ${made} new clips, ${failed} failed`);
