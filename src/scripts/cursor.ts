export function initCursor() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.querySelector('.custom-cursor')) return;

  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = `
    <svg class="custom-cursor__arrow" viewBox="0 0 32 32" width="28" height="28">
      <path
        d="M4 3.2 L4 24.6 L10.8 18.2 L14.4 26.5 L18.5 24.9 L14.9 16.8 L23.6 15.9 Z"
        fill="currentColor"
        stroke="rgba(0,0,0,0.35)"
        stroke-width="1"
        stroke-linejoin="round"
      />
    </svg>
    <span class="custom-cursor__label" aria-hidden="true"></span>
  `;
  document.body.appendChild(cursor);

  const arrow = cursor.querySelector<SVGElement>('.custom-cursor__arrow')!;
  const label = cursor.querySelector<HTMLElement>('.custom-cursor__label')!;

  const pos      = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const target   = { x: pos.x, y: pos.y };
  const prev     = { x: pos.x, y: pos.y };
  let angleTarget = 0;
  let angle       = 0;

  const onMove = (e: PointerEvent) => {
    target.x = e.clientX;
    target.y = e.clientY;
    // Toggle "on-ink" state when the pointer is over a section flagged with
    // [data-tinta-mode="ink"] so the cursor stays readable on dark spreads.
    const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const onInk = !!under?.closest('[data-tinta-mode="ink"]');
    cursor.classList.toggle('is-on-ink', onInk);
  };
  window.addEventListener('pointermove', onMove);

  const HOVERABLE = 'a, button, [role="button"], [data-cursor-hover]';
  const onOver = (e: Event) => {
    const t = e.target as HTMLElement;
    const el = t.closest(HOVERABLE);
    if (!el) return;
    cursor.classList.add('is-hover');
    const dataLabel = (el as HTMLElement).dataset.cursorLabel;
    if (dataLabel) {
      label.textContent = dataLabel;
      cursor.classList.add('has-label');
    } else {
      label.textContent = '';
      cursor.classList.remove('has-label');
    }
  };
  const onOut = (e: Event) => {
    const t = e.target as HTMLElement;
    if (t.closest(HOVERABLE)) {
      cursor.classList.remove('is-hover');
      cursor.classList.remove('has-label');
    }
  };
  document.addEventListener('pointerover', onOver);
  document.addEventListener('pointerout',  onOut);

  document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));

  const render = () => {
    pos.x += (target.x - pos.x) * 0.22;
    pos.y += (target.y - pos.y) * 0.22;

    // Movement direction: rotate arrow up to ±15° toward direction of travel
    const dx = pos.x - prev.x;
    const dy = pos.y - prev.y;
    const speed = Math.hypot(dx, dy);
    if (speed > 0.6) {
      // Base arrow tip points up-left (~ -50°). We add a small tilt
      // proportional to horizontal motion so it feels alive.
      angleTarget = Math.max(-14, Math.min(14, dx * 0.6));
    } else {
      angleTarget *= 0.9;
    }
    angle += (angleTarget - angle) * 0.15;

    prev.x = pos.x;
    prev.y = pos.y;

    cursor.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    arrow.style.transform  = `rotate(${angle}deg)`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}
