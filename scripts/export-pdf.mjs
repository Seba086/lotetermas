/**
 * Exporta la landing a un PDF: una página por bloque, con el alto exacto del bloque
 * (nada queda cortado entre hojas) y una franja con el número y el nombre del bloque.
 * Los sliders se despliegan: cada slide va debajo de la anterior.
 *
 * Uso:  npm run build && npm run pdf
 * Opcional: CHROME_PATH=ruta/a/chrome  ·  PDF_PREVIEW=carpeta (guarda un PNG por bloque)
 */
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const WIDTH = 1440;
const SLIDE_H = 900; // alto de cada slide desplegada (una pantalla de escritorio)
const OUT_DIR = 'exports';
const OUT_FILE = join(OUT_DIR, 'Lote-Hotelero-Termas-Tapalque.pdf');
const PREVIEW_DIR = process.env.PDF_PREVIEW;

// [selector, nombre del bloque, detalle opcional]
const BLOCKS = [
  ['#inicio', 'Portada', '4 slides'],
  ['#oportunidad', 'La oportunidad'],
  ['#corazon', 'Ubicación privilegiada'],
  ['#oportunidad-unica', 'Una oportunidad única'],
  ['#lote', 'El lote', '3 slides'],
  ['[data-stages]', 'Un complejo en crecimiento', '3 etapas'],
  ['section.lot', 'El lote en números'],
  ['section.terms', 'Condiciones de venta'],
  ['#termas', 'Termas Tapalqué'],
  ['#galeria', 'Galería del complejo'],
  ['#ubicacion', 'Ubicación y distancias'],
  ['#destino', 'El destino'],
  ['#contacto', 'Contacto'],
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);

/* Estilos del modo impresión: despliegan sliders y quitan lo que solo sirve en pantalla */
const PRINT_CSS = `
  .site-header, .wa, .skip-link, .hs__controls, .gallery__nav, .gallery__progress { display: none !important; }
  html, body { scroll-behavior: auto !important; }

  /* Al imprimir, vh/svh se miden contra la hoja: se fijan los valores de una pantalla de ${SLIDE_H}px */
  .video-band { min-height: ${SLIDE_H}px !important; }
  .stages { padding-block: 72px !important; }
  .map { height: ${Math.min(Math.round(SLIDE_H * 0.78), 720)}px !important; }

  .pdf-label {
    display: flex; align-items: center; gap: 16px; height: 56px; padding: 0 var(--gutter);
    background: var(--color-espresso-ink); color: var(--color-porcelain-cream);
    font-family: var(--font-systemia); font-size: 15px; font-weight: 500;
  }
  .pdf-label__n { font-family: var(--font-azeret-mono); color: var(--accent-on-dark); }
  .pdf-label__d { color: rgba(252, 246, 236, .6); font-weight: 400; }
  .pdf-label__site { margin-left: auto; font-size: 12px; color: rgba(252, 246, 236, .6); font-weight: 400; }
  .pdf-chip {
    position: absolute; top: 24px; right: var(--gutter); z-index: 5;
    padding: 6px 14px; border-radius: 9999px; background: var(--color-porcelain-cream); color: var(--color-espresso-ink);
    font-family: var(--font-azeret-mono); font-size: 12px; font-weight: 500;
  }

  /* Hero: las 4 slides una debajo de la otra */
  .hero { height: auto !important; min-height: 0 !important; }
  .hs__slides { position: static !important; }
  .hs__slide { position: relative !important; height: ${SLIDE_H}px; opacity: 1 !important; overflow: hidden; }
  .hs__slide + .hs__slide { border-top: 2px solid var(--color-porcelain-cream); }
  .hs__content { padding-bottom: 80px !important; }

  /* El lote: cada slide con su propio fondo pleno */
  .story { height: auto !important; padding: 0 !important; }
  .story__media, .story__shade { display: none !important; }
  .story__stage.container { max-width: none; padding: 0; }
  .story__steps { position: static !important; display: block !important; margin: 0 !important; }
  .story__step {
    position: relative !important; inset: auto !important; opacity: 1 !important;
    min-height: ${SLIDE_H}px; display: grid !important; align-content: center; justify-items: center; gap: 30px;
    padding: 80px var(--gutter) !important;
    background:
      radial-gradient(ellipse 70% 60% at 50% 50%, rgba(46, 37, 33, .45) 0%, rgba(46, 37, 33, 0) 75%),
      linear-gradient(180deg, rgba(46, 37, 33, .6) 0%, rgba(46, 37, 33, .3) 30%, rgba(46, 37, 33, .3) 70%, rgba(46, 37, 33, .65) 100%),
      url(/video/terreno-poster.jpg) center / cover;
  }
  .story__step + .story__step { border-top: 2px solid var(--color-porcelain-cream); }
  .story__card { position: static !important; }

  /* Etapas: cada ilustración sobre su card */
  .stages__art { display: none !important; }
  .stages__title { margin-bottom: 36px !important; }
  .stage { transform: none !important; }
  .stage__bar { display: none !important; }
  .pdf-art { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: contain; margin-bottom: 12px; }

  /* Galería: todas las fotos en grilla, sin las copias del loop */
  .gcard[aria-hidden="true"] { display: none !important; }
  .gallery__viewport { overflow: visible !important; }
  .gallery__track { flex-wrap: wrap; width: auto !important; transform: none !important; }
  .gcard { width: calc((100% - (var(--pdf-cols, 8) - 1) * 15px) / var(--pdf-cols, 8)) !important; }
`;

function prepareForPrint(blocks) {
  // Imágenes sin lazy-load y videos reemplazados por su póster (el PDF no imprime video)
  document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
  document.querySelectorAll('video').forEach((v) => {
    const img = document.createElement('img');
    img.src = v.getAttribute('poster');
    img.alt = '';
    img.className = v.className;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
    v.replaceWith(img);
  });

  // Etiquetas de slide
  const chips = (root, total) => root.forEach((el, i) => {
    const chip = document.createElement('span');
    chip.className = 'pdf-chip';
    chip.textContent = `Slide ${i + 1} de ${total}`;
    el.append(chip);
  });
  const heroSlides = [...document.querySelectorAll('#inicio .hs__slide')];
  chips(heroSlides, heroSlides.length);
  const storySteps = [...document.querySelectorAll('#lote .story__step')];
  document.querySelector('#lote')?.classList.remove('is-slider');
  chips(storySteps, storySteps.length);

  // Etapas: copia cada ilustración dentro de su card y quita el resaltado de la animación
  const arts = [...document.querySelectorAll('[data-stages-img]')];
  document.querySelectorAll('[data-stages] .stages__list li').forEach((li, i) => {
    if (!arts[i]) return;
    const img = arts[i].cloneNode();
    img.className = 'pdf-art';
    img.loading = 'eager';
    li.prepend(img);
  });
  document.querySelectorAll('[data-stage]').forEach((s) => s.classList.remove('is-active'));

  // Galería: muestra todas las fotos (por si quedó un filtro activo)
  const photos = [...document.querySelectorAll('#galeria .gcard:not([aria-hidden="true"])')];
  photos.forEach((c) => { c.hidden = false; });
  // columnas que llenen filas completas (33 fotos → 11 por fila); si no hay divisor, 8
  const cols = [11, 10, 9, 8, 12].find((n) => photos.length % n === 0) ?? 8;
  document.querySelector('#galeria').style.setProperty('--pdf-cols', String(cols));

  // Franja con número y nombre antes de cada bloque
  blocks.forEach(([sel, name, detail], i) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`No se encontró el bloque ${sel}`);
    const label = document.createElement('div');
    label.className = 'pdf-label';
    label.dataset.block = String(i);
    label.innerHTML = `<span class="pdf-label__n">${String(i + 1).padStart(2, '0')}</span><span>${name}</span>`
      + (detail ? `<span class="pdf-label__d">· ${detail}</span>` : '')
      + '<span class="pdf-label__site">Lote hotelero · Termas Tapalqué</span>';
    el.before(label);
    el.dataset.pdfBlock = String(i);
  });
}

function showOnly(i, last) {
  document.querySelectorAll('main > *, body > footer').forEach((el) => { el.style.display = 'none'; });
  const shown = [...document.querySelectorAll(`.pdf-label[data-block="${i}"], [data-pdf-block="${i}"]`)];
  if (last) shown.push(document.querySelector('body > footer'));
  shown.forEach((el) => { el.style.display = ''; });
  window.scrollTo(0, 0);
  // alto real del bloque (scrollHeight nunca baja del alto de la ventana)
  return Math.ceil(shown.reduce((h, el) => h + el.getBoundingClientRect().height, 0));
}

/* Chrome incrusta las WebP sin comprimir: se pasan a JPEG (calidad .82, hasta 2× el tamaño en pantalla) */
async function webpToJpeg() {
  const imgs = [...document.images].filter((img) => /\.webp(\?|$)/i.test(img.currentSrc || img.src));
  await Promise.all(imgs.map(async (img) => {
    try {
      if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r; });
      if (!img.naturalWidth) return;
      const shown = img.getBoundingClientRect().width || img.naturalWidth / 2;
      const scale = Math.min(1, (shown * 2) / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fcf6ec'; // fondo crema para las WebP con transparencia
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      img.removeAttribute('srcset');
      img.src = c.toDataURL('image/jpeg', 0.82);
    } catch { /* si falla, queda la imagen original */ }
  }));
}

async function waitForImages(page) {
  // Solo las visibles (las copias ocultas del loop nunca cargan) y con un tope de espera
  await page.evaluate(async () => {
    const pending = [...document.images].filter((img) => img.offsetParent !== null && !img.complete);
    const loads = Promise.all(pending.map((img) => new Promise((r) => { img.onload = img.onerror = r; })));
    await Promise.race([loads, new Promise((r) => setTimeout(r, 10000))]);
  });
}

const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!executablePath) throw new Error('No se encontró Chrome ni Edge. Indicá la ruta con CHROME_PATH.');
if (!existsSync('dist/index.html')) throw new Error('Falta el build: corré primero npm run build.');

const server = await preview({ preview: { port: 4180, strictPort: false, open: false }, logLevel: 'silent' });
const url = server.resolvedUrls.local[0];
const browser = await puppeteer.launch({ executablePath });

try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: SLIDE_H, deviceScaleFactor: 1 });
  // Movimiento reducido: el sitio muestra cada elemento en su estado final, sin animaciones
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.emulateMediaType('screen');
  await page.goto(`${url}?mapa=region`, { waitUntil: 'networkidle2' });

  // Recorre la página para que se inicialicen el mapa y lo que carga al acercarse
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.addStyleTag({ content: PRINT_CSS });
  await page.evaluate(prepareForPrint, BLOCKS);
  await waitForImages(page);
  await page.waitForNetworkIdle({ idleTime: 1200, timeout: 60000 }).catch(() => {});
  await page.evaluate(webpToJpeg);

  const out = await PDFDocument.create();
  out.setTitle('Lote hotelero en Termas Tapalqué');
  out.setAuthor('Municipio de Tapalqué');
  out.setSubject('Oportunidad de inversión para el primer hotel dentro del Complejo Termas Tapalqué');
  if (PREVIEW_DIR) mkdirSync(PREVIEW_DIR, { recursive: true });

  for (let i = 0; i < BLOCKS.length; i++) {
    const height = await page.evaluate(showOnly, i, i === BLOCKS.length - 1);
    await new Promise((r) => setTimeout(r, 300));
    await waitForImages(page);
    const pdf = await page.pdf({ width: `${WIDTH}px`, height: `${height}px`, printBackground: true, pageRanges: '1' });
    const [p] = await out.copyPages(await PDFDocument.load(pdf), [0]);
    out.addPage(p);
    if (PREVIEW_DIR) {
      await page.setViewport({ width: WIDTH, height, deviceScaleFactor: 0.5 });
      await page.screenshot({ path: join(PREVIEW_DIR, `${String(i + 1).padStart(2, '0')}.png`) });
      await page.setViewport({ width: WIDTH, height: SLIDE_H, deviceScaleFactor: 1 });
    }
    console.log(`${String(i + 1).padStart(2, '0')}  ${BLOCKS[i][1]}  (${height}px)`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, await out.save());
  console.log(`\nPDF listo: ${OUT_FILE}`);
} finally {
  await browser.close();
  server.httpServer.close();
}
