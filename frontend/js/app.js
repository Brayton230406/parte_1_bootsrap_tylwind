import { initMotion } from './motion.js';
import { confirmAge } from './age.js';
import { initPWA } from './pwa.js';
import { initNavigation } from './navigation.js';
import { loadProducts, loadCategories, loadProduct } from './repo.js';
import { getToken } from './services/api.js';
import { getCart } from './services/orders.service.js';
import { readLegacyCart } from './storage.js';
import { me } from './services/auth.service.js';
import { initView } from './view.js';

async function start() {
  try {
    performance.mark('michoks-catalog-start');
    const [page, categories] = await Promise.all([loadProducts(), loadCategories()]);
    const products = [...page.data];
    const account = document.querySelector('#account-link');
    let user = null;
    if (getToken()) {
      try { user = await me(); }
      catch (error) {
        if (error.status !== 401) throw error;
      }
    }
    const isCustomer = user?.roles.includes('cliente');
    const isAdmin = user?.roles.includes('administrador');
    account.textContent = isAdmin ? 'Administración' : isCustomer ? 'Mis pedidos' : 'Ingresar';
    account.href = isAdmin ? '/cuenta#administracion' : isCustomer ? '/cuenta#pedidos' : '/cuenta';
    document.querySelector('.cart-button').hidden = !isCustomer;
    let cart = [];
    let legacy = {};
    if (isCustomer) {
      [cart, legacy] = await Promise.all([getCart(), readLegacyCart(null)]);
      const ids = new Set([...cart.map(item => item.id_producto), ...Object.keys(legacy)]);
      const known = new Set(products.map(product => product.id));
      const results = await Promise.allSettled([...ids].filter(id => !known.has(id)).map(loadProduct));
      for (const result of results) if (result.status === 'fulfilled') products.push(result.value);
      const valid = new Set(products.map(product => product.id));
      legacy = Object.fromEntries(Object.entries(legacy).filter(([id]) => valid.has(id)));
    }
    initView(products, { user, cart, legacy, page, categories });
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

import './router.js';
