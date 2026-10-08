import { initMotion } from './motion.js';
import { confirmAge } from './age.js';
import { initPWA } from './pwa.js';
import { initNavigation } from './navigation.js';
import { loadProducts } from './repo.js';
import { recoverCart } from './storage.js';
import { initView } from './view.js';

async function start() {
  try {
    const products = await loadProducts();
    await recoverCart(products);
    initView(products);
  } catch (error) {
    console.error('MICHOKS:', error);
    document.querySelector('#results-count').textContent = 'No se pudo cargar el catálogo. Recarga la página o consulta por WhatsApp.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'primary-button';
    retry.textContent = 'Volver a cargar';
    retry.addEventListener('click', () => location.reload());
    document.querySelector('#product-grid').replaceChildren(retry);
    document.querySelector('.cart-button').disabled = true;
  }
}
initPWA();
confirmAge().then(() => {
  initMotion();
  initNavigation();
  start();
});
