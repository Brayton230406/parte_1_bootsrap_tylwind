// Se ejecuta antes del CSS para aplicar la preferencia sin destellos del otro tema.
(() => {
  const KEY = 'michoks-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  let explicit = null;
  for (const type of ['sessionStorage', 'localStorage']) {
    try { const value = window[type].getItem(KEY); if (['light', 'dark'].includes(value)) { explicit = value; break; } } catch { /* preferencia solo durante esta visita */ }
  }
  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#111913' : '#171b17';
    const button = document.querySelector('#theme-toggle');
    if (button) {
      const label = theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro';
      button.setAttribute('aria-label', label); button.title = label;
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }
  apply(explicit || (system.matches ? 'dark' : 'light'));
  document.addEventListener('DOMContentLoaded', () => {
    apply(document.documentElement.dataset.theme);
    document.querySelector('#theme-toggle').addEventListener('click', () => {
      explicit = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, explicit); try { sessionStorage.removeItem(KEY); } catch { /* opcional */ } }
      catch { try { sessionStorage.setItem(KEY, explicit); } catch { /* preferencia en memoria */ } }
      apply(explicit);
    });
  });
  system.addEventListener('change', () => { if (!explicit) apply(system.matches ? 'dark' : 'light'); });
  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;
    explicit = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    apply(explicit || (system.matches ? 'dark' : 'light'));
  });
})();
