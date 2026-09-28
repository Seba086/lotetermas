import gsap from 'gsap';

const DURATION = 7; // segundos por diapositiva

/**
 * Slider del hero: 4 diapositivas con avance automático, pestañas con progreso,
 * anterior / siguiente, pausa (también pausa los videos de fondo), teclado y swipe.
 * `motion` es el estado compartido de pausa de toda la página.
 */
export function initSlider(root, { reduced, motion }) {
  const slides = [...root.querySelectorAll('[data-hs-slide]')];
  const tabs = [...root.querySelectorAll('[data-hs-tab]')];
  const live = root.querySelector('[data-hs-live]');
  const playBtn = root.querySelector('[data-hs-play]');
  let index = 0;
  let progress = null;
  let hoverPause = false;
  let inView = true;

  const bar = (i) => tabs[i].querySelector('.hs__bar span');
  const video = (i) => slides[i].querySelector('video');

  function setA11y() {
    slides.forEach((s, i) => {
      const on = i === index;
      s.toggleAttribute('inert', !on);
      s.setAttribute('aria-hidden', String(!on));
      s.classList.toggle('is-active', on);
    });
    tabs.forEach((t, i) => {
      const on = i === index;
      t.classList.toggle('is-active', on);
      t.classList.toggle('is-done', i < index);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
  }

  function syncVideos() {
    slides.forEach((_, i) => {
      const v = video(i);
      if (!v) return;
      if (i === index && !motion.paused && inView) v.play().catch(() => {});
      else v.pause();
    });
  }

  function startProgress() {
    progress?.kill();
    tabs.forEach((_, i) => gsap.set(bar(i), { scaleX: i < index ? 1 : 0 }));
    if (reduced) { gsap.set(bar(index), { scaleX: 1 }); return; }
    progress = gsap.fromTo(bar(index), { scaleX: 0 }, {
      scaleX: 1, duration: DURATION, ease: 'none',
      onComplete: () => go((index + 1) % slides.length, 1),
    });
    if (motion.paused || hoverPause || !inView) progress.pause();
  }

  function go(next, dir = 1, fromUser = false) {
    if (next === index) return;
    const prev = slides[index];
    const incoming = slides[next];
    if (!reduced) gsap.set(prev, { opacity: 1 }); // se mantiene visible durante el fundido
    index = next;
    live.setAttribute('aria-live', fromUser ? 'polite' : 'off');
    setA11y();
    syncVideos();

    if (!reduced) {
      const media = incoming.querySelector('.hs__bg');
      const lines = incoming.querySelectorAll('[data-hs-title] .line > span');
      const items = incoming.querySelectorAll('[data-hs-item]');
      gsap.set(prev, { zIndex: 1 });
      gsap.set(incoming, { zIndex: 2 });
      gsap.fromTo(incoming, { opacity: 0 }, {
        opacity: 1, duration: 1.1, ease: 'power2.inOut',
        onComplete: () => gsap.set(prev, { opacity: 0 }),
      });
      gsap.fromTo(media, { scale: 1.12, xPercent: 2 * dir }, { scale: 1, xPercent: 0, duration: 2.2, ease: 'expo.out' });
      gsap.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, delay: 0.25 });
      gsap.fromTo(items, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.45 });
    } else {
      slides.forEach((s) => { s.style.opacity = s === incoming ? '1' : '0'; });
    }
    startProgress();
  }

  function setPaused(p) {
    motion.paused = p;
    playBtn.setAttribute('aria-pressed', String(p));
    playBtn.setAttribute('aria-label', p ? 'Reproducir presentación y videos' : 'Pausar presentación y videos');
    if (p) progress?.pause(); else if (!hoverPause && inView) progress?.resume();
    syncVideos();
    motion.onChange?.(p);
  }

  // Controles
  tabs.forEach((t, i) => t.addEventListener('click', () => go(i, i > index ? 1 : -1, true)));
  root.querySelector('[data-hs-prev]').addEventListener('click', () => go((index - 1 + slides.length) % slides.length, -1, true));
  root.querySelector('[data-hs-next]').addEventListener('click', () => go((index + 1) % slides.length, 1, true));
  playBtn.addEventListener('click', () => setPaused(!motion.paused));

  // Teclado en las pestañas (patrón tablist)
  root.querySelector('.hs__tabs').addEventListener('keydown', (e) => {
    const map = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: slides.length - 1 - index };
    if (!(e.key in map)) return;
    e.preventDefault();
    const n = (index + map[e.key] + slides.length) % slides.length;
    go(n, map[e.key] >= 0 ? 1 : -1, true);
    tabs[n].focus();
  });

  // Pausa mientras se interactúa con el contenido o los controles
  root.querySelectorAll('.hs__controls, .hs__foot').forEach((el) => {
    el.addEventListener('pointerenter', () => { hoverPause = true; progress?.pause(); });
    el.addEventListener('pointerleave', () => { hoverPause = false; if (!motion.paused && inView) progress?.resume(); });
  });
  root.addEventListener('focusin', () => { hoverPause = true; progress?.pause(); });
  root.addEventListener('focusout', (e) => {
    if (root.contains(e.relatedTarget)) return;
    hoverPause = false;
    if (!motion.paused && inView) progress?.resume();
  });

  // Swipe táctil
  let x0 = null;
  root.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  root.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) go((index + (dx < 0 ? 1 : -1) + slides.length) % slides.length, dx < 0 ? 1 : -1, true);
  });

  // Sin reproducir cuando el hero no se ve
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView && !motion.paused && !hoverPause) progress?.resume(); else progress?.pause();
    syncVideos();
  }, { threshold: 0.2 }).observe(root);

  // Estado inicial
  setA11y();
  if (!reduced) {
    gsap.fromTo(slides[0].querySelectorAll('[data-hs-title] .line > span'), { yPercent: 110 }, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12, delay: 0.15 });
    gsap.fromTo(slides[0].querySelectorAll('[data-hs-item]'), { opacity: 0 }, { opacity: 1, duration: 1, stagger: 0.1, delay: 0.5 });
  }
  setPaused(motion.paused);
  startProgress();
}
