import { initSmoothScroll } from './smooth-scroll';
import { initReveals }      from './reveals';
import { initCursor }       from './cursor';
import { initMagnetic }     from './magnetic';
import { initHeroWebGL }    from './hero-webgl';

let heroCleanup: (() => void) | undefined;
let lenisStarted = false;

const boot = () => {
  if (!lenisStarted) {
    initSmoothScroll();
    initCursor();
    lenisStarted = true;
  }
  initReveals();
  initMagnetic();

  const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
  if (canvas && !canvas.dataset.webglBooted) {
    canvas.dataset.webglBooted = '1';
    heroCleanup?.();
    heroCleanup = initHeroWebGL(canvas);
  }
};

document.addEventListener('astro:page-load', boot);
