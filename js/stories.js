import { VOICE_RATE as VR, SUPER_RATE, DOG_RATE } from './voicekey.js';
// Stories (a different hostel drama every race), dialogue lines, and the comic intro/ending slides.

// ---------------- dialogue ----------------
// Every spoken comment lives in comments.json (project root) so it can be edited by hand.
let C = {};
try {
  const r = await fetch(new URL('../comments.json', import.meta.url), { cache: 'no-cache' });
  C = await r.json();
} catch (e) { console.error('comments.json could not be loaded (check it for a missing comma or quote):', e); }
export const COMMENTS = C;
const arr = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : []);
const pickA = a => a[(Math.random() * a.length) | 0];
export const pickLine = list => { const a = arr(list); return a.length ? pickA(a) : ''; };

// slang: 0 = off, anything else = on (old saves stored true/false or 1/2)
export const slangLevel = v => (v === true ? 2 : v === false || v == null ? 0 : +v || 0);
// game situation → key in comments.json noSlangs / slangs
const KEY = { chase: 'friendsChase', brawl: 'friendsBrawl', fall: 'friendsFall', bystander: 'bystandersMale', bystanderF: 'bystandersFemale', super: 'superSir', driver: 'drivers' };
// cat: chase | brawl | fall | bystander (male) | bystanderF (female) | super | driver | shopkeeper | walker
export function line(cat, slang, story, levelNo) {
  const on = slangLevel(slang) > 0, k = KEY[cat];
  const NS = C.noSlangs || {}, SL = C.slangs || {}, com = C.common || {}, lk = 'l' + levelNo;
  const choose = (b, r) => pickLine(on && arr(r).length ? r : b); // গালাগালি On → slangs only; Off → noSlangs only
  const lvl = (com.levels || {})[lk] || {};
  if (cat === 'shopkeeper') return pickLine(arr(lvl.shopkeepers).length && Math.random() < 0.3 ? lvl.shopkeepers : com.shopkeepers);
  if (cat === 'walker') return pickLine(com.walkers);
  const special = (com.levelWiseComment || {})[lk]; // this level's one special line, shouted often
  if ((cat === 'chase' || cat === 'brawl') && typeof special === 'string' && special.trim() && Math.random() < 0.2) return special;
  if (cat === 'chase' && story && arr((com.stories || {})[story.id]).length && Math.random() < 0.25) return pickLine(com.stories[story.id]);
  const lvBy = cat === 'bystander' ? lvl.bystandersMale : cat === 'bystanderF' ? lvl.bystandersFemale : null;
  if (arr(lvBy).length && Math.random() < 0.3) return pickLine(lvBy);
  return k ? choose(NS[k], SL[k]) : '';
}

export const STORIES = [
  {
    id: 'luchi', open: 'mess', anim: 'gulp', bn: 'লুচি চোর', en: 'The Last Luchi', item: '<div class="luchi big"></div>',
    setup: { bg: 'bg-mess', title: 'মেস • সকাল ৮টা', bn: 'চারজন বন্ধু। একটা প্লেট। একটাই লুচি।', en: 'Four friends. One plate. ONE last luchi.' },
    act: { bn: '{C} লুচিটা মুখে পুরে দিল!', en: '{C} stuffed the last luchi into his mouth. In one go.', say: 'মমম… দারুণ!', fx: 'ঘপাৎ!' },
    accuse: ['ওটা আমার লুচি ছিল!', 'লুচি চোর!'], accuseK: ['শালা লুচি চোর!', 'হারামি, লুচি ফেরত দে!'],
    ending: 'আর লুচিটা? সুপার স্যার নিজেই খেয়ে নিলেন 😋',
  },
  {
    id: 'dim', open: 'sunday', anim: 'pocket', bn: 'ডিম চোর', en: 'The Missing Egg', item: '<div class="emoji big">🥚</div>',
    setup: { bg: 'bg-mess', title: 'রবিবার • ডিমের ঝোল', bn: 'রবিবার মানে ডিমের ঝোল!', en: 'Sunday = egg curry. Four friends, four eggs… wait, THREE eggs?' },
    act: { bn: '{C} ডিমটা পকেটে লুকিয়েছে!', en: '{C} hid an egg in his pocket. It cracked.', say: 'আমি কিছু জানি না 😇', fx: 'ক্র্যাক!' },
    accuse: ['আমার ডিম কোথায়?!', 'ডিম চোর!'], accuseK: ['ডিম চোর হারামি!', 'শালা ডিম চোর!'],
    ending: 'ডিমটা পাওয়া গেল সুপার স্যারের টিফিন বাক্সে 🥚',
  },
  {
    id: 'pen', open: 'examhall', anim: 'chew', bn: 'পেন চোর', en: 'The Lucky Pen', item: '<div class="emoji big">🖊️</div>',
    setup: { bg: 'bg-room', title: 'পরীক্ষার দিন • সকাল ৯টা', bn: 'আজ পরীক্ষা! লাকি পেন রেডি।', en: 'Exam day. {V} needs his lucky pen. It is not on the table.' },
    act: { bn: '{C} পেনটা "একটু ধার" নিয়েছে…', en: '{C} "borrowed" it. And chewed the cap.', say: 'একটু ধার নিয়েছিলাম 😅', fx: 'কুট কুট!' },
    accuse: ['আমার লাকি পেন!', 'পেন চোর!'], accuseK: ['শালা পেন চোর!', 'পেন দে হারামজাদা!'],
    ending: 'পেনটা? সুপার স্যারের পকেটে। কালি শেষ 🖊️',
  },
  {
    id: 'exam', open: 'notice', anim: 'notice', bn: 'রেজাল্ট', en: 'Results Day', item: '<div class="emoji big">📜</div>',
    setup: { bg: 'bg-exam', title: 'নোটিশ বোর্ড • রেজাল্ট', bn: 'রেজাল্ট বেরিয়েছে!', en: 'Results are out on the notice board…' },
    act: { bn: '{C} ফার্স্ট! বাকি সবাই ফেল!', en: '{C} topped the class. Everyone else FAILED.', say: 'আমি ফার্স্ট! 😎', fx: '১০০/১০০!' },
    accuse: ['নিশ্চয়ই টুকলি করেছিস!', 'টপার ধর!'], accuseK: ['শালা টপার!', 'টুকলিবাজ হারামি!'],
    ending: 'সুপার স্যার সবাইকে ১০০ বার নামতা লেখালেন। টপারকেও ✍️',
  },
  {
    id: 'prank', open: 'night', anim: 'smear', bn: 'প্র্যাঙ্ক', en: 'The Toothpaste Prank', item: '<div class="emoji big">🪥</div>',
    setup: { bg: 'bg-night', title: 'রাত ২টো • রুম ২০৪', bn: '{V} নাক ডেকে ঘুমোচ্ছে…', en: '2 AM. {V} is snoring. {C} has toothpaste and a marker.' },
    act: { bn: '{C} মুখে গোঁফ এঁকে দিল!', en: 'Toothpaste moustache. Marker glasses. Masterpiece.', say: 'হি হি হি 🤭', fx: 'খিক খিক!' },
    accuse: ['আমার মুখে কী করেছিস?!', 'আয়নায় দেখে আয়!'], accuseK: ['শালা হারামি, মুখে কী এঁকেছিস?!', 'বোকাচোদা প্র্যাঙ্ক!'],
    ending: 'পরদিন সুপার স্যারের মুখেও কেউ গোঁফ এঁকে দিল… কে? 🤫',
  },
  {
    id: 'pant', open: 'corridor', anim: 'rip', bn: 'ছেঁড়া প্যান্ট', en: 'The Torn Pant', item: '<div class="emoji big">👖</div>',
    setup: { bg: 'bg-room', title: 'হোস্টেলের করিডোর', bn: 'মজার কুস্তি চলছিল…', en: 'Just a friendly wrestling match in the corridor…' },
    act: { bn: '{C} টানতেই {V}-এর প্যান্ট ছিঁড়ে গেল!', en: '{C} pulled. The pant went RRRIP. Right at the back.', say: 'উপ্স… 😬', fx: 'চ্যাঁৎ!' },
    accuse: ['প্যান্ট ছিঁড়ে দিলি!', 'সবাই দেখছে!'], accuseK: ['শালা প্যান্ট ছিঁড়লি!', 'হারামজাদা, নতুন প্যান্ট!'],
    ending: 'সুপার স্যার সবাইকে সূঁচ-সুতো ধরিয়ে দিলেন 🪡',
  },
  {
    id: 'glasses', open: 'wake', anim: 'crack', bn: 'ভাঙা চশমা', en: 'The Broken Glasses', item: '<div class="emoji big">👓</div>',
    setup: { bg: 'bg-room', title: 'রুম ২০৪ • দুপুর', bn: '{V} চশমাটা বিছানায় রেখেছে…', en: '{V} left his glasses on the bed. Bad idea.' },
    act: { bn: '{C} ধপ করে বসে পড়ল!', en: '{C} sat right on them.', say: 'কিছু ভাঙল নাকি? 😐', fx: 'মচাৎ!' },
    accuse: ['আমার চশমা!', 'কিছু দেখতে পাচ্ছি না!'], accuseK: ['শালা চশমা ভাঙলি!', 'অন্ধ করে দিলি হারামি!'],
    ending: 'নতুন চশমার টাকা? সবার হাতখরচ থেকে কাটা গেল 👓',
  },
  {
    id: 'remote', open: 'common', anim: 'tvoff', bn: 'রিমোট যুদ্ধ', en: 'Remote Wars', item: '<div class="emoji big">📺</div>',
    setup: { bg: 'bg-common', title: 'কমন রুম • রাত ৯টা', bn: 'ক্রিকেট ফাইনাল! শেষ ওভার, শেষ বল…', en: 'Cricket final. Last over. Last ball…' },
    act: { bn: '{C} রিমোট নিয়ে সিরিয়াল চালিয়ে দিল!', en: '{C} grabbed the remote and switched to his serial.', say: 'আমার সিরিয়াল 😌', fx: 'ক্লিক!' },
    accuse: ['ছক্কাটা মিস করালি!', 'রিমোট দে!'], accuseK: ['শালা সিরিয়ালখোর!', 'রিমোট দে হারামি!'],
    ending: 'সুপার স্যার টিভিতেই তালা মেরে দিলেন 📺🔒',
  },
  {
    id: 'sixer', open: 'campus', anim: 'sixer', bn: 'ছক্কা ও কাচ', en: 'Six and Smash', item: '<div class="emoji big">🏏</div>',
    setup: { bg: 'bg-field', title: 'কলেজের মাঠ • বিকেল', bn: '{V}-এর ব্যাট, {V}-এর বল। ব্যাট করছে {C}।', en: '{V}\'s bat. {V}\'s ball. {C} is batting.' },
    act: { bn: '{C}-এর ছক্কায় প্রিন্সিপালের জানলা চুরমার!', en: '{C} hit a six straight through the principal\'s window.', say: 'ওটা {V} মেরেছে 😇', fx: 'ঝনঝন!' },
    accuse: ['আমার নাম দিলি কেন?!', 'মিথ্যুক!'], accuseK: ['শালা মিথ্যুক!', 'হারামি, নিজে মেরে আমার নাম!'],
    ending: 'জানলার কাচের টাকা কাটা গেল চারজনের হাতখরচ থেকে 🪟',
  },
  {
    id: 'cap', open: 'winter', anim: 'capon', bn: 'মাঙ্কি টুপি', en: 'The Monkey Cap', item: '<div class="emoji big">🧢</div>',
    setup: { bg: 'bg-winter', title: 'হোস্টেল • শীতের ভোর', bn: 'হাড়কাঁপানো শীত! {V}-এর একটাই মাঙ্কি টুপি।', en: 'Freezing winter morning. {V} owns exactly one monkey cap.' },
    act: { bn: '{C} টুপিটা পরে লেপের তলায় ঢুকে গেল!', en: '{C} pulled it on and vanished under the quilt.', say: 'আহা, কী গরম! 😌', fx: 'হাঁচ্চো!' },
    accuse: ['আমার মাঙ্কি টুপি!', 'কান জমে গেল রে!'], accuseK: ['শালা টুপি চোর!', 'হারামি, টুপি ফেরত দে!'],
    ending: 'সুপার স্যার সবাইকে ভোর ৫টায় ঠান্ডা জলে স্নান করালেন 🥶',
  },
];

// each level opens with its own incident (level 1 → luchi … level 10 → results day)
export const LEVEL_STORY = ['luchi', 'remote', 'dim', 'sixer', 'pen', 'glasses', 'prank', 'pant', 'cap', 'exam'];
export const storyForLevel = levelIdx => {
  const i = STORIES.findIndex(s => s.id === LEVEL_STORY[levelIdx % LEVEL_STORY.length]);
  return i < 0 ? 0 : i;
};

// ---------------- slide building ----------------
const FACES = { happy: '•‿•', grin: '^▽^', angry: 'ò_ó', mad: 'ಠ_ಠ', cry: 'T_T', shock: 'O_O', sleep: '-_-', smug: '¬‿¬', ouch: '>_<', dizzy: '@_@' };
const POS = ['4%', '28%', '52%', '76%']; // 4 friends
function buddy(c, i, face, cls = '', extra = '', left = POS[i]) {
  return `<div class="buddy ${cls}" style="left:${left};${extra}"><div class="head"><div class="face">${FACES[face] || face}</div></div>
    <div class="body" style="background:${c.colors[i]}"></div><div class="legs"></div><i class="hand l"></i><i class="hand r"></i>
    <div class="nm">${c.names[i]}</div></div>`;
}
function superSir(cls = '', left = '40%', extra = '') {
  return `<div class="buddy super ${cls}" style="left:${left};${extra}"><div class="head"><div class="face">◉_◉</div></div>
    <div class="body"></div><div class="legs"></div><i class="cane"></i><div class="nm">সুপার স্যার</div></div>`;
}
const at = i => (i >= 2 ? 'right:2%' : `left:${POS[i]}`); // keep bubbles on screen
const AROUND = ['1%', '21%', '62%', '81%']; // friends standing either side of Super Sir in the middle
// v = voice (clip playback rate) the bubble is spoken in; see voicekey.js
const bub = (text, pos, delay = 0, v = 1) => `<div class="sbub" data-v="${v}" style="${pos};animation-delay:${delay}s">${text}</div>`;
const pow = (text, pos, delay = 0) => `<div class="pow2" style="${pos};animation-delay:${delay}s">${text}</div>`;
const fill = (s, c) => s.replace(/\{C\}/g, c.names[c.culprit]).replace(/\{V\}/g, c.names[c.victim]);

// first slide of every story: a different hostel / campus moment
function opener(kind, c) {
  const all = [0, 1, 2, 3];
  const row = (face, cls = '') => all.map(i => buddy(c, i, face, cls, `animation-delay:${i * 0.15}s`)).join('');
  const O = {
    wake: { bg: 'bg-room', title: 'বয়েজ হোস্টেল • সকাল', bn: 'অ্যালার্ম বাজছে… কেউ উঠছে না।',
      html: `<div class="bunk" style="left:4%"></div><div class="bunk" style="left:54%"></div><div class="alarm shake">⏰</div>
        ${all.map(i => buddy(c, i, i % 2 ? 'sleep' : 'happy', i % 2 ? 'sleepy' : 'bounce', `animation-delay:${i * 0.15}s`)).join('')}
        <div class="zzz" style="left:26%;top:30%">Z z z</div><div class="zzz" style="left:64%;top:26%;animation-delay:.6s">Z z z</div>` },
    mess: { bg: 'bg-mess', title: 'মেস • রাতের খাবার', bn: 'ঢং ঢং! মেসের ঘণ্টা পড়ল!',
      html: `<div class="messbell swing">🔔</div><div class="table"></div>${all.map(i => buddy(c, i, 'grin', 'run dash' + (i ? i + 1 : ''), '', '0')).join('')}` },
    sunday: { bg: 'bg-sunny', title: 'রবিবার • ছুটির সকাল', bn: 'ছুটির দিন! সবাই আড়মোড়া ভাঙছে।',
      html: `<div class="sun spin">☀️</div>${row('happy', 'stretch')}` },
    common: { bg: 'bg-common', title: 'কমন রুম', bn: 'আজ ক্রিকেট ফাইনাল! কমন রুম হাউসফুল।',
      html: `<div class="tv on"><span>🏏 ৬ বলে ১২</span></div>${row('grin', 'bounce')}` },
    campus: { bg: 'bg-field', title: 'কলেজের মাঠ', bn: 'ক্লাস শেষ। মাঠে ক্রিকেট!',
      html: `<div class="gate"><span>বন্ধু মহাবিদ্যালয়</span></div><div class="ball bouncing">🏐</div>${row('grin', 'bounce')}` },
    examhall: { bg: 'bg-exam', title: 'পরীক্ষার হল', bn: 'পরীক্ষার হলে পিন-পতন নীরবতা…',
      html: `<div class="clock tick">🕘</div><div class="desks"></div>${row('shock')}` },
    night: { bg: 'bg-night', title: 'রাত ২টো • রুম ২০৪', bn: 'সারা হোস্টেল ঘুমোচ্ছে… প্রায়।',
      html: `<div class="moon">🌙</div><div class="bunk" style="left:4%"></div><div class="bunk" style="left:54%"></div>${row('sleep', 'sleepy')}
        <div class="zzz" style="left:20%;top:28%">Z z z</div><div class="zzz" style="left:70%;top:24%;animation-delay:.6s">Z z z</div>` },
    corridor: { bg: 'bg-corridor', title: 'হোস্টেলের করিডোর', bn: 'করিডোরে কুস্তি প্রতিযোগিতা!',
      html: `<div class="doors"></div>${all.map(i => buddy(c, i, 'grin', 'shake', `animation-delay:${i * 0.1}s`)).join('')}${pow('কুস্তি!', 'left:40%;top:10%', 0.3)}` },
    winter: { bg: 'bg-winter', title: 'হোস্টেল • শীতের ভোর', bn: 'হাড়কাঁপানো শীত! সবাই কাঁপছে।',
      html: `<div class="snow"></div>${row('ouch', 'shiver')}` },
    notice: { bg: 'bg-campus', title: 'কলেজ ক্যাম্পাস', bn: 'আজ রেজাল্ট বেরোবে! বুক ধুকপুক…',
      html: `<div class="board shut">নোটিশ বোর্ড<br>⏳ রেজাল্ট আসছে…</div>${row('shock', 'shiver')}` },
  };
  const o = O[kind] || O.wake;
  return { bg: o.bg, title: o.title, html: o.html, bn: o.bn, en: '' };
}
// scenery for each setting (setup slide and incident slide)
const PROPS = {
  'bg-mess': () => '<div class="table"></div><div class="plate"></div>',
  'bg-exam': (c, C) => `<div class="board">রেজাল্ট<br>১. ${c.names[C]} — ১০০<br>২. বাকি সবাই — ফেল ❌</div>`,
  'bg-common': (c, C, act) => `<div class="tv ${act ? 'switch' : 'on'}"><span>🏏 শেষ বল!</span><span class="serial">😭 সিরিয়াল</span></div>`,
  'bg-field': (c, C, act) => `<div class="pwindow ${act ? 'smash' : ''}">🪟</div>`,
  'bg-winter': () => '<div class="snow"></div>',
};

export function introSlides(story, c, slang) {
  const lv = slangLevel(slang), foul = lv >= 2, mild = lv === 1;
  const C = c.culprit, V = c.victim, all = [0, 1, 2, 3];
  const others = all.filter(i => i !== C);
  const acc = foul ? story.accuseK : story.accuse;
  return [
    opener(story.open, c),
    { bg: story.setup.bg, title: story.setup.title,
      html: `${PROPS[story.setup.bg] ? PROPS[story.setup.bg](c, C) : ''}
        <div class="itemSpot zoom">${story.item}</div>
        ${all.map(i => buddy(c, i, story.id === 'prank' && i === V ? 'sleep' : 'happy', i === V && story.id === 'prank' ? 'sleepy' : '', '')).join('')}`,
      bn: fill(story.setup.bn, c), en: fill(story.setup.en, c) },
    { bg: story.setup.bg, title: 'তারপর…', sound: 'hurt',
      // each incident has its own animation: the item flies to the culprit (--cx) or the victim (--vx)
      html: `${PROPS[story.setup.bg] ? PROPS[story.setup.bg](c, C, true) : ''}
        <div class="itemSpot act-${story.anim}" style="--cx:calc(${POS[C]} + 30px);--vx:calc(${POS[V]} + 30px)">${story.item}</div>
        ${others.map(i => buddy(c, i, i === V ? 'shock' : 'mad', i === V ? 'shake' : '')).join('')}${buddy(c, C, 'smug', 'bounce')}
        ${pow(story.act.fx, 'left:30%;top:30%', 0.9)}${bub(fill(story.act.say, c), `${at(C)};top:12%`, 1.3, VR[C])}`,
      bn: fill(story.act.bn, c), en: fill(story.act.en, c) },
    { bg: 'bg-angry', title: 'রাগে আগুন!', sound: 'hurt',
      html: `${others.map(i => buddy(c, i, 'angry', 'shake')).join('')}${buddy(c, C, 'ouch', 'shake')}
        ${bub(acc[0], `${at(V)};top:6%`, 0.2, VR[V])}${bub(acc[1], 'right:4%;top:24%', 1.0, VR[others.find(i => i !== V)])}
        ${bub(foul ? 'কী বললি শালা?' : mild ? 'কী বললি বোকা পাঁঠা?' : 'কী বললি?', `${at(C)};top:40%`, 1.8, VR[C])}`,
      bn: 'কথা কাটাকাটি শুরু…', en: 'Words were exchanged. Loudly.' },
    { bg: 'bg-fight', title: 'ধুন্ধুমার!', sound: 'slap',
      html: `<div class="cloud shake"><div class="puff" style="left:20px;top:40px;width:120px;height:110px"></div>
        <div class="puff" style="left:100px;top:10px;width:130px;height:130px"></div><div class="puff" style="left:60px;top:90px;width:150px;height:100px"></div>
        <div class="fx" style="left:10px;top:20px">👊</div><div class="fx" style="left:200px;top:40px">🦶</div><div class="fx" style="left:120px;top:150px">💥</div>
        <div class="fx" style="left:90px;top:-20px">🩴</div><div class="fx" style="left:180px;top:130px">🪶</div><div class="fx" style="left:-10px;top:120px">🧦</div></div>
        ${pow('ধিসুম!', 'left:6%;top:12%', 0.2)}${pow('চটাস!', 'right:8%;top:22%', 0.6)}${pow('দুম!', 'left:12%;bottom:18%', 1.0)}${pow('ঢিসুম!', 'right:10%;bottom:10%', 1.4)}`,
      bn: 'চড়, লাথি, বালিশ, চটি — ধিসুম ধিসুম!', en: 'Slaps. Kicks. Pillows. Flying slippers.' },
    { bg: 'bg-room', title: 'হঠাৎ…', sound: 'whistle',
      html: `${superSir('bounce', '40%')}<div class="flash"></div>${pow('প্রিইইইই!', 'left:30%;top:8%', 0.1)}
        ${all.map(i => buddy(c, i, 'shock', 'shake', '', AROUND[i])).join('')}
        ${bub('সুপার স্যার আসছে!', 'left:2%;top:20%', 0.8, VR[0])}${bub('পালা!!!', 'right:4%;top:30%', 1.3, VR[3])}`,
      bn: 'সুপার স্যারের বাঁশি!', en: 'The Hostel Superintendent\'s whistle! Everybody RUN!' },
    { bg: 'bg-campus', title: 'কলেজ ক্যাম্পাস', sound: 'jump',
      html: `<div class="gate"><span>বন্ধু মহাবিদ্যালয়</span></div>
        ${buddy(c, C, 'grin', 'run dash', '', '0')}${others.map((i, k) => buddy(c, i, 'angry', `run dash${k + 2}`, '', '0')).join('')}
        ${bub(line('chase', slang, story, c.levelNo) || 'ধর ধর!', 'left:6%;top:8%', 0.5, VR[others[0]])}${bub('ধরে কেলাবো!', 'right:6%;top:20%', 1.2, VR[others[1]])}`,
      bn: 'ধর ধর! পালাচ্ছে!', en: 'Out of the hostel, through the campus…' },
    { bg: 'bg-city', title: c.levelName, sound: 'bark',
      html: `<div class="skyline"><div style="height:60%;background-color:#f2d27a"></div><div style="height:85%;background-color:#e8a87c"></div>
        <div style="height:50%;background-color:#b5d3a7"></div><div style="height:95%;background-color:#a8c5e0"></div><div style="height:70%;background-color:#d98e8e"></div></div>
        <div class="emo roadmove" style="bottom:4%">🛺</div><div class="emo roadmove" style="bottom:10%;animation-delay:.8s">🚲</div>
        <div class="emo roadmove" style="bottom:2%;animation-delay:1.5s">🐕🐕🐕</div><div class="emo bounce" style="left:40%;bottom:24%">🐄</div>
        ${bub('ঘেউ ঘেউ!', 'left:6%;top:6%', 0.3, DOG_RATE)}`,
      bn: 'রিকশা, অটো, টোটো, গরু, কুকুর… আর সুপার স্যার!', en: 'Into the streets! Somewhere ahead, the Superintendent is waiting…' },
  ];
}

export function endingSlides(story, c, slang) {
  const lv = slangLevel(slang), foul = lv >= 2;
  const all = [0, 1, 2, 3];
  return [
    { bg: 'bg-campus', title: 'শেষ সীমানা', sound: 'whistle',
      html: `${superSir('bounce', '41%')}${all.map(i => buddy(c, i, 'shock', 'shake', '', AROUND[i])).join('')}
        ${bub('ধরা পড়েছিস!', 'left:30%;top:6%', 0.3, SUPER_RATE)}${bub(foul ? 'ওরে শালা…' : 'এবার কী হবে?', 'left:2%;top:30%', 1, VR[0])}`,
      bn: 'শেষ সীমানায় দাঁড়িয়ে… সুপার স্যার!', en: 'At the finish line stood… the Superintendent.' },
    { bg: 'bg-room', title: 'শাস্তি', sound: 'beep',
      html: `${all.map(i => buddy(c, i, i === c.winner ? 'smug' : 'cry', 'situp ears', `animation-delay:${i * 0.1}s`)).join('')}
        <div class="count">১… ২… ৩… ৫০!</div>${bub('কান ধরে ৫০ বার ওঠবস!', 'left:20%;top:6%', 0.2, SUPER_RATE)}`,
      bn: 'কান ধরে ৫০ বার ওঠবস!', en: 'Fifty sit-ups. Holding your ears. All of you.' },
    { bg: 'bg-campus', title: 'হোস্টেলে ফেরা', sound: 'bell',
      html: `<div class="gate"><span>ছাত্রাবাস</span></div>
        ${all.map((i, k) => buddy(c, i, 'cry', `run march m${k}`, '', '0')).join('')}${superSir('run march m5', '0')}
        ${bub('চল হোস্টেলে!', 'right:6%;top:8%', 0.6, SUPER_RATE)}`,
      bn: 'সবাইকে কান ধরে হোস্টেলে ফেরানো হল।', en: 'And all four were marched back to the hostel.' },
    { bg: 'bg-mess', title: 'শেষ কথা', sound: 'win',
      html: `${superSir('bounce', '40%')}<div class="itemSpot zoom" style="top:14%">${story.item}</div>
        ${bub(fill(story.ending, c), 'left:4%;right:4%;top:58%;white-space:normal;text-align:center', 0.3)}`,
      bn: `প্রথম হয়েছে ${c.names[c.winner]}… কিন্তু শাস্তি সবার!`, en: `${c.enNames[c.winner]} came first. Didn't matter. Same punishment for everyone. 😂` },
  ];
}
