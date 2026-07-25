/**
 * Ferris-wheel style scroll: cards are distributed along an arc, and the whole
 * wheel rotates as the user scrolls through a pinned section.
 *
 * Markup:
 *   <section data-circular-scroll data-arc-span="80" data-arc-radius="1400">
 *     <div data-circular-pin class="sticky top-0 h-screen overflow-hidden">
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

    const arcSpan = Number(section.dataset.arcSpan   ?? '80'); // total degrees on the arc at rest
    const radius  = Number(section.dataset.arcRadius ?? '1400');
    // Extra rotation each end (how far the wheel can spin past the initial arc)
    const overshoot = Number(section.dataset.arcOvershoot ?? '30');

    const total = cards.length;
    const step  = total > 1 ? arcSpan / (total - 1) : 0;
    const start = -arcSpan / 2;

    // Position: each card at its base angle, then we rotate a shared --wheel-rot
    cards.forEach((card, i) => {
      const angle = start + i * step;
      card.style.setProperty('--base-angle', `${angle}deg`);
      card.dataset.baseAngle = String(angle);
    });

    // Scroll runway: enough vertical room to sweep from +overshoot to -arcSpan-overshoot
    const totalSweep = arcSpan + overshoot * 2;
    const runway = Math.round(totalSweep * 22); // ~22px per degree of rotation
    section.style.height = `${window.innerHeight + runway}px`;

    const applyRotation = (rot: number) => {
      wheel.style.setProperty('--wheel-rot', `${rot}deg`);
      // For each card, compute distance from the "top" (angle 0 after wheel rot)
      // and tune opacity / scale so front cards feel prominent.
      cards.forEach((card) => {
        const base = Number(card.dataset.baseAngle);
        const eff  = base + rot;
        const dist = Math.abs(eff);
        // active if within ~15deg of straight up
        const active = 1 - Math.min(1, dist / 45);
        card.style.setProperty('--card-active', active.toFixed(3));
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
      // Rotate from +arcSpan/2+overshoot to -arcSpan/2-overshoot
      const rot = (arcSpan / 2 + overshoot) - progress * totalSweep;
      applyRotation(rot);
    };

    // CSS var for radius so styles can key off it
    wheel.style.setProperty('--radius', `${radius}px`);
    section.style.setProperty('--radius', `${radius}px`);

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
