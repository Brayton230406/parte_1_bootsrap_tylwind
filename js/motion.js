// Movimiento decorativo: el contenido sigue visible y operable en todo momento.
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const observed = new WeakSet();
const tracked = new Set();
const animations = new WeakMap();
let observer;
export function revealElements(root = document) {
  if (!observer) return;
  for (const element of tracked) {
    if (!element.isConnected) { observer.unobserve(element); animations.get(element)?.cancel(); tracked.delete(element); }
  }
  if (preference.matches) return;
  root.querySelectorAll('.product-card, .occasion-card, .purpose-card, .section-heading, .discovery-heading, .about-heading, .service-strip, .hero-content').forEach(element => {
    if (!observed.has(element)) { observed.add(element); tracked.add(element); observer.observe(element); }
  });
}
export function initMotion() {
  if (!('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const element = entry.target;
      if (!entry.isIntersecting) { animations.get(element)?.cancel(); continue; }
      if (preference.matches || element.contains(document.activeElement)) continue;
      animations.get(element)?.cancel();
      const index = element.classList.contains('product-card') ? [...element.parentElement.children].indexOf(element) % 4 : 0;
      animations.set(element, element.animate([
        { transform: 'translateY(28px) scale(.985)' },
        { transform: 'translateY(0) scale(1)' }
      ], { duration: 650, delay: index * 45, easing: 'cubic-bezier(.2,.7,.2,1)' }));
    }
  }, { threshold: 0.08 });
  revealElements();
  document.addEventListener('focusin', event => {
    const card = event.target.closest('.product-card, .occasion-card, .purpose-card');
    if (card) animations.get(card)?.cancel();
  });
  preference.addEventListener('change', () => {
    document.querySelectorAll('.product-card, .occasion-card, .purpose-card, .section-heading, .discovery-heading, .about-heading, .service-strip, .hero-content').forEach(element => animations.get(element)?.cancel());
    revealElements();
  });
  // Inclinación ligera de la botella, solo con ratón; no afecta controles ni texto.
  let frame;
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || preference.matches) return;
    const card = event.target.closest('.product-card');
    if (!card) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--bottle-angle', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 6}deg`);
    });
  }, { passive: true });
  document.addEventListener('pointerout', event => {
    const card = event.target.closest('.product-card');
    if (card && !card.contains(event.relatedTarget)) { cancelAnimationFrame(frame); card.style.removeProperty('--bottle-angle'); }
  });
}
