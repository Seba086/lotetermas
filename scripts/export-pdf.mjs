/**
 * Exporta la landing a un PDF de hojas iguales (1440 × 900 px, 16:10 apaisado).
 * Cada hoja lleva una franja con el número y el nombre del bloque. Los sliders se
 * despliegan (una slide por hoja) y los bloques largos se reparten en varias hojas
 * o se reacomodan para entrar en una.
 *
 * Uso:  npm run build && npm run pdf
 * Opcional: CHROME_PATH=ruta/a/chrome  ·  PDF_PREVIEW=carpeta (guarda un PNG por hoja)
 */
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1440;
const H = 900;
const LABEL_H = 56;
const AREA = H - LABEL_H; // alto disponible para el contenido de cada hoja
const OUT_DIR = 'exports';
const OUT_FILE = join(OUT_DIR, 'Lote-Hotelero-Termas-Tapalque.pdf');
const PREVIEW_DIR = process.env.PDF_PREVIEW;

// Fotos representativas de la galería (una por categoría)
const GALLERY_PICKS = ['piscinas-mujeres', 'familias-1', 'gastro-01', 'bienestar-1', 'complejo-1'];

/**
 * Hojas del PDF. `n` y `name` arman la franja superior; varias hojas pueden compartir bloque.
 * slide: índice de slide a mostrar · hide: partes de la sección que no van en esta hoja.
 */
const PAGES = [
  { n: 1, name: 'Portada', sel: '#inicio', slide: 0 },
  { n: 1, name: 'Portada', sel: '#inicio', slide: 1 },
  { n: 1, name: 'Portada', sel: '#inicio', slide: 2 },
  { n: 1, name: 'Portada', sel: '#inicio', slide: 3 },
  { n: 2, name: 'La oportunidad', sel: '#oportunidad' },
  { n: 3, name: 'Ubicación privilegiada', sel: '#corazon' },
  { n: 4, name: 'Una oportunidad única', sel: '#oportunidad-unica', hide: ['.chart', '.flow', '.unique__stays'] },
  { n: 4, name: 'Una oportunidad única', sel: '#oportunidad-unica', hide: ['.unique__head', '.unique__metric .metric', '.unique__copy', '.unique__stays'] },
  { n: 4, name: 'Una oportunidad única', sel: '#oportunidad-unica', hide: ['.unique__head', '.unique__demand'] },
  { n: 5, name: 'El lote', sel: '#lote', slide: 0 },
  { n: 5, name: 'El lote', sel: '#lote', slide: 1 },
  { n: 5, name: 'El lote', sel: '#lote', slide: 2 },
  { n: 6, name: 'Un complejo en crecimiento', sel: '[data-stages]' },
  { n: 7, name: 'El lote en números', sel: 'section.lot', hide: ['.lot__graphs', '.specs'] },
  { n: 7, name: 'El lote en números', sel: 'section.lot', hide: ['.lot__head', '.calc', '.specs'] },
  { n: 7, name: 'El lote en números', sel: 'section.lot', hide: ['.lot__head', '.calc', '.lot__graphs'] },
  { n: 8, name: 'Condiciones de venta', sel: 'section.terms', hide: ['.conditions'] },
  { n: 8, name: 'Condiciones de venta', sel: 'section.terms', hide: ['.timeline'] },
  { n: 9, name: 'Termas Tapalqué', sel: '#termas' },
  { n: 10, name: 'Galería del complejo', sel: '#galeria' },
  { n: 11, name: 'Ubicación y distancias', sel: '#ubicacion' },
  { n: 12, name: 'El destino', sel: '#destino' },
  { n: 13, name: 'Contacto', sel: '#contacto' },
];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);

/* Modo impresión: hojas de alto fijo, sliders desplegados y bloques reacomodados */
const PRINT_CSS = `
  .site-header, .wa, .skip-link, .hs__controls, .gallery__nav, .gallery__progress, .filters, .footer__word { display: none !important; }
  html, body { scroll-behavior: auto !important; }
  html body [data-pdf-hidden] { display: none !important; } /* partes que van en otra hoja */

  .pdf-label {
    display: flex; align-items: center; gap: 16px; height: ${LABEL_H}px; padding: 0 var(--gutter);
    background: var(--color-espresso-ink); color: var(--color-porcelain-cream);
    font-family: var(--font-systemia); font-size: 15px; font-weight: 500;
  }
  .pdf-label__n { font-family: var(--font-azeret-mono); color: var(--accent-on-dark); }
  .pdf-label__site { margin-left: auto; font-size: 12px; color: rgba(252, 246, 236, .6); font-weight: 400; }

  /* Cada sección ocupa el alto de la hoja con el contenido centrado */
  .pdf-page { min-height: ${AREA}px !important; height: auto !important; box-sizing: border-box; }
  .section.pdf-page, .gallery.pdf-page {
    display: flex !important; flex-direction: column; justify-content: center;
    padding-block: 44px !important;
  }
  .section.pdf-page > .container, .gallery.pdf-page > * { width: 100%; }

  /* Hero y El lote: una slide por hoja */
  .hero { min-height: 0 !important; }
  .hs__slides { position: static !important; }
  .hs__slide { position: relative !important; height: ${AREA}px; opacity: 1 !important; overflow: hidden; }
  .hs__content { padding-bottom: 72px !important; }
  .story { padding: 0 !important; }
  .story__media, .story__shade { display: none !important; }
  .story__stage.container { max-width: none; padding: 0; }
  .story__steps { position: static !important; display: block !important; margin: 0 !important; }
  .story__step {
    position: relative !important; inset: auto !important; opacity: 1 !important;
    height: ${AREA}px; display: grid !important; align-content: center; justify-items: center; gap: 30px;
    padding: 0 var(--gutter) !important;
    background:
      radial-gradient(ellipse 70% 60% at 50% 50%, rgba(46, 37, 33, .45) 0%, rgba(46, 37, 33, 0) 75%),
      linear-gradient(180deg, rgba(46, 37, 33, .6) 0%, rgba(46, 37, 33, .3) 30%, rgba(46, 37, 33, .3) 70%, rgba(46, 37, 33, .65) 100%),
      url(/video/terreno-poster.jpg) center / cover;
  }
  .story__card { position: static !important; }
  .video-band { min-height: ${AREA}px !important; }

  /* Una oportunidad única: el gráfico y el esquema, lado a lado en su propia hoja */
  .unique__demand.pdf-pair { grid-template-areas: "metric metric" "flow chart" !important; align-items: center; row-gap: 40px !important; }
  .unique__stays { margin-top: 0 !important; }

  /* Etapas: cada ilustración sobre su card */
  .stages__art { display: none !important; }
  .stages__title { margin-bottom: 36px !important; }
  .stage { transform: none !important; }
  .stage__bar { display: none !important; }
  .pdf-art { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: contain; margin-bottom: 12px; }

  /* El lote en números: cada parte en su hoja, sin márgenes heredados */
  .lot__graphs, .specs { margin-top: 0 !important; }
  .pcard { min-height: 330px !important; }
  .calc__hint { display: none !important; } /* el control no se puede mover en el PDF */

  /* Condiciones: la segunda hoja muestra el título y las tres condiciones */
  .terms__head ~ .conditions { margin-top: 60px; }

  /* Galería: pocas fotos representativas, grandes */
  .gcard[aria-hidden="true"], .gcard:not(.pdf-pick) { display: none !important; }
  .gallery__intro { margin-bottom: 40px !important; }
  .gallery__viewport { overflow: visible !important; }
  .gallery__track { display: grid !important; grid-template-columns: repeat(5, 1fr); gap: 20px; width: auto !important; transform: none !important; }
  .gcard { width: auto !important; }

  /* Ubicación: mapa y distancias en dos columnas */
  #ubicacion .container { display: grid; grid-template-columns: 1.6fr 1fr; column-gap: 48px; align-items: start; }
  #ubicacion .location__head { grid-column: 1 / -1; margin-bottom: 32px; }
  #ubicacion .map-wrap { grid-column: 1; grid-row: 2 / span 2; overflow: visible; background: none; }
  #ubicacion .seg { display: none !important; }
  /* la leyenda sale del mapa para no tapar Bahía Blanca */
  #ubicacion .map-legend { position: static !important; max-width: none; margin-top: 14px; padding: 12px 16px; }
  #ubicacion .map-legend ul { display: flex !important; flex-wrap: wrap; gap: 8px 24px; }
  #ubicacion .map { border-radius: var(--radius-cards); }
  #ubicacion .map { height: 430px !important; min-height: 0 !important; }
  #ubicacion .distances { grid-column: 2; grid-row: 2; margin-top: 0 !important; grid-template-columns: repeat(3, 1fr) !important; row-gap: 22px !important; }
  #ubicacion .distances dt { margin-bottom: 4px; }
  #ubicacion .footnote { grid-column: 2; grid-row: 3; }

  /* Destino: fotos más chicas */
  .destino__head { margin-bottom: 36px !important; }
  .mosaic { grid-template-rows: repeat(2, 185px) !important; }

  /* Contacto: imagen más baja para que entre con el formulario */
  .contact__figure { aspect-ratio: 16 / 7 !important; }
`;

function prepareForPrint(pages, picks) {
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
  document.querySelector('#lote')?.classList.remove('is-slider');

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

  // Galería: marca las fotos elegidas, en el orden de la lista
  const track = document.querySelector('#galeria [data-gallery-track]');
  picks.forEach((name) => {
    const card = [...track.querySelectorAll('.gcard:not([aria-hidden="true"])')]
      .find((c) => c.querySelector('img')?.getAttribute('src')?.includes(`/${name}.`));
    if (card) { card.hidden = false; card.classList.add('pdf-pick'); track.append(card); }
  });

  // Una franja por hoja (se muestra solo la de la hoja actual)
  pages.forEach((p, i) => {
    if (!document.querySelector(p.sel)) throw new Error(`No se encontró el bloque ${p.sel}`);
    const label = document.createElement('div');
    label.className = 'pdf-label';
    label.dataset.page = String(i);
    label.innerHTML = `<span class="pdf-label__n">${String(p.n).padStart(2, '0')}</span><span>${p.name}</span>`
      + '<span class="pdf-label__site">Lote hotelero · Termas Tapalqué</span>';
    document.querySelector('main').prepend(label);
  });
}

function showPage(p, i) {
  document.querySelectorAll('main > *, body > footer').forEach((el) => { el.style.display = 'none'; });
  document.querySelectorAll('[data-pdf-hidden]').forEach((el) => { el.style.display = ''; delete el.dataset.pdfHidden; });
  document.querySelectorAll('.pdf-page').forEach((el) => el.classList.remove('pdf-page'));
  document.querySelectorAll('.pdf-pair').forEach((el) => el.classList.remove('pdf-pair'));

  const label = document.querySelector(`.pdf-label[data-page="${i}"]`);
  const section = document.querySelector(p.sel);
  label.style.display = '';
  section.style.display = '';
  section.classList.add('pdf-page');

  // Partes de la sección que van en otras hojas
  (p.hide || []).forEach((s) => section.querySelectorAll(s).forEach((el) => {
    el.style.display = 'none'; el.dataset.pdfHidden = '';
  }));
  if ((p.hide || []).includes('.unique__metric .metric')) section.querySelector('.unique__demand')?.classList.add('pdf-pair');
  // Sliders: una slide por hoja
  section.querySelectorAll('.hs__slide, .story__step').forEach((s, k) => {
    if (p.slide != null && k !== p.slide) { s.style.display = 'none'; s.dataset.pdfHidden = ''; }
  });
  window.scrollTo(0, 0);
  return Math.ceil(section.getBoundingClientRect().height);
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

// Solo las visibles (las copias ocultas del loop nunca cargan) y con un tope de espera
async function waitForImages(page) {
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
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
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
  await page.evaluate(prepareForPrint, PAGES, GALLERY_PICKS);
  await waitForImages(page);
  await page.waitForNetworkIdle({ idleTime: 1200, timeout: 60000 }).catch(() => {});
  await page.evaluate(webpToJpeg);

  const out = await PDFDocument.create();
  out.setTitle('Lote hotelero en Termas Tapalqué');
  out.setAuthor('Municipio de Tapalqué');
  out.setSubject('Oportunidad de inversión para el primer hotel dentro del Complejo Termas Tapalqué');
  if (PREVIEW_DIR) mkdirSync(PREVIEW_DIR, { recursive: true });

  const overflow = [];
  for (let i = 0; i < PAGES.length; i++) {
    const p = PAGES[i];
    const height = await page.evaluate(showPage, p, i);
    if (p.sel === '#ubicacion') {
      // el mapa cambió de ancho: se vuelve a encuadrar la región
      // (los botones están ocultos en el PDF: se usan desde el DOM)
      // se espera a que el mapa tome su nuevo tamaño antes de encuadrar
      const clickView = (v) => page.evaluate((view) => document.querySelector(`[data-map-view="${view}"]`).click(), v);
      await new Promise((r) => setTimeout(r, 500));
      await clickView('entorno');
      await new Promise((r) => setTimeout(r, 300));
      await clickView('region');
      await page.waitForNetworkIdle({ idleTime: 800, timeout: 30000 }).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 300));
    await waitForImages(page);
    if (height > AREA) overflow.push(`${i + 1} ${p.name}: ${height}px (máx. ${AREA})`);

    const pdf = await page.pdf({ width: `${W}px`, height: `${H}px`, printBackground: true, pageRanges: '1' });
    const [pg] = await out.copyPages(await PDFDocument.load(pdf), [0]);
    out.addPage(pg);
    if (PREVIEW_DIR) await page.screenshot({ path: join(PREVIEW_DIR, `${String(i + 1).padStart(2, '0')}.png`), clip: { x: 0, y: 0, width: W, height: H } });
    console.log(`${String(i + 1).padStart(2, '0')}  ${p.name}  (${height}px)`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, await out.save());
  console.log(`\nPDF listo: ${OUT_FILE} · ${PAGES.length} hojas de ${W} × ${H} px`);
  if (overflow.length) console.warn(`\nAtención, contenido que no entra en la hoja:\n${overflow.join('\n')}`);
} finally {
  await browser.close();
  server.httpServer.close();
}
