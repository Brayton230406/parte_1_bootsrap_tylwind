// La instalación depende del navegador; el catálogo sigue siendo una web normal.
export function initPWA() {
  const button = document.querySelector('#install-app');
  const status = document.querySelector('#connection-status');
  let prompt;
  function connection() {
    status.hidden = navigator.onLine;
    status.textContent = navigator.onLine ? '' : 'Sin conexión: puedes explorar y guardar tu selección. Para consultar por WhatsApp necesitas internet. Precios y disponibilidad por confirmar.';
  }
  connection();
  window.addEventListener('online', connection);
  window.addEventListener('offline', connection);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); prompt = event; button.hidden = false;
  });
  button.addEventListener('click', async () => {
    if (!prompt) return;
    await prompt.prompt(); await prompt.userChoice;
    prompt = null; button.hidden = true;
  });
  window.addEventListener('appinstalled', () => { prompt = null; button.hidden = true; });
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), { updateViaCache: 'none' })
        .catch(error => console.warn('MICHOKS: no se pudo activar el modo sin conexión.', error));
    });
  }
}
