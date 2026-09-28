import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * "El lote": fondo pleno fijo mientras se scrollea; tres frases entran línea por
 * línea (slide in desde una máscara) acompañadas por cards flotantes de vidrio.
 */
export function initStory(root, { reduced }) {
  if (!root || reduced) return;
  const pinEl = root.querySelector('.story__pin');
  const media = root.querySelector('[data-story-media]');
  const steps = [...root.querySelectorAll('[data-story-step]')];
  const dots = [...root.querySelectorAll('[data-story-dot]')];
  let splits = [];
  let pinST = null;
  let tl = null;

  function setDot(progress) {
    const i = Math.min(steps.length - 1, Math.floor(progress * steps.length * 0.999));
    dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
  }

  function build() {
    const progress = tl?.scrollTrigger?.progress ?? 0;
    tl?.scrollTrigger?.kill(); tl?.kill(); pinST?.kill();
    splits.forEach((s) => s.revert());

    splits = steps.map((step) => SplitText.create(step.querySelector('[data-story-phrase]'), {
      type: 'lines', mask: 'lines', linesClass: 'story__line',
    }));

    pinST = ScrollTrigger.create({
      trigger: root, pin: pinEl, start: 'top top', end: () => `+=${window.innerHeight * 3}`,
      invalidateOnRefresh: true,
      refreshPriority: 1, // el espaciador del pin afecta a todo lo que está debajo
    });

    tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      scrollTrigger: {
        trigger: root,
        start: 'top 45%',
        end: () => pinST.end,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (st) => setDot(st.progress),
      },
    });

    steps.forEach((step, i) => {
      const lines = splits[i].lines;
      const card = step.querySelector('[data-story-card]');
      const dir = card.classList.contains('story__card--b') ? -1 : 1;
      gsap.set(lines, { yPercent: 115 });
      gsap.set(card, { opacity: 0, x: 60 * dir });

      tl.to(lines, { yPercent: 0, duration: 0.7, stagger: 0.12 })
        .to(card, { opacity: 1, x: 0, duration: 0.7 }, '<0.25')
        .to({}, { duration: 0.7 }); // pausa de lectura
      if (i < steps.length - 1) {
        tl.to(lines, { yPercent: -115, duration: 0.45, stagger: 0.06, ease: 'power2.in' })
          .to(card, { opacity: 0, x: -30 * dir, duration: 0.4, ease: 'power2.in' }, '<');
      }
    });
    // el fondo se acerca lentamente durante todo el relato
    tl.fromTo(media, { scale: 1.14 }, { scale: 1, duration: tl.duration(), ease: 'none' }, 0);

    if (progress) tl.scrollTrigger.scroll(tl.scrollTrigger.start + progress * (tl.scrollTrigger.end - tl.scrollTrigger.start));
    setDot(progress);
  }

  // Las líneas dependen del ancho: se recalculan al cambiar el tamaño
  let lastW = window.innerWidth;
  let t;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - lastW) < 40) return; // ignora la barra de URL en móviles
    lastW = window.innerWidth;
    clearTimeout(t);
    t = setTimeout(() => { build(); ScrollTrigger.refresh(); }, 250);
  });

  (document.fonts?.ready ?? Promise.resolve()).then(() => { build(); ScrollTrigger.refresh(); });
}
