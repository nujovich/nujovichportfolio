import { initSmoothScroll }     from './smooth-scroll';
import { initReveals }          from './reveals';
import { initCursor }           from './cursor';
import { initMagnetic }         from './magnetic';
import { initHeroWebGL }        from './hero-webgl';
import { initCircularScroll }   from './circular-scroll';
import { initWebGLCarousels }   from './webgl-carousel';
import { initParallax }         from './parallax';
import { initProgressBar }      from './progress-bar';
import { initSpotlight }        from './spotlight';

let heroCleanup: (() => void) | undefined;
let lenisStarted = false;

const boot = () => {
  if (!lenisStarted) {
    initSmoothScroll();
    initCursor();
    initProgressBar();
    lenisStarted = true;
  }
  initReveals();
  initMagnetic();
  initSpotlight();
  initParallax();
  initCircularScroll();
  initWebGLCarousels();

  const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
  if (canvas && !canvas.dataset.webglBooted) {
    canvas.dataset.webglBooted = '1';
    heroCleanup?.();
    heroCleanup = initHeroWebGL(canvas);
  }
};

document.addEventListener('astro:page-load', boot);
