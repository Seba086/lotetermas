import gsap from 'gsap';

const HOLD = 3; // segundos por etapa

/**
 * "Un complejo en crecimiento": las cuatro etapas avanzan solas. Cada una resalta
 * su card y cambia la ilustración y el fondo. Se puede elegir una etapa con un clic.
 * `motion` es el estado compartido de pausa de toda la página.
 */
export function initStages(root, { reduced, motion }) {
  if (!root) return;
  const cards = [...root.querySelectorAll('[data-stage]')];
  const imgs = [...root.querySelectorAll('[data-stages-img]')];
  const bgs = [...root.querySelectorAll('[data-stages-bg]')];
  const list = root.querySelector('.stages__list');
  let index = 0;
  let progress = null;
  let hold = false;
  let inView = false;

  const bar = (i) => cards[i].querySelector('.stage__bar span');
  const canRun = () => inView && !hold && !motion.paused;

  function show(i) {
    index = i;
    cards.forEach((c, k) => {
      c.classList.toggle('is-active', k === i);
      c.setAttribute('aria-pressed', String(k === i));
    });
    imgs.forEach((el, k) => el.classList.toggle('is-active', k === i));
    bgs.forEach((el, k) => el.classList.toggle('is-active', k === i));

    progress?.kill();
    cards.forEach((_, k) => gsap.set(bar(k), { scaleX: 0 }));
    if (reduced) { gsap.set(bar(i), { scaleX: 1 }); return; }
    progress = gsap.fromTo(bar(i), { scaleX: 0 }, {
      scaleX: 1, duration: HOLD, ease: 'none',
      onComplete: () => show((index + 1) % cards.length),
    });
    if (!canRun()) progress.pause();
  }
  const sync = () => { if (canRun()) progress?.resume(); else progress?.pause(); };

  cards.forEach((c, i) => c.addEventListener('click', () => show(i)));
  motion.subs.push(sync);

  // Pausa mientras se interactúa con las cards
  list.addEventListener('pointerenter', () => { hold = true; sync(); });
  list.addEventListener('pointerleave', () => { hold = false; sync(); });
  list.addEventListener('focusin', () => { hold = true; sync(); });
  list.addEventListener('focusout', (e) => { if (!list.contains(e.relatedTarget)) { hold = false; sync(); } });

  // Solo avanza cuando la sección se ve
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0.35 }).observe(root);

  show(0);
}
