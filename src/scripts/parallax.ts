/**
 * Cheap element-level parallax based on window.scrollY.
 * <div data-parallax="0.2"> — 0.2 = moves at 20% of scroll speed opposite direction
 */
export function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const els = document.querySelectorAll<HTMLElement>('[data-parallax]');
  if (!els.length) return;

  const items = Array.from(els).map((el) => ({
    el,
    speed: Number(el.dataset.parallax ?? '0.2'),
    offset: el.getBoundingClientRect().top + window.scrollY,
  }));

  let raf = 0;
  const update = () => {
    const y = window.scrollY;
    items.forEach(({ el, speed, offset }) => {
      const delta = (y - offset) * speed;
      el.style.transform = `translate3d(0, ${delta}px, 0)`;
    });
    raf = 0;
  };
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    items.forEach((i) => {
      i.el.style.transform = '';
      i.offset = i.el.getBoundingClientRect().top + window.scrollY;
    });
    update();
  });
  update();
}
