// Shared by the game and tools/make-voices.mjs: how a line of text maps to a pre-rendered voice clip.
export const NAMES = ['তুমি', 'বন্ধু', 'পল্টু', 'গোপাল', 'কেলো', 'লম্বু', 'সুপার স্যার'];
export const voiceKey = s => String(s)
  .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
  .replace(/[….]{1,}/g, '…').replace(/\s+/g, ' ').replace(/^[\s,…!?।-]+|[\s,]+$/g, '').trim();
export function voiceId(k) { // FNV-1a, 8 hex chars
  let h = 0x811c9dc5;
  for (const ch of k) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// playback rate per runner slot: quick, and a bit different for each friend (পল্টু, গোপাল, কেলো, লম্বু)
export const VOICE_RATE = [1.16, 1.08, 1.22, 1.12], SUPER_RATE = 0.97, DOG_RATE = 1.35;

// which voice reads each list of the comment files (same in the game and in tools/make-voices.mjs)
export const VOICE_OF_KEY = {
  shopkeeperShout: 'shopkeeper', outsiderMale: 'bystander', outsiderFemale: 'female', walker: 'bystander', levelSpeceficOutsider: 'bystander',
  friendsFight: 'friend', friendChase: 'friend', friendFall: 'friend', levelSpeceficFriends: 'friend', superSir: 'super', driver: 'driver',
};
// the comment files and the audio/voice/<folder> that mirrors each one
export const VOICE_FILES = { slang: 'slangs.comment.json', noSlang: 'noslangs.comment.json' };
