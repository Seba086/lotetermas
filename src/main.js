import './styles.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import logoSvg from './assets/logo.svg?raw';
import { CONFIG } from './config.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nf = new Intl.NumberFormat('es-AR');
// ayocin: números en Azeret Mono, puntuación en la sans
const metricHTML = (n) => nf.format(n).replace(/[.,]/g, '<span class="metric__punct">$&</span>');

/* ---------- logo ---------- */
$$('[data-logo]').forEach((el) => { el.innerHTML = logoSvg; });

/* ---------- smooth scroll (desactivado con reduced motion) ---------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// Anclas internas: respetan Lenis y el header fijo
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === '#inicio' ? 0 : -8 });
    else target.scrollIntoView({ behavior: 'auto' });
    history.replaceState(null, '', id);
  });
});

/* ---------- header ---------- */
const header = $('[data-header]');
const hero = $('.hero');
const waBtn = $('[data-wa]');
let lastY = 0;
function onScrollHeader() {
  const y = window.scrollY;
  const pastHero = y > hero.offsetHeight - 80;
  header.classList.toggle('is-solid', pastHero);
  waBtn.classList.toggle('is-hidden', y < hero.offsetHeight * 0.6);
  header.classList.toggle('is-hidden', pastHero && y > lastY + 4 && y > 900);
  if (y < lastY - 4) header.classList.remove('is-hidden');
  lastY = y;
}
window.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();
header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

// Nav activa
$$('.site-nav a').forEach((link) => {
  const section = $(link.getAttribute('href'));
  if (!section) return;
  ScrollTrigger.create({
    trigger: section,
    start: 'top center',
    end: 'bottom center',
    onToggle: ({ isActive }) => link.setAttribute('aria-current', isActive ? 'true' : 'false'),
  });
});

/* ---------- videos de fondo ---------- */
const videos = $$('[data-video]');
const toggle = $('[data-video-toggle]');
let userPaused = reduced; // con reduced motion arrancan pausados
function setPausedUI() {
  toggle.setAttribute('aria-pressed', String(userPaused));
  toggle.setAttribute('aria-label', userPaused ? 'Reproducir videos de fondo' : 'Pausar videos de fondo');
}
function loadVideo(v) {
  const src = v.querySelector('source[data-src]');
  if (src && !src.src) { src.src = src.dataset.src; v.load(); }
}
const videoIO = new IntersectionObserver((entries) => {
  entries.forEach(({ target: v, isIntersecting }) => {
    if (isIntersecting) {
      loadVideo(v);
      if (!userPaused) v.play().catch(() => {});
    } else {
      v.pause();
    }
  });
}, { rootMargin: '200px 0px' });
videos.forEach((v) => {
  if (reduced) { v.removeAttribute('autoplay'); v.pause(); }
  videoIO.observe(v);
});
toggle.addEventListener('click', () => {
  userPaused = !userPaused;
  videos.forEach((v) => {
    if (userPaused) v.pause();
    else if (v.getBoundingClientRect().top < innerHeight && v.getBoundingClientRect().bottom > 0) { loadVideo(v); v.play().catch(() => {}); }
  });
  setPausedUI();
});
setPausedUI();

/* ---------- calculadora del lote ---------- */
const FOS = 0.5;
const FOT = 0.6;
const MAX = 10000;
const range = $('[data-lot-range]');
const out = {
  lot: $('[data-lot-out]'),
  fos: $('[data-fos-out]'),
  fot: $('[data-fot-out]'),
  fosBar: $('[data-fos-bar]'),
  fotBar: $('[data-fot-bar]'),
  live: $('[data-calc-live]'),
};
const plan = {
  lot: $('[data-plan-lot]'),
  fos: $('[data-plan-fos]'),
  tagLot: $('[data-plan-tag-lot]'),
  tagFos: $('[data-plan-tag-fos]'),
};
const W = 360, H = 260, CX = 200, CY = 150;
let liveTimer;
function updateCalc() {
  const s = Number(range.value);
  const fos = s * FOS;
  const fot = s * FOT;
  out.lot.textContent = nf.format(s);
  out.fos.textContent = nf.format(fos);
  out.fot.textContent = nf.format(fot);
  out.fosBar.style.transform = `scaleX(${fos / (MAX * FOT)})`;
  out.fotBar.style.transform = `scaleX(${fot / (MAX * FOT)})`;
  range.style.setProperty('--p', `${((s - 5000) / 5000) * 100}%`);
  range.setAttribute('aria-valuetext', `${nf.format(s)} metros cuadrados`);

  // Planta proporcional: el área del rectángulo escala con la superficie
  const k = Math.sqrt(s / MAX);
  const lw = W * k, lh = H * k;
  const lx = CX - lw / 2, ly = CY - lh / 2;
  const f = Math.sqrt(FOS);
  const fw = lw * f, fh = lh * f;
  const fx = CX - fw / 2, fy = CY - fh / 2;
  const d = reduced ? 0 : 0.6;
  const ease = 'expo.out';
  gsap.to(plan.lot, { attr: { x: lx, y: ly, width: lw, height: lh }, duration: d, ease, overwrite: 'auto' });
  gsap.to(plan.fos, { attr: { x: fx, y: fy, width: fw, height: fh }, duration: d, ease, overwrite: 'auto' });
  gsap.to(plan.tagLot, { attr: { x: lx + 10, y: ly + 20 }, duration: d, ease, overwrite: 'auto' });
  gsap.to(plan.tagFos, { attr: { x: fx + 10, y: fy + 20 }, duration: d, ease, overwrite: 'auto' });

  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    out.live.textContent = `Con ${nf.format(s)} m² de lote: huella máxima ${nf.format(fos)} m², superficie construible ${nf.format(fot)} m².`;
  }, 500);
}
range.addEventListener('input', updateCalc);
updateCalc();

/* ---------- WhatsApp ---------- */
const wa = $('[data-wa]');
if (CONFIG.whatsappNumber) {
  const text = encodeURIComponent(CONFIG.whatsappMessage);
  wa.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${text}`;
  wa.target = '_blank';
  wa.rel = 'noopener';
}

/* ---------- formulario ---------- */
const form = $('[data-form]');
const status = $('[data-form-status]');
const submit = $('[data-submit]');
const submitLabel = $('[data-submit-label]');
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setError(input, msg) {
  const err = input.parentElement.querySelector('[data-err]');
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (err) err.textContent = msg || '';
}
function validate() {
  const nombre = form.elements.nombre;
  const email = form.elements.email;
  let firstInvalid = null;
  if (!nombre.value.trim()) { setError(nombre, 'Ingresá tu nombre y apellido.'); firstInvalid ??= nombre; } else setError(nombre, '');
  if (!emailRe.test(email.value.trim())) { setError(email, 'Ingresá un correo válido, por ejemplo nombre@empresa.com.'); firstInvalid ??= email; } else setError(email, '');
  return firstInvalid;
}
// Aviso antes de salir si el formulario tiene datos sin enviar
let formDirty = false;
form.addEventListener('input', () => { formDirty = true; });
window.addEventListener('beforeunload', (e) => {
  if (formDirty) { e.preventDefault(); e.returnValue = ''; }
});

['nombre', 'email'].forEach((n) => form.elements[n].addEventListener('blur', () => {
  if (form.elements[n].getAttribute('aria-invalid') === 'true') validate();
}));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  status.classList.remove('is-error');
  const invalid = validate();
  if (invalid) { invalid.focus(); return; }
  if (form.elements._honey.value) return;

  submit.disabled = true;
  submitLabel.textContent = 'Enviando…';
  status.textContent = '';
  const data = Object.fromEntries(new FormData(form));
  delete data._honey;
  try {
    const res = await fetch(CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        ...data,
        _subject: `Consulta lote hotelero Termas Tapalqué: ${data.empresa || data.nombre}`,
        _template: 'table',
        _captcha: 'false',
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    form.reset();
    formDirty = false;
    status.textContent = '¡Gracias! Recibimos tu consulta y te vamos a contactar a la brevedad.';
    submitLabel.textContent = 'Enviado';
  } catch {
    status.classList.add('is-error');
    status.textContent = 'No pudimos enviar la consulta. Probá de nuevo en unos minutos o escribinos por WhatsApp.';
    submitLabel.textContent = 'Solicitar información';
  } finally {
    submit.disabled = false;
  }
});

/* ---------- mapa: se carga al acercarse ---------- */
const mapEl = $('#map');
const mapIO = new IntersectionObserver(async ([entry]) => {
  if (!entry.isIntersecting) return;
  mapIO.disconnect();
  const { initMap } = await import('./map.js');
  initMap(mapEl, { reduced });
}, { rootMargin: '600px 0px' });
mapIO.observe(mapEl);

/* =========================================================
   MOVIMIENTO
   ========================================================= */
if (!reduced) {
  // Hero: entrada
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .to('[data-hero-line]', { y: 0, duration: 1.4, stagger: 0.12, delay: 0.15 })
    .to('[data-hero-item]', { opacity: 1, duration: 1, stagger: 0.1 }, '-=1');

  // Hero: el titular se aleja al scrollear
  gsap.to('.hero__content', {
    yPercent: -12, opacity: 0.2, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Reveals: IntersectionObserver también detecta saltos directos (anclas, deep links)
  let queue = [];
  let flushing = false;
  const flush = () => {
    gsap.to(queue, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true });
    queue = [];
    flushing = false;
  };
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      revealIO.unobserve(entry.target);
      queue.push(entry.target);
    });
    if (queue.length && !flushing) { flushing = true; requestAnimationFrame(flush); }
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));

  // Statement palabra por palabra
  $$('[data-words]').forEach((el) => {
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
    gsap.fromTo(el.querySelectorAll('.w'), { opacity: 0.14 }, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });
  });

  // Parallax de fondos (5–15%)
  $$('[data-parallax-bg]').forEach((el) => {
    gsap.fromTo(el, { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  $$('[data-parallax-img]').forEach((img) => {
    gsap.fromTo(img, { yPercent: -10 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // Contadores
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = '0';
    gsap.to(obj, {
      v: end, duration: 2.2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: () => { el.innerHTML = metricHTML(Math.round(obj.v / 100) * 100); },
      onComplete: () => { el.innerHTML = metricHTML(end); },
    });
  });

  // Barras
  gsap.from('[data-bar]', {
    scaleY: 0, duration: 1.4, ease: 'expo.out', stagger: 0.15,
    scrollTrigger: { trigger: '.bars', start: 'top 80%', once: true },
  });

  // Línea de plazos y de etapas
  gsap.from('[data-timeline-line]', {
    scaleX: window.innerWidth > 700 ? 0 : 1, scaleY: window.innerWidth > 700 ? 1 : 0, ease: 'none',
    scrollTrigger: { trigger: '[data-timeline]', start: 'top 75%', end: 'bottom 55%', scrub: true },
  });
  gsap.from('.timeline__step', {
    opacity: 0, y: 20, stagger: 0.18, duration: 1, ease: 'expo.out',
    scrollTrigger: { trigger: '[data-timeline]', start: 'top 75%', once: true },
  });
  gsap.from('[data-stages-line]', {
    scaleX: 0, ease: 'none',
    scrollTrigger: { trigger: '[data-stages]', start: 'top 80%', end: 'top 35%', scrub: true },
  });
  gsap.from('.stage', {
    opacity: 0, y: 30, stagger: 0.1, duration: 1.1, ease: 'expo.out',
    scrollTrigger: { trigger: '[data-stages]', start: 'top 80%', once: true },
  });

  // Planta del lote: dibujo del contorno
  gsap.from('[data-plan-lot]', {
    strokeDashoffset: 1, duration: 1.6, ease: 'power2.out',
    scrollTrigger: { trigger: '[data-plan]', start: 'top 80%', once: true },
  });
  gsap.from('[data-plan-fos]', {
    opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 1.2, delay: 0.3, ease: 'expo.out',
    scrollTrigger: { trigger: '[data-plan]', start: 'top 80%', once: true },
  });

  // Galería horizontal fijada (solo desktop; en móvil es un carrusel con scroll-snap)
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const track = $('[data-gallery-track]');
    const viewport = $('.gallery__viewport');
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '[data-gallery]',
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });
  });

  // Palabra gigante del footer
  gsap.from('.footer__word', {
    yPercent: 40, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
  });
}

document.documentElement.classList.add('motion-ready');
window.addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
