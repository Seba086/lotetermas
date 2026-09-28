import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import termasGeo from './data/termas.json';
import { PLACES } from './config.js';

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmtKm = (m) => {
  const km = m / 1000;
  return km < 10
    ? km.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : Math.round(km).toLocaleString('es-AR');
};

function pin(kind, label) {
  return L.divIcon({
    className: `map-pin map-pin--${kind}`,
    html: `<span class="map-pin__dot" role="img" aria-label="${label}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function initMap(el, { reduced = false } = {}) {
  const narrow = el.clientWidth < 640;
  const accent = css('--accent');
  const ink = css('--color-espresso-ink');
  const lote = L.latLng(PLACES.lote.center);

  const map = L.map(el, {
    zoomControl: true,
    scrollWheelZoom: false, // no atrapa el scroll de la página
    zoomSnap: 0.25,
    attributionControl: true,
  });
  // La rueda del mouse se habilita recién al interactuar con el mapa
  map.once('focus click', () => map.scrollWheelZoom.enable());

  const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services';
  const light = L.layerGroup([
    L.tileLayer(`${esri}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      attribution: 'Base &copy; Esri, HERE, Garmin, &copy; colaboradores de OpenStreetMap',
      maxNativeZoom: 16, maxZoom: 19, className: 'tiles-warm',
    }),
    L.tileLayer(`${esri}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
      maxNativeZoom: 16, maxZoom: 19, className: 'tiles-warm',
    }),
  ]).addTo(map);
  const satellite = L.tileLayer(`${esri}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
    attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  });

  /* ---------- capa entorno ---------- */
  const entorno = L.layerGroup();

  const termas = L.geoJSON(termasGeo, {
    style: { color: ink, weight: 1.5, fillColor: ink, fillOpacity: 0.08, dashArray: '4 4' },
  }).bindTooltip('Complejo Termas Tapalqué', { className: 'map-label', direction: 'top', offset: [0, -6] });
  termas.addTo(entorno);

  const lotPoly = L.polygon(PLACES.lote.polygon, {
    color: accent, weight: 2, fillColor: accent, fillOpacity: 0.35,
  }).addTo(entorno);

  L.marker(lote, { icon: pin('lot', 'Lote hotelero'), keyboard: false, zIndexOffset: 1000 })
    .bindTooltip(narrow ? 'Lote hotelero' : 'Lote hotelero · 5.000–10.000 m²', {
      permanent: true, direction: narrow ? 'top' : 'right', offset: narrow ? [0, -14] : [16, 0], className: 'map-label map-label--lot',
    })
    .addTo(entorno);

  const centro = L.latLng(PLACES.centro);
  L.marker(centro, { icon: pin('city', 'Centro de Tapalqué'), keyboard: false })
    .bindTooltip('Centro de Tapalqué', {
      permanent: true, direction: narrow ? 'bottom' : 'left', offset: narrow ? [0, 12] : [-12, 0], className: 'map-label',
    })
    .addTo(entorno);

  const dCentro = lote.distanceTo(centro);
  L.polyline([lote, centro], { color: accent, weight: 2, dashArray: '6 6' }).addTo(entorno);
  const mid = L.latLng((lote.lat + centro.lat) / 2, (lote.lng + centro.lng) / 2);
  L.tooltip({ permanent: true, direction: 'center', className: 'map-label map-label--dist', interactive: false })
    .setLatLng(mid).setContent(`${fmtKm(dCentro)} km`).addTo(entorno);

  /* ---------- capa región ---------- */
  const region = L.layerGroup();
  L.marker(lote, { icon: pin('lot', 'Termas Tapalqué'), keyboard: false, zIndexOffset: 1000 })
    .bindTooltip('Termas Tapalqué', { permanent: true, direction: 'left', offset: [-16, 0], className: 'map-label map-label--lot' })
    .addTo(region);

  const distances = { centro: dCentro };
  Object.entries(PLACES.ciudades).forEach(([key, city]) => {
    const ll = L.latLng(city.coords);
    const d = lote.distanceTo(ll);
    distances[key] = d;
    L.polyline([lote, ll], { color: accent, weight: 1.5, dashArray: '5 6', opacity: 0.9 }).addTo(region);
    L.marker(ll, { icon: pin('town', city.name), keyboard: false })
      .bindTooltip(narrow ? city.name : `${city.name} · ${fmtKm(d)} km`, {
        permanent: true, direction: city.dir, offset: { top: [0, -8], bottom: [0, 8], right: [10, 0], left: [-10, 0] }[city.dir], className: 'map-label',
      })
      .addTo(region);
  });

  // Distancias en la grilla bajo el mapa
  document.querySelectorAll('[data-dist]').forEach((dd) => {
    const d = distances[dd.dataset.dist];
    if (d != null) dd.innerHTML = `${fmtKm(d)}<small>km</small>`;
  });

  /* ---------- vistas ---------- */
  const entornoBounds = L.latLngBounds([centro]).extend(lotPoly.getBounds()).extend(termas.getBounds());
  const regionBounds = L.latLngBounds([lote, ...Object.values(PLACES.ciudades).map((c) => c.coords)]);
  const pad = narrow
    ? { paddingTopLeft: [110, 70], paddingBottomRight: [70, 60] }
    : { paddingTopLeft: [180, 60], paddingBottomRight: [240, 60] };

  let current = 'entorno';
  function setView(view, animate = !reduced) {
    current = view;
    if (view === 'entorno') {
      map.removeLayer(region); entorno.addTo(map);
      animate ? map.flyToBounds(entornoBounds, { ...pad, duration: 1.4 }) : map.fitBounds(entornoBounds, pad);
    } else {
      map.removeLayer(entorno); region.addTo(map);
      animate ? map.flyToBounds(regionBounds, { ...pad, duration: 1.6 }) : map.fitBounds(regionBounds, pad);
    }
    document.querySelectorAll('[data-map-view]').forEach((b) => {
      const on = b.dataset.mapView === view;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }
  // La vista elegida queda en la URL (?mapa=region) para poder compartirla
  const params = new URLSearchParams(location.search);
  setView(params.get('mapa') === 'region' ? 'region' : 'entorno', false);

  document.querySelectorAll('[data-map-view]').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.dataset.mapView === current) return;
      setView(b.dataset.mapView);
      const url = new URL(location.href);
      if (current === 'region') url.searchParams.set('mapa', 'region');
      else url.searchParams.delete('mapa');
      history.replaceState(null, '', url);
    });
  });

  const layerBtn = document.querySelector('[data-map-layer]');
  layerBtn?.addEventListener('click', () => {
    const toSat = !map.hasLayer(satellite);
    if (toSat) { map.removeLayer(light); satellite.addTo(map); }
    else { map.removeLayer(satellite); light.addTo(map); }
    layerBtn.setAttribute('aria-pressed', String(toSat));
    layerBtn.classList.toggle('is-active', toSat);
  });

  // Recalcular tamaño si el contenedor cambia
  new ResizeObserver(() => map.invalidateSize()).observe(el);
  return map;
}
