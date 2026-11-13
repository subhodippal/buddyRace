// All on-screen Bengali text that isn't dialogue lives in texts.json (project root): shop names, hoardings, market
// banners, road signs, landmark boards and the menu / button labels. Edit that file and reload — no code changes needed.
// Board lines are written "নাম | নিচের লেখা" (the part after | is a smaller second line).
async function load() {
  try { const r = await fetch(new URL('../texts.json', import.meta.url), { cache: 'no-cache' }); return await r.json(); }
  catch (e) { console.error('texts.json could not be loaded (check it for a missing comma or quote):', e); return {}; }
}
export const TEXTS = await load();
// "নাম | নিচের লেখা" → ['নাম', 'নিচের লেখা']; // more parts ("নাম | এক | দুই") go side by side on the second line: "এক • দুই"
export const split = s => { const [t, ...rest] = String(s).split('|').map(x => x.trim()); return [t, rest.filter(Boolean).join(' • ')]; };
// a list of boards (empty or broken entries dropped), falling back when the list is missing or empty
export const boards = (key, fallback = []) => {
  const L = (Array.isArray(TEXTS[key]) ? TEXTS[key] : []).filter(x => typeof x === 'string' && x.trim()).map(split);
  return L.length ? L : fallback;
};
// one named board, e.g. sign('roadSigns', 'finish')
export const sign = (group, key) => split((TEXTS[group] || {})[key] || '');
export const SHOP_NAMES = Array.isArray(TEXTS.shopNames) ? TEXTS.shopNames : [];
// menu labels: { "css selector": "html", "selector@attr": "attribute value" }
export const menuText = sel => (TEXTS.menu || {})[sel];
export function applyMenu(root = document) {
  for (const [key, val] of Object.entries(TEXTS.menu || {})) {
    if (typeof val !== 'string') continue;
    const [sel, attr] = key.split('@');
    let els; try { els = root.querySelectorAll(sel); } catch (e) { console.warn('texts.json menu: bad selector', sel); continue; }
    els.forEach(el => attr ? el.setAttribute(attr, val) : (el.innerHTML = val));
  }
}
