// Stories (a different hostel drama every race), dialogue lines, and the comic intro/ending slides.

// ---------------- dialogue ----------------
// Slang lines are only used when Settings → গালাগালি is মজার (mild) or কাঁচা খিস্তি (full).
export const LINES = {
  chase: ['ধর ধর!', 'ধরে কেলাবো!', 'ভালো হচ্ছে না কিন্তু!', 'দাঁড়া!', 'পালাবি কোথায়?', 'মার খাবি!', 'এই দাঁড়া বলছি!',
    'সুধীর ভাই!', 'মার গেরেছে!', 'ধর বাটাকে!', 'ধর শালা!', 'কী বললি শালা?', 'বোকা ছেলে!', 'হনু ডোচা!', 'ধর ব্যাটাকে!',
    'আজ তোর একদিন কি আমার একদিন!', 'পিটিয়ে লাল করে দেব!', 'আজ তোকে ছাড়ব না!', 'এক চড়ে দাঁত ফেলে দেব!',
    'গাধা কোথাকার!', 'হাঁদারাম!', 'উল্লুক!', 'ছাগল একটা!', 'ভ্যাবলা!', 'সুধীর ভাই, ধর ওকে!', 'হনু ডোচা কোথাকার!'],
  hurt: ['উফ!', 'আহ্!', 'বাবা গো!', 'মা গো!', 'দেখে নেব!', 'দাঁড়া তোকে দেখাচ্ছি!', 'মার গেরেছে!', 'লাগল রে!', 'কোমর গেল!', 'কী বললি শালা?'],
  dog: ['কুকুর!', 'পালা!', 'ওরে বাবা রে!', 'বাঁচাও!', 'জোরে দৌড়া!', 'সুধীর ভাই, কুকুর!'],
  crash: ['ওরে বাবা রে!', 'দেখে চালাও!', 'উফ!', 'মাথা গেল!', 'অন্ধ নাকি!'],
  brawl: ['ধিসুম!', 'ঢিসুম ঢিসুম!', 'নে খা!', 'এই নে!', 'আয় দেখি!', 'মার গেরেছে!', 'ধর শালা!', 'হনু ডোচা!'],
  ko: ['অজ্ঞান!', 'তারা দেখছি…', 'আমি আর নেই…'],
  bystander: ['এই! আস্তে!', 'কী হচ্ছে এসব?', 'পাগল নাকি!', 'দৌড়া দৌড়া!', 'আজকালকার ছেলেপিলে!', 'হোস্টেলের ছেলে নাকি?',
    'পুলিশ ডাকব!', 'জোরে জোরে!', 'বাহ্! কী দৌড়!', 'চা খেয়ে যা!', 'রাস্তাটা কি তোদের বাপের?', 'ও মা গো!', 'সাবধানে বাবা!',
    'কে জিতবে রে?', 'লাল জামাটা জিতবে!', 'এ কী কাণ্ড!', 'সুপার স্যারকে বলে দেব!', 'মারপিট করিস না!'],
  super: ['ধরা পড়েছিস!', 'কান ধর!', 'ওঠবস কর!', 'চল হোস্টেলে!', 'আজ তোদের হচ্ছে!', 'বাবা-মাকে চিঠি যাবে!'],
};
export const KHISTI = {
  chase: ['শালা!', 'হারামি!', 'হারামজাদা!', 'শুয়োরের বাচ্চা!', 'বোকাচোদা!', 'গান্ডু কোথাকার!', 'কুত্তার বাচ্চা!', 'বাল ছিঁড়বি?',
    'ঢ্যামনা ছেলে!', 'চোপ শালা!', 'শালা হারামি, দাঁড়া!', 'ধর শালা বোকাচোদাকে!', 'হারামির হাতবাক্স!', 'তোর বাপের কী রে শালা?',
    'বাল পাকা ছেলে!', 'শুয়োর কোথাকার!', 'চুতিয়া!', 'তোর মুখে ছাই, হারামি!'],
  hurt: ['শালা মারলি!', 'হারামি! লাগে না?', 'বোকাচোদা, দেখে মার!', 'বাল! লাগল!', 'শুয়োরের বাচ্চা!'],
  brawl: ['নে শালা!', 'খা হারামজাদা!', 'বোকাচোদা আয়!', 'গান্ডু, এদিকে আয়!'],
  crash: ['শালা অন্ধ নাকি!', 'হারামজাদা রিকশাওয়ালা!'],
  dog: ['শালা কুকুর!', 'হারামি কুকুর!'],
  bystander: ['শালা পাগল!', 'হারামজাদারা!', 'বাপের রাস্তা নাকি রে শালা?', 'বোকাচোদার দল!'],
};

// Mild slang (Settings → গালাগালি: মজার) — teasing that is rude but not filthy.
export const GALI = {
  chase: ['কানা ডোচা!', 'বোকা পাঁঠা!', 'কালা ডোচা!', 'আলবাল বকিস না!', 'তুই ছিঁড়ে নিবি?', 'শুয়োরের নাতি!',
    'দাঁড়া কানা ডোচা!', 'ধর বোকা পাঁঠাটাকে!', 'কালা ডোচা শুনতে পাস না?', 'হনু ডোচা কোথাকার!'],
  hurt: ['আলবাল বকিস না!', 'তুই ছিঁড়ে নিবি?', 'কানা ডোচা নাকি?', 'বোকা পাঁঠা!'],
  brawl: ['নে বোকা পাঁঠা!', 'খা শুয়োরের নাতি!', 'কানা ডোচা, এদিকে!', 'তুই ছিঁড়ে নিবি?'],
  crash: ['কানা ডোচা নাকি!', 'কানা ডোচা রিকশাওয়ালা!'],
  dog: ['বোকা পাঁঠা, কুকুর!', 'শুয়োরের নাতি কুকুর!'],
  bystander: ['বোকা পাঁঠার দল!', 'কানা ডোচা নাকি সব?', 'আলবাল দৌড়চ্ছে!'],
};
// Strong slang, only with গালাগালি: কাঁচা খিস্তি.
const KHISTI_MORE = {
  chase: ['চুদির ভাই লখন, কোথায় ছিলি এতক্ষণ?', 'কানা চোদা!', 'পাগলাচোদা!', 'গান্ডু!', 'গুদমারানির ভাই!', 'কেলানে চোদা!', 'কানে বাড়া ভরা আছে নাকি?', 'লাওড়া বিচি তুলে চট!',
    'বালের বন্ধু মারা!', 'তোর অণ্ডকোষ খণ্ড খণ্ড করে দেব!', 'মেরে গাঁড় ভেঙে দেব!', 'বালের দম নেই, দৌড়বি?'],
  hurt: ['কানা চোদা, দেখে মার!', 'মেরে গাঁড় ভেঙে দেব!', 'পাগলাচোদা মারলি কেন?', 'কেলানে চোদা!', 'বালের বন্ধু মারা!'],
  brawl: ['আয় কানা চোদা!', 'চুদির ভাই লখন, এতক্ষণ কোথায় ছিলি?', 'তোর অণ্ডকোষ খণ্ড করে দেব!', 'মেরে গাঁড় ভেঙে দেব!', 'আয় পাগলাচোদা!', 'নে গুদমারানির ভাই!', 'লাওড়া বিচি তুলে চট!'],
  bystander: ['কানা চোদার দল!', 'পাগলাচোদার দল!', 'বালের দম নেই, দৌড়চ্ছে!', 'কানে বাড়া ভরা নাকি?'],
};
for (const k in KHISTI_MORE) KHISTI[k] = (KHISTI[k] || []).concat(KHISTI_MORE[k]);

const pickA = a => a[(Math.random() * a.length) | 0];
// slang: 0 = off, 1 = mild (মজার গালি), 2 = full (কাঁচা খিস্তি). Old saves stored true/false.
export const slangLevel = v => (v === true ? 2 : v === false || v == null ? 0 : +v || 0);
export function line(cat, slang, story) {
  const lv = slangLevel(slang);
  if (story && story.lines[cat] && Math.random() < 0.3) {
    const f = lv >= 2 && story.khisti && story.khisti[cat];
    return pickA(f && Math.random() < 0.5 ? story.khisti[cat] : story.lines[cat]);
  }
  const pools = [];
  if (lv >= 1 && GALI[cat]) pools.push(GALI[cat]);
  if (lv >= 2 && KHISTI[cat]) pools.push(KHISTI[cat], KHISTI[cat]);
  if (pools.length && Math.random() < 0.55) return pickA(pickA(pools));
  return pickA(LINES[cat] || LINES.chase);
}

export const STORIES = [
  {
    id: 'luchi', bn: 'লুচি চোর', en: 'The Last Luchi', item: '<div class="luchi big"></div>',
    setup: { bg: 'bg-mess', title: 'মেস • সকাল ৮টা', bn: 'পাঁচজন বন্ধু। একটা প্লেট। একটাই লুচি।', en: 'Five friends. One plate. ONE last luchi.' },
    act: { bn: '{C} লুচিটা মুখে পুরে দিল!', en: '{C} stuffed the last luchi into his mouth. In one go.', say: 'মমম… দারুণ!', fx: 'ঘপাৎ!' },
    accuse: ['ওটা আমার লুচি ছিল!', 'লুচি চোর!'], accuseK: ['শালা লুচি চোর!', 'হারামি, লুচি ফেরত দে!'],
    lines: { chase: ['লুচি চোর!', 'ধর লুচি চোরকে!', 'লুচি ফেরত দে!'] }, khisti: { chase: ['শালা লুচি চোর!', 'লুচি চোর হারামি!'] },
    ending: 'আর লুচিটা? সুপার স্যার নিজেই খেয়ে নিলেন 😋',
  },
  {
    id: 'dim', bn: 'ডিম চোর', en: 'The Missing Egg', item: '<div class="emoji big">🥚</div>',
    setup: { bg: 'bg-mess', title: 'রবিবার • ডিমের ঝোল', bn: 'রবিবার মানে ডিমের ঝোল!', en: 'Sunday = egg curry. Five friends, five eggs… wait, FOUR eggs?' },
    act: { bn: '{C} ডিমটা পকেটে লুকিয়েছে!', en: '{C} hid an egg in his pocket. It cracked.', say: 'আমি কিছু জানি না 😇', fx: 'ক্র্যাক!' },
    accuse: ['আমার ডিম কোথায়?!', 'ডিম চোর!'], accuseK: ['ডিম চোর হারামি!', 'শালা ডিম চোর!'],
    lines: { chase: ['ডিম চোর!', 'ডিম ফেরত দে!', 'পকেটে ডিম!'] }, khisti: { chase: ['শালা ডিম চোর!', 'ডিম চোর বোকাচোদা!'] },
    ending: 'ডিমটা পাওয়া গেল সুপার স্যারের টিফিন বাক্সে 🥚',
  },
  {
    id: 'pen', bn: 'পেন চোর', en: 'The Lucky Pen', item: '<div class="emoji big">🖊️</div>',
    setup: { bg: 'bg-room', title: 'পরীক্ষার দিন • সকাল ৯টা', bn: 'আজ পরীক্ষা! লাকি পেন রেডি।', en: 'Exam day. {V} needs his lucky pen. It is not on the table.' },
    act: { bn: '{C} পেনটা "একটু ধার" নিয়েছে…', en: '{C} "borrowed" it. And chewed the cap.', say: 'একটু ধার নিয়েছিলাম 😅', fx: 'কুট কুট!' },
    accuse: ['আমার লাকি পেন!', 'পেন চোর!'], accuseK: ['শালা পেন চোর!', 'পেন দে হারামজাদা!'],
    lines: { chase: ['পেন চোর!', 'পেন ফেরত দে!', 'ঢাকনা চিবোলি কেন?'] }, khisti: { chase: ['শালা পেন চোর!'] },
    ending: 'পেনটা? সুপার স্যারের পকেটে। কালি শেষ 🖊️',
  },
  {
    id: 'exam', bn: 'রেজাল্ট', en: 'Results Day', item: '<div class="emoji big">📜</div>',
    setup: { bg: 'bg-exam', title: 'নোটিশ বোর্ড • রেজাল্ট', bn: 'রেজাল্ট বেরিয়েছে!', en: 'Results are out on the notice board…' },
    act: { bn: '{C} ফার্স্ট! বাকি সবাই ফেল!', en: '{C} topped the class. Everyone else FAILED.', say: 'আমি ফার্স্ট! 😎', fx: '১০০/১০০!' },
    accuse: ['নিশ্চয়ই টুকলি করেছিস!', 'টপার ধর!'], accuseK: ['শালা টপার!', 'টুকলিবাজ হারামি!'],
    lines: { chase: ['টপার ধর!', 'টুকলিবাজ!', 'নোট দিস নি কেন?'] }, khisti: { chase: ['শালা টপার!', 'টুকলিবাজ বোকাচোদা!'] },
    ending: 'সুপার স্যার সবাইকে ১০০ বার নামতা লেখালেন। টপারকেও ✍️',
  },
  {
    id: 'prank', bn: 'প্র্যাঙ্ক', en: 'The Toothpaste Prank', item: '<div class="emoji big">🪥</div>',
    setup: { bg: 'bg-night', title: 'রাত ২টো • রুম ২০৪', bn: '{V} নাক ডেকে ঘুমোচ্ছে…', en: '2 AM. {V} is snoring. {C} has toothpaste and a marker.' },
    act: { bn: '{C} মুখে গোঁফ এঁকে দিল!', en: 'Toothpaste moustache. Marker glasses. Masterpiece.', say: 'হি হি হি 🤭', fx: 'খিক খিক!' },
    accuse: ['আমার মুখে কী করেছিস?!', 'আয়নায় দেখে আয়!'], accuseK: ['শালা হারামি, মুখে কী এঁকেছিস?!', 'বোকাচোদা প্র্যাঙ্ক!'],
    lines: { chase: ['গোঁফ এঁকেছিস কেন?', 'মুখে টুথপেস্ট!', 'প্র্যাঙ্ক দেখাচ্ছি!'] }, khisti: { chase: ['শালা প্র্যাঙ্কবাজ!'] },
    ending: 'পরদিন সুপার স্যারের মুখেও কেউ গোঁফ এঁকে দিল… কে? 🤫',
  },
  {
    id: 'pant', bn: 'ছেঁড়া প্যান্ট', en: 'The Torn Pant', item: '<div class="emoji big">👖</div>',
    setup: { bg: 'bg-room', title: 'হোস্টেলের করিডোর', bn: 'মজার কুস্তি চলছিল…', en: 'Just a friendly wrestling match in the corridor…' },
    act: { bn: '{C} টানতেই {V}-এর প্যান্ট ছিঁড়ে গেল!', en: '{C} pulled. The pant went RRRIP. Right at the back.', say: 'উপ্স… 😬', fx: 'চ্যাঁৎ!' },
    accuse: ['প্যান্ট ছিঁড়ে দিলি!', 'সবাই দেখছে!'], accuseK: ['শালা প্যান্ট ছিঁড়লি!', 'হারামজাদা, নতুন প্যান্ট!'],
    lines: { chase: ['প্যান্ট ছেঁড়া!', 'নতুন প্যান্ট কিনে দে!', 'পেছনে হাওয়া লাগছে!'] }, khisti: { chase: ['শালা প্যান্ট ছেঁড়া!'] },
    ending: 'সুপার স্যার সবাইকে সূঁচ-সুতো ধরিয়ে দিলেন 🪡',
  },
  {
    id: 'glasses', bn: 'ভাঙা চশমা', en: 'The Broken Glasses', item: '<div class="emoji big">👓</div>',
    setup: { bg: 'bg-room', title: 'রুম ২০৪ • দুপুর', bn: '{V} চশমাটা বিছানায় রেখেছে…', en: '{V} left his glasses on the bed. Bad idea.' },
    act: { bn: '{C} ধপ করে বসে পড়ল!', en: '{C} sat right on them.', say: 'কিছু ভাঙল নাকি? 😐', fx: 'মচাৎ!' },
    accuse: ['আমার চশমা!', 'কিছু দেখতে পাচ্ছি না!'], accuseK: ['শালা চশমা ভাঙলি!', 'অন্ধ করে দিলি হারামি!'],
    lines: { chase: ['চশমা ভাঙলি কেন!', 'কিছু দেখতে পাচ্ছি না!', 'নতুন চশমা কিনে দে!'] }, khisti: { chase: ['শালা চশমা ভাঙা!'] },
    ending: 'নতুন চশমার টাকা? সবার হাতখরচ থেকে কাটা গেল 👓',
  },
];

// ---------------- slide building ----------------
const FACES = { happy: '•‿•', grin: '^▽^', angry: 'ò_ó', mad: 'ಠ_ಠ', cry: 'T_T', shock: 'O_O', sleep: '-_-', smug: '¬‿¬', ouch: '>_<', dizzy: '@_@' };
const POS = ['1%', '20%', '39%', '58%', '77%'];
function buddy(c, i, face, cls = '', extra = '', left = POS[i]) {
  return `<div class="buddy ${cls}" style="left:${left};${extra}"><div class="head"><div class="face">${FACES[face] || face}</div></div>
    <div class="body" style="background:${c.colors[i]}"></div><div class="legs"></div><i class="hand l"></i><i class="hand r"></i>
    <div class="nm">${c.names[i]}</div></div>`;
}
function superSir(cls = '', left = '40%', extra = '') {
  return `<div class="buddy super ${cls}" style="left:${left};${extra}"><div class="head"><div class="face">◉_◉</div></div>
    <div class="body"></div><div class="legs"></div><i class="cane"></i><div class="nm">সুপার স্যার</div></div>`;
}
const at = i => (i >= 3 ? 'right:2%' : `left:${POS[i]}`); // keep bubbles on screen
const bub = (text, pos, delay = 0) => `<div class="sbub" style="${pos};animation-delay:${delay}s">${text}</div>`;
const pow = (text, pos, delay = 0) => `<div class="pow2" style="${pos};animation-delay:${delay}s">${text}</div>`;
const fill = (s, c) => s.replace(/\{C\}/g, c.names[c.culprit]).replace(/\{V\}/g, c.names[c.victim]);

export function introSlides(story, c, slang) {
  const lv = slangLevel(slang), foul = lv >= 2, mild = lv === 1;
  const C = c.culprit, V = c.victim, all = [0, 1, 2, 3, 4];
  const others = all.filter(i => i !== C);
  const acc = foul ? story.accuseK : story.accuse;
  return [
    { bg: 'bg-room', title: 'বয়েজ হোস্টেল • আরেকটা দিন', sound: 'bell',
      html: `<div class="bunk" style="left:4%"></div><div class="bunk" style="left:54%"></div><div class="alarm shake">⏰</div>
        ${all.map(i => buddy(c, i, i % 2 ? 'sleep' : 'happy', i % 2 ? 'sleepy' : 'bounce', `animation-delay:${i * 0.15}s`)).join('')}
        <div class="zzz" style="left:26%;top:30%">Z z z</div><div class="zzz" style="left:64%;top:26%;animation-delay:.6s">Z z z</div>`,
      bn: 'হোস্টেলে রোজ কিছু না কিছু হয়…', en: 'Every day in the hostel, something happens. Today was no different.' },
    { bg: story.setup.bg, title: story.setup.title,
      html: `${story.setup.bg === 'bg-mess' ? '<div class="table"></div><div class="plate"></div>' : ''}${story.setup.bg === 'bg-exam' ? '<div class="board">রেজাল্ট<br>১. ' + c.names[C] + ' — ১০০<br>২. বাকি সবাই — ফেল ❌</div>' : ''}
        <div class="itemSpot zoom">${story.item}</div>
        ${all.map(i => buddy(c, i, story.id === 'prank' && i === V ? 'sleep' : 'happy', i === V && story.id === 'prank' ? 'sleepy' : '', '')).join('')}`,
      bn: fill(story.setup.bn, c), en: fill(story.setup.en, c) },
    { bg: story.setup.bg, title: 'তারপর…', sound: 'hurt',
      html: `<div class="itemSpot fly">${story.item}</div>
        ${others.map(i => buddy(c, i, i === V ? 'shock' : 'mad', i === V ? 'shake' : '')).join('')}${buddy(c, C, 'smug', 'bounce')}
        ${pow(story.act.fx, 'left:30%;top:30%', 0.5)}${bub(story.act.say, `${at(C)};top:12%`, 0.9)}`,
      bn: fill(story.act.bn, c), en: fill(story.act.en, c) },
    { bg: 'bg-angry', title: 'রাগে আগুন!', sound: 'hurt',
      html: `${others.map(i => buddy(c, i, 'angry', 'shake')).join('')}${buddy(c, C, 'ouch', 'shake')}
        ${bub(acc[0], `${at(V)};top:6%`, 0.2)}${bub(acc[1], 'right:4%;top:24%', 1.0)}
        ${bub(foul ? 'কী বললি শালা?' : mild ? 'কী বললি বোকা পাঁঠা?' : 'কী বললি?', `${at(C)};top:40%`, 1.8)}`,
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
        ${all.filter(i => i !== 2).map(i => buddy(c, i, 'shock', 'shake')).join('')}${buddy(c, 2, 'shock', 'shake', 'bottom:2%', '44%')}
        ${bub('সুপার স্যার আসছে!', 'left:2%;top:20%', 0.8)}${bub('পালা!!!', 'right:4%;top:30%', 1.3)}`,
      bn: 'সুপার স্যারের বাঁশি!', en: 'The Hostel Superintendent\'s whistle! Everybody RUN!' },
    { bg: 'bg-campus', title: 'কলেজ ক্যাম্পাস', sound: 'jump',
      html: `<div class="gate"><span>বন্ধু মহাবিদ্যালয়</span></div>
        ${buddy(c, C, 'grin', 'run dash', '', '0')}${others.map((i, k) => buddy(c, i, 'angry', `run dash${k + 2}`, '', '0')).join('')}
        ${bub(foul ? pickA(story.khisti.chase) : mild ? pickA(GALI.chase) : 'ধর ধর!', 'left:6%;top:8%', 0.5)}${bub('ধরে কেলাবো!', 'right:6%;top:20%', 1.2)}`,
      bn: 'ধর ধর! পালাচ্ছে!', en: 'Out of the hostel, through the campus…' },
    { bg: 'bg-city', title: c.levelName, sound: 'bark',
      html: `<div class="skyline"><div style="height:60%;background-color:#f2d27a"></div><div style="height:85%;background-color:#e8a87c"></div>
        <div style="height:50%;background-color:#b5d3a7"></div><div style="height:95%;background-color:#a8c5e0"></div><div style="height:70%;background-color:#d98e8e"></div></div>
        <div class="emo roadmove" style="bottom:4%">🛺</div><div class="emo roadmove" style="bottom:10%;animation-delay:.8s">🚲</div>
        <div class="emo roadmove" style="bottom:2%;animation-delay:1.5s">🐕🐕🐕</div><div class="emo bounce" style="left:40%;bottom:24%">🐄</div>
        ${bub('ঘেউ ঘেউ!', 'left:6%;top:6%', 0.3)}`,
      bn: 'রিকশা, অটো, টোটো, গরু, কুকুর… আর সুপার স্যার!', en: 'Into the streets! Somewhere ahead, the Superintendent is waiting…' },
  ];
}

export function endingSlides(story, c, slang) {
  const lv = slangLevel(slang), foul = lv >= 2;
  const all = [0, 1, 2, 3, 4];
  return [
    { bg: 'bg-campus', title: 'শেষ সীমানা', sound: 'whistle',
      html: `${superSir('bounce', '40%')}${all.filter(i => i !== 2).map(i => buddy(c, i, 'shock', 'shake')).join('')}
        ${bub('ধরা পড়েছিস!', 'left:30%;top:6%', 0.3)}${bub(foul ? 'ওরে শালা…' : 'এবার কী হবে?', 'left:2%;top:30%', 1)}`,
      bn: 'শেষ সীমানায় দাঁড়িয়ে… সুপার স্যার!', en: 'At the finish line stood… the Superintendent.' },
    { bg: 'bg-room', title: 'শাস্তি', sound: 'beep',
      html: `${all.map(i => buddy(c, i, i === c.winner ? 'smug' : 'cry', 'situp ears', `animation-delay:${i * 0.1}s`)).join('')}
        <div class="count">১… ২… ৩… ৫০!</div>${bub('কান ধরে ৫০ বার ওঠবস!', 'left:20%;top:6%', 0.2)}`,
      bn: 'কান ধরে ৫০ বার ওঠবস!', en: 'Fifty sit-ups. Holding your ears. All of you.' },
    { bg: 'bg-campus', title: 'হোস্টেলে ফেরা', sound: 'bell',
      html: `<div class="gate"><span>ছাত্রাবাস</span></div>
        ${all.map((i, k) => buddy(c, i, 'cry', `run march m${k}`, '', '0')).join('')}${superSir('run march m5', '0')}
        ${bub('চল হোস্টেলে!', 'right:6%;top:8%', 0.6)}`,
      bn: 'সবাইকে কান ধরে হোস্টেলে ফেরানো হল।', en: 'And all five were marched back to the hostel.' },
    { bg: 'bg-mess', title: 'শেষ কথা', sound: 'win',
      html: `${superSir('bounce', '40%')}<div class="itemSpot zoom" style="top:14%">${story.item}</div>
        ${bub(fill(story.ending, c), 'left:4%;right:4%;top:58%;white-space:normal;text-align:center', 0.3)}`,
      bn: `প্রথম হয়েছে ${c.names[c.winner]}… কিন্তু শাস্তি সবার!`, en: `${c.enNames[c.winner]} came first. Didn't matter. Same punishment for everyone. 😂` },
  ];
}
