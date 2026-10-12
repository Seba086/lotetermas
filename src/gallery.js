import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

const SPEED = 45; // px por segundo
const COPIES = 3; // la tira se repite para que el loop no tenga costura

/**
 * Galería de las termas: tira horizontal en loop que avanza sola hacia la derecha
 * y se detiene al pasar el cursor. Mantiene filtro por categoría, arrastre con mouse,
 * scroll táctil, teclado y botones anterior / siguiente.
 * `motion` es el estado compartido de pausa de toda la página.
 */
export function initGallery(root, { reduced, motion }) {
  const viewport = root.querySelector('[data-gallery-viewport]');
  const track = root.querySelector('[data-gallery-track]');
  const cards = [...root.querySelectorAll('.gcard')];
  const filters = [...root.querySelectorAll('[data-filter]')];
  const status = root.querySelector('[data-gallery-status]');
  const prev = root.querySelector('[data-gallery-prev]');
  const next = root.querySelector('[data-gallery-next]');

  // Copias decorativas de la tira (ocultas para lectores de pantalla)
  const clones = [];
  for (let k = 1; k < COPIES; k++) {
    cards.forEach((card) => {
      const copy = card.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelector('img').alt = '';
      track.append(copy);
      clones.push(copy);
    });
  }
  const all = [...cards, ...clones];

  let pos = 0; // posición propia, con decimales (scrollLeft puede redondear)
  let lastSet = 0;
  let hover = false;
  let focused = false;
  let inView = false;
  let drag = null;
  let nudging = null;
  let userUntil = 0;
  let idleTimer;

  // Ancho de una copia: distancia entre una foto visible y su primera copia
  function setWidth() {
    const i = cards.findIndex((c) => !c.hidden);
    return i < 0 ? 0 : clones[i].offsetLeft - cards[i].offsetLeft;
  }
  // Lleva la posición a la copia del medio y la aplica: el salto no se ve
  function apply() {
    const w = setWidth();
    if (!w) return;
    while (pos < w * 0.5) pos += w;
    while (pos >= w * 1.5) pos -= w;
    viewport.scrollLeft = pos;
    lastSet = viewport.scrollLeft;
  }

  const running = () => !reduced && inView && !hover && !focused && !drag && !nudging
    && !motion.paused && performance.now() > userUntil;
  gsap.ticker.add((time, delta) => {
    if (!running()) return;
    pos -= SPEED * Math.min(delta, 50) / 1000; // las fotos se mueven hacia la derecha
    apply();
  });

  // Scroll hecho por la persona (táctil, trackpad): se respeta y el loop espera
  viewport.addEventListener('scroll', () => {
    if (Math.abs(viewport.scrollLeft - lastSet) <= 1) return;
    pos = viewport.scrollLeft;
    lastSet = pos;
    userUntil = performance.now() + 1500;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(apply, 200);
  }, { passive: true });
  window.addEventListener('resize', apply);

  viewport.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
  viewport.addEventListener('pointerleave', () => { hover = false; });
  viewport.addEventListener('focusin', () => { focused = true; });
  viewport.addEventListener('focusout', () => { focused = false; });
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { rootMargin: '100px 0px' }).observe(viewport);

  // Anterior / siguiente y teclado
  const step = () => {
    const card = cards.find((c) => !c.hidden);
    return card ? (card.offsetWidth + 15) * Math.max(1, Math.floor(viewport.clientWidth / (card.offsetWidth + 15)) - 1) : 300;
  };
  function nudge(dir) {
    const dist = dir * step();
    nudging?.kill();
    if (reduced) { pos += dist; apply(); return; }
    const o = { v: 0 };
    let done = 0;
    nudging = gsap.to(o, {
      v: dist, duration: 0.8, ease: 'power3.out',
      onUpdate: () => { pos += o.v - done; done = o.v; apply(); },
      onComplete: () => { nudging = null; },
    });
  }
  prev.addEventListener('click', () => nudge(-1));
  next.addEventListener('click', () => nudge(1));
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
  });

  // Arrastre con mouse (en táctil se usa el scroll nativo)
  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    nudging?.kill(); nudging = null;
    drag = { x: e.clientX, pos, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; viewport.classList.add('is-dragging'); }
    if (drag.moved) { pos = drag.pos - dx; apply(); }
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    viewport.classList.remove('is-dragging');
  });

  // Filtro
  filters.forEach((btn) => btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-pressed') === 'true') return;
    const cat = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const state = reduced ? null : Flip.getState(all);
    cards.forEach((c) => { c.hidden = cat !== 'all' && c.dataset.cat !== cat; });
    clones.forEach((c, i) => { c.hidden = cards[i % cards.length].hidden; });
    pos = setWidth();
    apply();
    if (state) {
      Flip.from(state, {
        duration: 0.7, ease: 'expo.out', absolute: false, scale: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' }),
        onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.2 }),
      });
    }
    const n = cards.filter((c) => !c.hidden).length;
    const label = btn.childNodes[0].textContent.trim();
    status.textContent = cat === 'all' ? `Mostrando las ${n} fotos` : `Mostrando ${n} fotos de ${label}`;
  }));

  pos = setWidth();
  apply();
}
