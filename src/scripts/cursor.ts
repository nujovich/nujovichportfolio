export function initCursor() {
  // Only enable custom cursor on devices with a fine pointer (mouse)
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.custom-cursor')) return;

  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);

  const pos    = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const target = { x: pos.x, y: pos.y };

  const onMove = (e: PointerEvent) => {
    target.x = e.clientX;
    target.y = e.clientY;
  };
  window.addEventListener('pointermove', onMove);

  const HOVERABLE = 'a, button, [role="button"], [data-cursor-hover]';
  const onOver = (e: Event) => {
    const t = e.target as HTMLElement;
    if (t.closest(HOVERABLE)) cursor.classList.add('is-hover');
  };
  const onOut = (e: Event) => {
    const t = e.target as HTMLElement;
    if (t.closest(HOVERABLE)) cursor.classList.remove('is-hover');
  };
  document.addEventListener('pointerover', onOver);
  document.addEventListener('pointerout',  onOut);

  const onLeave = () => cursor.classList.add('is-hidden');
  const onEnter = () => cursor.classList.remove('is-hidden');
  document.addEventListener('pointerleave', onLeave);
  document.addEventListener('pointerenter', onEnter);

  let raf = 0;
  const render = () => {
    pos.x += (target.x - pos.x) * 0.18;
    pos.y += (target.y - pos.y) * 0.18;
    cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
    raf = requestAnimationFrame(render);
  };
  raf = requestAnimationFrame(render);
}
