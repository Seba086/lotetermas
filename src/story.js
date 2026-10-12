import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { initSlider } from './slider.js';

gsap.registerPlugin(SplitText);

/**
 * "El lote en números": fondo pleno con tres frases y sus cards de vidrio, con el
 * mismo slider que el hero. Las frases se parten en líneas para entrar desde una máscara.
 */
export function initStory(root, { reduced, motion }) {
  if (!root) return;
  root.classList.add('is-slider');
  if (!reduced) {
    // autoSplit recalcula las líneas al cambiar el ancho o al cargar las fuentes
    root.querySelectorAll('[data-story-phrase]').forEach((el) => SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'story__line', autoSplit: true,
    }));
  }
  initSlider(root, { reduced, motion });
}
