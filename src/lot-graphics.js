import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const FOS = 0.5;
const FOT = 0.6;
const FLOOR_H = 4; // m por nivel (referencia)
const nf = new Intl.NumberFormat('es-AR');

/* ---------- Volumetría isométrica ---------- */
export function initVolume({ reduced }) {
  const g = document.querySelector('[data-volume-g]');
  const pbOut = document.querySelector('[data-vol-pb]');
  const upOut = document.querySelector('[data-vol-up]');
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

    const kPb = Math.sqrt(FOS), kUp = Math.sqrt(FOT - FOS);
    const w = W * kPb, d = D * kPb;
    const w2 = W * kUp, d2 = D * kUp;
    const x0 = (W - w) / 2, y0 = (D - d) / 2;
    const h1 = FLOOR_H * Math.min(1, p * 2);
    const h2 = FLOOR_H * Math.max(0, Math.min(1, (p - 0.5) * 2));

    g.innerHTML = `
      <polygon class="v-plate" points="${pts([[0, 0], [W, 0], [W, D], [0, D]])}"/>
      ${box(x0, y0, 0, w, d, h1, 'v-pb')}
      ${box(x0 + (w - w2) * 0.15, y0 + (d - d2) * 0.15, h1, w2, d2, h2, 'v-up')}`;
    pbOut.textContent = nf.format(area * FOS);
    upOut.textContent = nf.format(area * (FOT - FOS));
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

/* ---------- Diagrama radial de servicios ---------- */
export function initHub({ reduced }) {
  const hub = document.querySelector('[data-hub]');
  if (!hub || reduced) return;
  const base = hub.querySelectorAll('.hub__base line');
  const flow = hub.querySelector('.hub__flow');
  const nodes = hub.querySelectorAll('.hub__node');
  const core = hub.querySelector('.hub__core');
  gsap.set(base, { strokeDashoffset: 1 });
  gsap.set(flow, { opacity: 0 });
  gsap.set(nodes, { opacity: 0, scale: 0.85 });
  gsap.set(core, { scale: 0.7, opacity: 0 });
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .to(core, { scale: 1, opacity: 1, duration: 1 })
      .to(base, { strokeDashoffset: 0, duration: 1, stagger: 0.06, ease: 'power2.out' }, '-=0.6')
      .to(nodes, { opacity: 1, scale: 1, duration: 0.8, stagger: 0.06 }, '-=0.9')
      .to(flow, { opacity: 1, duration: 0.8 }, '-=0.4');
  }, { rootMargin: '0px 0px -20% 0px' });
  io.observe(hub);
}

/* ---------- Captura simbólica del lote ---------- */
export function initLotShot({ reduced }) {
  const el = document.querySelector('[data-lotshot]');
  if (!el || reduced) return;
  const edge = el.querySelector('[data-lotshot-edge]');
  const area = el.querySelector('.lotshot__area');
  const pin = el.querySelector('.lotshot__pin');
  const tags = el.querySelectorAll('.lotshot__tags li');
  gsap.set(edge, { strokeDashoffset: 1 });
  gsap.set(area, { opacity: 0 });
  gsap.set(pin, { opacity: 0 });
  gsap.set(tags, { opacity: 0, y: 8 });
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    gsap.timeline({ delay: 0.3 })
      .to(edge, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' })
      .to(area, { opacity: 1, duration: 0.8 }, '-=0.4')
      .to(pin, { opacity: 1, duration: 0.4 }, '-=0.5')
      .to(tags, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'expo.out' }, '-=0.3');
  }, { threshold: 0.35 });
  io.observe(el);
}
