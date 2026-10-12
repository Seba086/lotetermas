import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const FOS = 0.5;
const FOT = 0.5;
const FLOOR_H = 4; // m por nivel (referencia)
const nf = new Intl.NumberFormat('es-AR');

/* ---------- Volumetría isométrica ---------- */
export function initVolume({ reduced }) {
  const g = document.querySelector('[data-volume-g]');
  const pbOut = document.querySelector('[data-vol-pb]');
  const COS = Math.cos(Math.PI / 6), SIN = 0.5;
  const S_SCALE = 2.05; // px por metro
  const Z = 3; // exageración vertical para que la altura se lea
  const state = { area: 7500, p: reduced ? 1 : 0 };

  function render() {
    const { area, p } = state;
    const W = Math.sqrt(area * 4 / 3); // lote de proporción 4:3
    const D = area / W;
    const ox = 200 - ((W - D) * COS * S_SCALE) / 2;
    const oy = 150 - ((W + D) * SIN * S_SCALE) / 2 + 12;
    const iso = (x, y, z = 0) => [ox + (x - y) * COS * S_SCALE, oy + (x + y) * SIN * S_SCALE - z * Z * S_SCALE];
    const pts = (arr) => arr.map((a) => iso(...a).map((n) => n.toFixed(1)).join(',')).join(' ');

    const box = (x0, y0, z0, w, d, h, cls) => {
      if (h <= 0.01) return '';
      const x1 = x0 + w, y1 = y0 + d, z1 = z0 + h;
      return `
        <polygon class="v-face ${cls}-l" points="${pts([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])}"/>
        <polygon class="v-face ${cls}-r" points="${pts([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])}"/>
        <polygon class="v-face ${cls}-top" points="${pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])}"/>`;
    };

    // el nivel superior solo existe si el FOT supera al FOS
    const kPb = Math.sqrt(FOS), kUp = Math.sqrt(Math.max(0, FOT - FOS));
    const w = W * kPb, d = D * kPb;
    const w2 = W * kUp, d2 = D * kUp;
    const x0 = (W - w) / 2, y0 = (D - d) / 2;
    const h1 = FLOOR_H * Math.min(1, p * 2);
    const h2 = FLOOR_H * Math.max(0, Math.min(1, (p - 0.5) * 2));

    g.innerHTML = `
      <polygon class="v-plate" points="${pts([[0, 0], [W, 0], [W, D], [0, D]])}"/>
      ${box(x0, y0, 0, w, d, h1, 'v-pb')}
      ${kUp > 0 ? box(x0 + (w - w2) * 0.15, y0 + (d - d2) * 0.15, h1, w2, d2, h2, 'v-up') : ''}`;
    pbOut.textContent = nf.format(area * FOS);
  }

  if (!reduced) {
    ScrollTrigger.create({
      trigger: '[data-volume]',
      start: 'top 85%',
      end: 'center 45%',
      scrub: 0.6,
      onUpdate: (st) => { state.p = st.progress; render(); },
    });
  }
  render();
  return { setArea(a) { state.area = a; render(); } };
}

/* ---------- Waffle de plazas y personas ---------- */
export function initWaffles({ reduced }) {
  document.querySelectorAll('[data-waffle]').forEach((el) => {
    el.innerHTML = '<i></i>'.repeat(Number(el.dataset.waffle));
    if (reduced) return;
    const dots = el.children;
    gsap.set(dots, { scale: 0 });
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      gsap.to(dots, { scale: 1, duration: 0.5, ease: 'back.out(2)', stagger: { each: 0.012, from: 'start' } });
    }, { rootMargin: '0px 0px -15% 0px' });
    io.observe(el);
  });
}
