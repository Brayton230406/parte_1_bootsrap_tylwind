// La navegación básica funciona antes de que termine la carga del catálogo.
export function initNavigation() {
  document.addEventListener('click', async (event) => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest('[data-discover-catalog], a[href="#catalogo"], a[href="#nosotros"]');
    if (!trigger || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const about = trigger.matches('a[href="#nosotros"]');
    if (!about) document.dispatchEvent(new Event('catalog:reset'));
    const openDialogs = [...document.querySelectorAll('dialog[open]')];
    // Wait for native close events, including their focus restoration, before navigating.
    await Promise.all(openDialogs.map((dialog) => new Promise((resolve) => {
      dialog.addEventListener('close', resolve, { once: true });
      dialog.close();
    })));
    document.querySelector('#main-nav').classList.remove('is-open');
    const menu = document.querySelector('.menu-button');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Abrir menú');
    const heading = document.querySelector(about ? '#story-title' : '#catalog-title');
    heading.focus({ preventScroll: true });
    document.querySelector(about ? '#nosotros' : '#catalogo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    history.replaceState(null, '', about ? '#nosotros' : '#catalogo');
  });
}
