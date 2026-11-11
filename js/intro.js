// Comic-style slides that slide in one after another (used for the intro story and the ending).
import { startMusic, stopMusic } from './audio.js';

let active = null;
export function storyOpen() { return !!active; }
export function closeStory() { if (active) active(); }

export function playSlides(slides, onDone, { dur = 2700, skipLabel = 'Skip »' } = {}) {
  const root = document.getElementById('story');
  const wrap = document.getElementById('slides');
  const dots = document.getElementById('dots');
  wrap.innerHTML = slides.map(s => `<div class="slide"><div class="stage ${s.bg}"><div class="sceneTitle">${s.title}</div>${s.html}</div>
      <div class="caption"><span class="bn">${s.bn}</span></div></div>`).join('');
  dots.innerHTML = slides.map(() => '<i></i>').join('');
  document.getElementById('storySkip').textContent = skipLabel;
  root.classList.remove('hidden');
  const els = [...wrap.children];
  let idx = -1, timer = null, done = false;

  const finish = () => {
    if (done) return; done = true; active = null;
    clearTimeout(timer); stopMusic();
    root.classList.add('hidden'); wrap.innerHTML = '';
    root.removeEventListener('pointerup', onTap);
    onDone && onDone();
  };
  active = finish;
  const go = (n) => {
    clearTimeout(timer);
    if (n >= els.length) return finish();
    els.forEach((el, i) => { el.classList.toggle('active', i === n); el.classList.toggle('gone', i < n); });
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === n));
    els[n].querySelectorAll('*').forEach(e => { e.style.animationName = 'none'; void e.offsetWidth; e.style.animationName = ''; });
    idx = n;
    timer = setTimeout(() => go(n + 1), slides[n].dur || dur);
  };
  const onTap = (e) => { if (!e.target.closest('button')) go(idx + 1); };
  document.getElementById('storyNext').onclick = () => go(idx + 1);
  document.getElementById('storySkip').onclick = finish;
  root.addEventListener('pointerup', onTap);
  startMusic('action'); // no voices or effects here: just action music under the slides
  requestAnimationFrame(() => go(0));
}
