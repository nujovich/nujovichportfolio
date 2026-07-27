/**
 * Adds a cursor-following radial gradient on cards flagged with .spotlight.
 * Uses CSS variables --spot-x / --spot-y and --spot-o for opacity.
 */
export function initSpotlight() {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const cards = document.querySelectorAll<HTMLElement>('.spotlight');
  cards.forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width)  * 100;
      const y = ((e.clientY - rect.top)  / rect.height) * 100;
      card.style.setProperty('--spot-x', `${x}%`);
      card.style.setProperty('--spot-y', `${y}%`);
      card.style.setProperty('--spot-o', '1');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--spot-o', '0');
    });
  });
}
