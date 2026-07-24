/**
 * Pin a section vertically while its inner track translates horizontally.
 * The section's overall height acts as the "scroll runway".
 *
 * Markup:
 *   <section data-horizontal-scroll style="height: 300vh">
 *     <div data-horizontal-pin class="sticky top-0 h-screen overflow-hidden">
 *       <div data-horizontal-track class="flex" style="width: max-content">
 *         ...cards
 *       </div>
 *     </div>
 *   </section>
 */
export function initHorizontalScroll() {
  const sections = document.querySelectorAll<HTMLElement>('[data-horizontal-scroll]');
  if (!sections.length) return;

  const isNarrow = window.matchMedia('(max-width: 768px)').matches;

  sections.forEach((section) => {
    const track = section.querySelector<HTMLElement>('[data-horizontal-track]');
    if (!track) return;

    // On narrow screens, fall back to a normal (vertical / native horizontal-swipe) layout
    if (isNarrow) {
      section.style.height = 'auto';
      section.classList.add('is-mobile-fallback');
      return;
    }

    let travel = 0;

    const measure = () => {
      travel = Math.max(0, track.scrollWidth - window.innerWidth);
      // section height = viewport + amount to translate. That gives a 1:1 vertical-to-horizontal ratio.
      section.style.height = `${window.innerHeight + travel}px`;
    };

    const update = () => {
      const rect = section.getBoundingClientRect();
      const start = rect.top;
      const end   = rect.bottom - window.innerHeight;
      let progress = 0;
      if (start <= 0 && end >= 0) {
        progress = -start / (rect.height - window.innerHeight);
      } else if (start > 0) {
        progress = 0;
      } else {
        progress = 1;
      }
      progress = Math.max(0, Math.min(1, progress));
      track.style.transform = `translate3d(${-progress * travel}px, 0, 0)`;
    };

    measure();
    update();

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { update(); raf = 0; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { measure(); update(); });
  });
}
