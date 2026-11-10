// Ten levels. Each is a list of road segments:
//   len (m), turn (degrees over the segment, + = left), hill (height m), bumps (hills count),
//   half (road half-width), surface: path | asphalt | soil | bridge, zone: campus | city | market | village | river | bridge,
//   junction: Y-junction decoration in the middle of the segment.
export const LEVELS = [
  {
    id: 1, bn: 'কলেজ থেকে পাড়া', en: 'College to the Para', seed: 11, dogs: [600], traffic: 0.85, aiBoost: 0,
    tags: '🏫 ক্যাম্পাস · 🏙 শহর · ↩ বাঁক',
    segments: [
      { len: 200, zone: 'campus', surface: 'path', half: 5.5 },
      { len: 160, zone: 'city', surface: 'asphalt', turn: 40 },
      { len: 180, zone: 'city', surface: 'asphalt' },
      { len: 200, zone: 'city', surface: 'asphalt', turn: -70 },
      { len: 160, zone: 'city', surface: 'asphalt', hill: 1.5 },
      { len: 160, zone: 'city', surface: 'asphalt', turn: 30 },
    ],
  },
  {
    id: 2, bn: 'বাজারের ভিড়', en: 'Market Rush', seed: 22, dogs: [520, 1050], traffic: 1, aiBoost: 0.3,
    tags: '🛒 বাজার · ↔ সরু গলি · Y মোড়',
    segments: [
      { len: 140, zone: 'campus', surface: 'path', half: 5.5 },
      { len: 180, zone: 'city', surface: 'asphalt', turn: 35 },
      { len: 260, zone: 'market', surface: 'asphalt', half: 4.2 },
      { len: 140, zone: 'city', surface: 'asphalt', junction: true },
      { len: 220, zone: 'market', surface: 'asphalt', half: 3.8, turn: -45 },
      { len: 240, zone: 'city', surface: 'asphalt', turn: 110 }, // long circular bend
      { len: 160, zone: 'city', surface: 'asphalt' },
    ],
  },
  {
    id: 3, bn: 'গ্রামের মেঠো পথ', en: 'Village Dirt Road', seed: 33, dogs: [480, 1020], traffic: 0.8, aiBoost: 0.5,
    tags: '🌾 গ্রাম · 🟫 মাটির রাস্তা · ⛰ উঁচু-নিচু',
    segments: [
      { len: 120, zone: 'campus', surface: 'path', half: 5.5 },
      { len: 140, zone: 'city', surface: 'asphalt' },
      { len: 240, zone: 'village', surface: 'soil', half: 5, turn: 45 },
      { len: 240, zone: 'village', surface: 'soil', half: 5, hill: 3, bumps: 3 },
      { len: 200, zone: 'village', surface: 'soil', half: 4.5, turn: -80 },
      { len: 240, zone: 'village', surface: 'soil', half: 3.6, hill: 2, bumps: 4 }, // narrow, bumpy off-road
      { len: 160, zone: 'village', surface: 'soil', half: 5, turn: 30 },
    ],
  },
  {
    id: 4, bn: 'নদীর ধারে', en: 'By the River', seed: 44, dogs: [420, 980], traffic: 1.05, aiBoost: 0.7,
    tags: '🌊 নদী · 🌉 সেতু · 🌾 গ্রাম',
    segments: [
      { len: 180, zone: 'city', surface: 'asphalt' },
      { len: 160, zone: 'city', surface: 'asphalt', turn: 50 },
      { len: 200, zone: 'river', surface: 'asphalt', turn: -35 },
      { len: 170, zone: 'bridge', surface: 'bridge', half: 5, hill: 2.2 },
      { len: 200, zone: 'village', surface: 'soil', half: 5, turn: 50 },
      { len: 200, zone: 'village', surface: 'soil', half: 4.5, hill: 2.5, bumps: 2 },
      { len: 200, zone: 'city', surface: 'asphalt', turn: -40 },
    ],
  },
  {
    id: 5, bn: 'মহা দৌড়', en: 'The Grand Chase', seed: 55, dogs: [480, 1200, 1850], traffic: 1.2, aiBoost: 1,
    tags: '🔥 সব কিছু একসাথে!',
    segments: [
      { len: 180, zone: 'campus', surface: 'path', half: 5.5 },
      { len: 180, zone: 'city', surface: 'asphalt', turn: 40 },
      { len: 220, zone: 'market', surface: 'asphalt', half: 4 },
      { len: 120, zone: 'city', surface: 'asphalt', junction: true },
      { len: 200, zone: 'city', surface: 'asphalt', turn: 100 },
      { len: 150, zone: 'river', surface: 'asphalt', turn: -20 },
      { len: 180, zone: 'bridge', surface: 'bridge', half: 5, hill: 2.2 },
      { len: 220, zone: 'village', surface: 'soil', half: 5, turn: -50 },
      { len: 220, zone: 'village', surface: 'soil', half: 4.5, hill: 3, bumps: 3 },
      { len: 160, zone: 'village', surface: 'soil', half: 3.6, turn: 25 },
      { len: 200, zone: 'city', surface: 'asphalt', turn: -40 },
      { len: 150, zone: 'market', surface: 'asphalt', half: 4.2 },
    ],
  },
  {
    id: 6, bn: 'গঙ্গার সেতু', en: 'The Long Bridge', seed: 66, dogs: [400, 1150], traffic: 1.15, aiBoost: 1.1, brawls: [0.3, 0.62],
    tags: '🌉 লম্বা সেতু · 🛵 বাইকের ভিড় · 🛒 বাজার',
    segments: [
      { len: 160, zone: 'campus', surface: 'path', half: 5.5 },
      { len: 180, zone: 'city', surface: 'asphalt', turn: -45 },
      { len: 160, zone: 'river', surface: 'asphalt', turn: 30 },
      { len: 320, zone: 'bridge', surface: 'bridge', half: 5.2, hill: 3 }, // long arched bridge
      { len: 140, zone: 'river', surface: 'asphalt', turn: -60 },
      { len: 220, zone: 'market', surface: 'asphalt', half: 4 },
      { len: 200, zone: 'city', surface: 'asphalt', turn: 70 },
    ],
  },
  {
    id: 7, bn: 'গলির গোলকধাঁধা', en: 'Lane Maze', seed: 77, dogs: [350, 800, 1250], traffic: 1.1, aiBoost: 1.2, brawls: [0.25, 0.5, 0.78],
    tags: '↔ সরু গলি · ↪↩ পাকে পাকে বাঁক · Y মোড় ×2 · 👊×3',
    segments: [
      { len: 120, zone: 'campus', surface: 'path', half: 5.5 },
      { len: 140, zone: 'city', surface: 'asphalt', half: 3.6, turn: 80 },
      { len: 120, zone: 'market', surface: 'asphalt', half: 3.4, turn: -90 },
      { len: 120, zone: 'city', surface: 'asphalt', half: 4.2, junction: true },
      { len: 150, zone: 'market', surface: 'asphalt', half: 3.3, turn: 100 },
      { len: 130, zone: 'city', surface: 'asphalt', half: 3.6, turn: -80 },
      { len: 130, zone: 'city', surface: 'asphalt', half: 4.5, junction: true },
      { len: 160, zone: 'market', surface: 'asphalt', half: 3.4, turn: 60 },
      { len: 180, zone: 'city', surface: 'asphalt', half: 3.8, turn: -120 }, // hairpin
      { len: 140, zone: 'city', surface: 'asphalt' },
    ],
  },
  {
    id: 8, bn: 'ধানক্ষেতের আলপথ', en: 'Paddy Field Trail', seed: 88, dogs: [450, 1000, 1500], traffic: 0.9, aiBoost: 1.3,
    tags: '🌾 আলপথ · ⛰⛰ ঢেউ খেলানো · 🐄🐐🐔 সব',
    segments: [
      { len: 120, zone: 'campus', surface: 'path', half: 5.5 },
      { len: 120, zone: 'city', surface: 'asphalt', turn: 30 },
      { len: 220, zone: 'village', surface: 'soil', half: 4, hill: 2.5, bumps: 4 },
      { len: 200, zone: 'village', surface: 'soil', half: 3.2, turn: -70 }, // very narrow
      { len: 160, zone: 'river', surface: 'soil', half: 4.5, turn: 40 },
      { len: 140, zone: 'bridge', surface: 'bridge', half: 3.8, hill: 1.5 }, // little village bridge
      { len: 240, zone: 'village', surface: 'soil', half: 3.4, hill: 3, bumps: 5 },
      { len: 200, zone: 'village', surface: 'soil', half: 4, turn: 90 },
      { len: 140, zone: 'village', surface: 'soil', half: 5 },
    ],
  },
  {
    id: 9, bn: 'পাহাড়ি রাস্তা', en: 'Hill Road', seed: 99, dogs: [500, 1100, 1650], traffic: 1.1, aiBoost: 1.45,
    tags: '⛰ খাড়া চড়াই-উতরাই · 🌀 গোল বাঁক · 🟫 অফ-রোড',
    segments: [
      { len: 140, zone: 'campus', surface: 'path', half: 5.5 },
      { len: 200, zone: 'city', surface: 'asphalt', hill: 5, turn: 60 },
      { len: 220, zone: 'city', surface: 'asphalt', turn: 100, hill: 3 }, // big circular climb
      { len: 200, zone: 'village', surface: 'soil', half: 4, hill: 6, bumps: 3 },
      { len: 160, zone: 'village', surface: 'soil', half: 3.6, turn: -150 },
      { len: 180, zone: 'river', surface: 'asphalt', hill: 2, turn: 30 },
      { len: 160, zone: 'bridge', surface: 'bridge', half: 4.6, hill: 2.5 },
      { len: 220, zone: 'village', surface: 'soil', half: 4, hill: 5, bumps: 4 },
      { len: 180, zone: 'city', surface: 'asphalt', turn: -70, hill: 2 },
    ],
  },
  {
    id: 10, bn: 'ফাইনাল: সুপারের দৌড়', en: 'Final: Super Showdown', seed: 1010, dogs: [420, 1050, 1700, 2350], traffic: 1.35, aiBoost: 1.7,
    brawls: [0.22, 0.45, 0.68, 0.88], tags: '💀 সবচেয়ে কঠিন · 👊×4 · 🐕×4',
    segments: [
      { len: 160, zone: 'campus', surface: 'path', half: 5.5 },
      { len: 160, zone: 'city', surface: 'asphalt', turn: 50 },
      { len: 200, zone: 'market', surface: 'asphalt', half: 3.6 },
      { len: 120, zone: 'city', surface: 'asphalt', junction: true },
      { len: 200, zone: 'city', surface: 'asphalt', turn: -130 },
      { len: 160, zone: 'river', surface: 'asphalt', turn: 30 },
      { len: 240, zone: 'bridge', surface: 'bridge', half: 5, hill: 3 },
      { len: 220, zone: 'village', surface: 'soil', half: 3.4, hill: 4, bumps: 4 },
      { len: 180, zone: 'village', surface: 'soil', half: 4.5, turn: 90 },
      { len: 160, zone: 'city', surface: 'asphalt', half: 3.6, turn: -60 },
      { len: 200, zone: 'market', surface: 'asphalt', half: 3.4, turn: 40 },
      { len: 180, zone: 'city', surface: 'asphalt', hill: 3, junction: true },
      { len: 220, zone: 'city', surface: 'asphalt', turn: 110 },
      { len: 160, zone: 'city', surface: 'asphalt' },
    ],
  },
];
