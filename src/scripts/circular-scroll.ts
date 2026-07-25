/**
 * 3D cylindrical carousel: cards live on the circumference of a horizontal
 * circle. As the user scrolls the pinned section, the whole wheel rotates
 * around its Y axis. Cards facing the camera read full opacity; cards behind
 * the axis fade with distance so they still peek through with a lower alpha.
 *
 * Markup:
 *   <section data-circular-scroll data-arc-span="360" data-arc-radius="620">
 *     <div data-circular-pin>
 *       <div data-circular-wheel>
 *         <div data-circular-card>...</div>
 *         ...
 *       </div>
 *     </div>
 *   </section>
 */
export function initCircularScroll() {
  const sections = document.querySelectorAll<HTMLElement>('[data-circular-scroll]');
  if (!sections.length) return;

  const isNarrow = window.matchMedia('(max-width: 768px)').matches;

  sections.forEach((section) => {
    const wheel = section.querySelector<HTMLElement>('[data-circular-wheel]');
    if (!wheel) return;
    const cards = Array.from(wheel.querySelectorAll<HTMLElement>('[data-circular-card]'));
    if (!cards.length) return;

    if (isNarrow) {
      section.classList.add('is-mobile-fallback');
      section.style.height = 'auto';
      return;
    }

    // arcSpan: total angle occupied by all cards. 360 = full ring.
    const arcSpan   = Number(section.dataset.arcSpan   ?? '360');
    const radius    = Number(section.dataset.arcRadius ?? '620');
    // sweep: how much the wheel rotates over the full scroll runway
    const sweep     = Number(section.dataset.arcSweep  ?? String(arcSpan));

    const total = cards.length;
    const step  = total > 0 ? arcSpan / total : 0;

    cards.forEach((card, i) => {
      const angle = -arcSpan / 2 + i * step;
      card.style.setProperty('--base-angle', `${angle}deg`);
      card.dataset.baseAngle = String(angle);
    });

    // Scroll runway proportional to the sweep so 360° needs enough vertical room
    const runway = Math.max(800, Math.round(sweep * 8));
    section.style.height = `${window.innerHeight + runway}px`;

    section.style.setProperty('--radius', `${radius}px`);
    wheel.style.setProperty('--radius', `${radius}px`);

    const applyRotation = (rot: number) => {
      wheel.style.setProperty('--wheel-rot', `${rot}deg`);
      cards.forEach((card) => {
        const base = Number(card.dataset.baseAngle);
        const eff  = base + rot;
        // normalise to [-180, 180]
        const norm = ((eff + 180) % 360 + 360) % 360 - 180;
        const cos  = Math.cos((norm * Math.PI) / 180);
        // active: 1 at front, ~0 at sides/back
        const active = Math.max(0, cos);
        card.style.setProperty('--card-active', active.toFixed(3));
        // depth: -1 at back, +1 at front — used to tint z-index and pointer-events
        card.style.setProperty('--card-depth', cos.toFixed(3));
        // hide interactive back-facing cards from tab order / clicks
        (card as HTMLElement).style.pointerEvents = cos < -0.1 ? 'none' : '';
      });
    };

    const update = () => {
      const rect = section.getBoundingClientRect();
      let progress = 0;
      if (rect.top <= 0 && rect.bottom >= window.innerHeight) {
        progress = -rect.top / (rect.height - window.innerHeight);
      } else if (rect.top > 0) {
        progress = 0;
      } else {
        progress = 1;
      }
      progress = Math.max(0, Math.min(1, progress));
      // From +sweep/2 to -sweep/2 as we scroll through
      const rot = sweep / 2 - progress * sweep;
      applyRotation(rot);
    };

    update();

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { update(); raf = 0; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      section.style.height = `${window.innerHeight + runway}px`;
      update();
    });
  });
}
