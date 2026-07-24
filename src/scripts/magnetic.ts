export function initMagnetic() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const els = document.querySelectorAll<HTMLElement>('[data-magnetic]');
  els.forEach((el) => {
    const strength = Number(el.dataset.magneticStrength ?? '0.25');
    let raf = 0;
    let tx = 0, ty = 0;
    let cx = 0, cy = 0;

    const loop = () => {
      cx += (tx - cx) * 0.15;
      cy += (ty - cy) * 0.15;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };

    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      tx = (e.clientX - (rect.left + rect.width  / 2)) * strength;
      ty = (e.clientY - (rect.top  + rect.height / 2)) * strength;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    el.addEventListener('pointerleave', () => {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(loop);
    });
  });
}
