import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

/**
 * Galería de las termas: carrusel horizontal nativo (scroll + snap) con filtro por
 * categoría, arrastre con mouse, botones anterior/siguiente y barra de progreso.
 */
export function initGallery(root, { reduced }) {
  const viewport = root.querySelector('[data-gallery-viewport]');
  const cards = [...root.querySelectorAll('.gcard')];
  const filters = [...root.querySelectorAll('[data-filter]')];
  const status = root.querySelector('[data-gallery-status]');
  const prev = root.querySelector('[data-gallery-prev]');
  const next = root.querySelector('[data-gallery-next]');
  const bar = root.querySelector('[data-gallery-progress]');

  function update() {
    const max = viewport.scrollWidth - viewport.clientWidth;
    const p = max > 0 ? viewport.scrollLeft / max : 1;
    const visible = max > 0 ? viewport.clientWidth / viewport.scrollWidth : 1;
    bar.style.setProperty('--p', Math.max(visible, Math.min(1, p * (1 - visible) + visible)).toFixed(3));
    prev.disabled = viewport.scrollLeft <= 2;
    next.disabled = viewport.scrollLeft >= max - 2;
  }
  viewport.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  const step = () => {
    const card = cards.find((c) => !c.hidden);
    return card ? (card.offsetWidth + 15) * Math.max(1, Math.floor(viewport.clientWidth / (card.offsetWidth + 15)) - 1) : 300;
  };
  const behavior = reduced ? 'auto' : 'smooth';
  prev.addEventListener('click', () => viewport.scrollBy({ left: -step(), behavior }));
  next.addEventListener('click', () => viewport.scrollBy({ left: step(), behavior }));

  // Teclado sobre el carrusel
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); viewport.scrollBy({ left: step(), behavior }); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); viewport.scrollBy({ left: -step(), behavior }); }
  });

  // Arrastre con mouse (en táctil se usa el scroll nativo)
  let drag = null;
  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: viewport.scrollLeft, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; viewport.classList.add('is-dragging'); }
    if (drag.moved) viewport.scrollLeft = drag.left - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    viewport.classList.remove('is-dragging');
    if (moved) {
      // re-alinea con el snap más cercano
      const card = cards.find((c) => !c.hidden);
      if (card) {
        const w = card.offsetWidth + 15;
        viewport.scrollTo({ left: Math.round(viewport.scrollLeft / w) * w, behavior });
      }
    }
  });

  // Filtro
  filters.forEach((btn) => btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-pressed') === 'true') return;
    const cat = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    const state = reduced ? null : Flip.getState(cards);
    cards.forEach((c) => { c.hidden = cat !== 'all' && c.dataset.cat !== cat; });
    viewport.scrollLeft = 0;
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
    requestAnimationFrame(update);
  }));

  update();
}
