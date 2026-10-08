import { money, normalize, categoryClass, productPhoto, escapeHTML, trapDialogFocus } from './components.js';
import { rules, initValidation, showFieldError } from './validation.js';
import { STORAGE_KEY, MAX_QUANTITY, readCart, saveCart, cartEntries, cartTotalValue, setQuantity, removeProduct, restoreProducts } from './cart.js';



const WHATSAPP_NUMBER = '593959862988';

export function initView(products) {
  const state = { category: 'Todos', search: '', sort: 'featured', budget: 'all', occasion: '', limit: 12, cart: readCart(products) };
  const productGrid = document.querySelector('#product-grid');
  const emptyProducts = document.querySelector('#empty-products');
  const searchInput = document.querySelector('#product-search');
  const cartDrawer = document.querySelector('#cart-drawer');
  const cartItems = document.querySelector('#cart-items');
  const cartCount = document.querySelector('#cart-count');
  const cartTotal = document.querySelector('#cart-total');
  const checkoutButton = document.querySelector('#checkout-button');
  const dialog = document.querySelector('#product-dialog');
  const dialogContent = document.querySelector('#dialog-content');
  const toast = document.querySelector('#toast');
  const menuButton = document.querySelector('.menu-button');
  const nav = document.querySelector('#main-nav');
  [cartDrawer, dialog].forEach(trapDialogFocus);
  let toastTimer;
  let cartOpener;
  let removedCart = null;
  let lastAddedId = null;
  const occasionNames = { regalo: 'Para regalar', cena: 'Una buena cena', cocteles: 'Mixología en casa', compartir: 'Para compartir' };
  const categoryLabels = { Whisky: 'Whiskys', Cócteles: 'Cócteles' };
  const categories = ['Todos', ...new Set(products.map((product) => product.category))];
  document.querySelector('.category-tabs').innerHTML = categories.map((category) => `<button class="category-tab" type="button" data-category="${escapeHTML(category)}" aria-pressed="false">${escapeHTML(categoryLabels[category] || category)} <span>0</span></button>`).join('');
  function visibleProducts() {
    const visible = products.filter((product) => (state.category === 'Todos' || product.category === state.category) && normalize(`${product.name} ${product.category}`).includes(normalize(state.search)) && (state.budget === 'all' || product.price <= Number(state.budget)) && (!state.occasion || product.occasions?.includes(state.occasion)));
    if (state.sort === 'price-asc') visible.sort((a, b) => a.price - b.price);
    if (state.sort === 'price-desc') visible.sort((a, b) => b.price - a.price);
    if (state.sort === 'name') visible.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return visible;
  }
  function renderProducts() {
    const visible = visibleProducts();
    productGrid.innerHTML = visible.slice(0, state.limit).map((product) => `<article class="product-card"><div class="product-card-image ${categoryClass(product)}">${productPhoto(product)}<button class="quick-view" type="button" aria-haspopup="dialog" aria-controls="product-dialog" aria-label="Vista rápida: ${escapeHTML(product.name)}" data-view-product="${product.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></div><p class="product-category">${escapeHTML(product.category)}</p><h3>${escapeHTML(product.name)}</h3><div class="product-meta"><strong class="product-price">${money(product.price)}</strong><span class="product-size">${escapeHTML(product.size)}</span></div><button class="add-product" type="button" aria-label="Añadir al carrito: ${escapeHTML(product.name)}" data-add-product="${product.id}">Añadir al carrito <span aria-hidden="true">+</span></button></article>`).join('');
    emptyProducts.hidden = visible.length > 0;
    document.querySelector('#results-count').textContent = `${Math.min(state.limit, visible.length)} de ${visible.length} ${visible.length === 1 ? 'producto' : 'productos'} para descubrir`;
    document.querySelector('#load-more-products').hidden = visible.length <= state.limit;
    updateCatalogSelection();
    const hasFilters = Boolean(state.search.trim() || state.category !== 'Todos' || state.occasion || state.budget !== 'all');
    document.querySelector('#active-filters').hidden = !hasFilters;
    document.querySelector('#active-filters-label').textContent = [state.category !== 'Todos' ? state.category : '', occasionNames[state.occasion] || '', state.budget !== 'all' ? `Hasta $${state.budget}` : '', state.search.trim() ? `Búsqueda: “${state.search.trim()}”` : ''].filter(Boolean).join(' · ');
    document.querySelectorAll('.category-tab').forEach((button) => {
      button.querySelector('span').textContent = products.filter((product) => button.dataset.category === 'Todos' || product.category === button.dataset.category).length;
      const active = button.dataset.category === state.category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function renderCart({ preserveRows = false } = {}) {
    const active = document.activeElement;
    const focusSelector = active?.dataset.recommendProduct ? `[data-increase="${active.dataset.recommendProduct}"]` : active?.dataset.quantity ? `[data-quantity="${active.dataset.quantity}"]` : active?.dataset.remove ? `[data-remove="${active.dataset.remove}"]` : active?.dataset.increase ? `[data-increase="${active.dataset.increase}"]` : active?.dataset.decrease ? `[data-decrease="${active.dataset.decrease}"]` : null;
    const entries = cartEntries(state.cart, products);
    cartCount.textContent = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    cartTotal.textContent = money(cartTotalValue(entries));
    checkoutButton.disabled = entries.length === 0;
    const units = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    document.querySelector('#cart-summary').textContent = `${entries.length} ${entries.length === 1 ? 'producto' : 'productos'} · ${units} ${units === 1 ? 'unidad' : 'unidades'}`;
    document.querySelector('#clear-cart').hidden = entries.length === 0;
    document.querySelector('.cart-button').setAttribute('aria-label', `Abrir carrito, ${units} ${units === 1 ? 'unidad' : 'unidades'}`);
    document.querySelector('#cart-undo').hidden = removedCart === null;
    document.querySelector('#checkout-status').textContent = '';
    document.querySelector('#whatsapp-fallback').hidden = true;
    if (!preserveRows) cartItems.innerHTML = entries.length ? entries.map(({ product, quantity }) => `<article class="cart-line"><div class="cart-line-image product-card-image ${categoryClass(product)}">${productPhoto(product)}</div><div class="cart-line-info"><p class="cart-category">${escapeHTML(product.category)} <span>· ${escapeHTML(product.size)}</span></p><h3>${escapeHTML(product.name)}</h3><p class="unit-price">${money(product.price)} por unidad</p><div class="cart-line-actions"><div class="quantity-controls"><button type="button" aria-label="Reducir ${escapeHTML(product.name)}" data-decrease="${product.id}">−</button><input type="number" min="1" max="99" step="1" inputmode="numeric" value="${quantity}" aria-describedby="quantity-${product.id}-error" aria-label="Cantidad de ${escapeHTML(product.name)}" id="quantity-${product.id}" data-quantity="${product.id}"><button type="button" aria-label="Aumentar ${escapeHTML(product.name)}" data-increase="${product.id}" ${quantity >= MAX_QUANTITY ? 'disabled' : ''}>+</button></div><p id="quantity-${product.id}-error" class="field-error" aria-live="polite"></p><button class="remove-product" type="button" aria-label="Eliminar ${escapeHTML(product.name)}" data-remove="${product.id}">Eliminar</button></div></div><strong class="line-price">${money(Math.round(product.price * 100) * quantity / 100)}</strong></article>`).join('') : '<div class="cart-empty"><div class="empty-emblem" aria-hidden="true">M<span>✦</span></div><p class="eyebrow">LOS BUENOS MOMENTOS EMPIEZAN AQUÍ</p><h3>Un carrito vacío.<br>Mil buenos planes.</h3><p>Encuentra esa botella que va contigo.<br>Nosotros te ayudamos con el resto.</p><button class="primary-button" type="button" data-discover-catalog>Descubrir el catálogo <span aria-hidden="true">↗</span></button></div>';
    document.querySelector('#cart-subtotal').textContent = money(cartTotalValue(entries));
    document.querySelector('#mobile-cart-total').textContent = money(cartTotalValue(entries));
    document.querySelector('#cart-mobile-summary').hidden = !entries.length;
    document.querySelector('#summary-units').textContent = `(${units})`;
    document.querySelector('#cart-mini').hidden = !units || cartDrawer.open || dialog.open;
    document.body.classList.toggle('has-cart', units > 0);
    document.querySelector('#mini-units').textContent = `${units} ${units === 1 ? 'unidad' : 'unidades'} en tu carrito`;
    document.querySelector('#mini-total').textContent = money(cartTotalValue(entries));
    cartDrawer.classList.toggle('is-empty', !entries.length);
    document.querySelector('#order-preferences').hidden = !entries.length;
    document.querySelector('#order-preview').hidden = !entries.length;
    if (preserveRows) {
      for (const { product, quantity } of entries) {
        const input = cartItems.querySelector(`[data-quantity="${product.id}"]`);
        if (input && input !== document.activeElement) input.value = quantity;
        const row = input?.closest('.cart-line');
        if (row) {
          row.querySelector('.line-price').textContent = money(Math.round(product.price * 100) * quantity / 100);
          row.querySelector('[data-increase]').disabled = quantity >= MAX_QUANTITY;
        }
      }
    } else renderRecommendations();
    updateOrderMessage(); updateCatalogSelection();

    if (!preserveRows && focusSelector && cartDrawer.open) (cartItems.querySelector(`${focusSelector}:not(:disabled)`) || cartItems.querySelector('button:not(:disabled)') || cartDrawer.querySelector('[data-close-cart]')).focus({ preventScroll: true });
  }
  function showToast(message) {
    const feedback = document.querySelector('#cart-feedback');
    if (cartDrawer.open) feedback.textContent = message;
    else { toast.textContent = message; toast.classList.add('is-visible'); }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove('is-visible'); feedback.textContent = ''; }, 5000);
  }
  function addToCart(id) {
    if (!products.some((product) => product.id === id)) return;
    if ((state.cart[id] || 0) >= MAX_QUANTITY) { showToast('Máximo de 99 unidades por producto. Consulta pedidos mayores por WhatsApp.'); return; }
    state.cart = setQuantity(state.cart, id, (state.cart[id] || 0) + 1); lastAddedId = id;
    const saved = saveCart(state.cart); renderCart();
    showToast(saved ? `${products.find((product) => product.id === id).name} añadido a tu selección.` : 'Producto añadido. Tu navegador no permite guardar el carrito al cerrar.');
  }
  function changeQuantity(id, amount) {
    if (!state.cart[id]) return;
    if (state.cart[id] + amount <= 0) { removeFromCart(id); return; }
    state.cart = setQuantity(state.cart, id, Math.min(MAX_QUANTITY, state.cart[id] + amount));
    if (state.cart[id] <= 0) state.cart = removeProduct(state.cart, id);
    const saved = saveCart(state.cart); renderCart();
    if (!saved) showToast('Cantidad actualizada. No se pudo guardar para otra visita.');
  }
  function removeFromCart(id) {
    if (!state.cart[id]) return;
    removedCart = { [id]: state.cart[id] };
    state.cart = removeProduct(state.cart, id);
    document.querySelector('#cart-undo-message').textContent = 'Producto eliminado del carrito.';
    persistCartChange();
  }
  function persistCartChange(options) {
    const saved = saveCart(state.cart); renderCart(options);
    if (!saved) showToast('Cambio realizado. No se pudo guardar para otra visita.');
  }
  cartItems.addEventListener('change', (event) => {
    const input = event.target.closest('[data-quantity]');
    if (!input) return;
    const id = Number(input.dataset.quantity);
    const quantity = Number(input.value);
    if (!rules.quantity.test(input.value)) {
      showFieldError(input, 'Introduce una cantidad entera entre 1 y 99.');
      showToast('Introduce una cantidad entera entre 1 y 99.');
      return;
    }
    showFieldError(input, '');
    state.cart = setQuantity(state.cart, id, quantity); persistCartChange({ preserveRows: true });
  });
  document.querySelector('#clear-cart').addEventListener('click', () => {
    removedCart = { ...state.cart }; state.cart = {};
    document.querySelector('#cart-undo-message').textContent = 'Carrito vaciado. Puedes recuperar tu selección.';
    persistCartChange(); document.querySelector('#undo-cart').focus();
  });
  document.querySelector('#undo-cart').addEventListener('click', () => {
    if (!removedCart) return;
    // Restore removed quantities while preserving additions made after removal.
    state.cart = restoreProducts(state.cart, removedCart);
    removedCart = null; persistCartChange();
    cartItems.querySelector('button')?.focus();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    state.cart = readCart(products); removedCart = null; renderCart();
  });
  function syncScroll() { document.body.classList.toggle('no-scroll', cartDrawer.open || dialog.open); document.querySelector('#cart-mini').hidden = !cartEntries(state.cart, products).length || cartDrawer.open || dialog.open; }
  function openCart(opener = document.activeElement) {
    closeMenu(); cartOpener = opener;
    cartDrawer.setAttribute('aria-hidden', 'false');
    renderCart(); cartDrawer.showModal(); syncScroll();
  }
  function closeCart() { cartDrawer.close(); }
  cartDrawer.addEventListener('close', () => {
    cartDrawer.setAttribute('aria-hidden', 'true'); syncScroll();
    if (cartOpener?.isConnected) cartOpener.focus({ preventScroll: true });
  });
  cartDrawer.addEventListener('click', (event) => { if (event.target === cartDrawer) closeCart(); });
  function openProduct(id) {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    dialogContent.innerHTML = `<div class="dialog-layout"><div class="dialog-main-image product-card-image ${categoryClass(product)}" id="dialog-main-image">${productPhoto(product)}</div><div class="dialog-info"><p class="eyebrow">${escapeHTML(product.category)} · ${escapeHTML(product.size)}</p><h2 id="detail-title">${escapeHTML(product.name)}</h2><p>${escapeHTML(product.description)}</p><strong class="dialog-price">${money(product.price)}</strong><p>Precio referencial. Confirma la presentación y disponibilidad al consultar.</p>${product.image ? `<div class="dialog-gallery" role="group" aria-label="Ver fotografía del producto">${['Botella completa', 'Ampliar etiqueta'].map((label, index) => `<button type="button" class="dialog-thumb ${index === 0 ? 'is-selected' : ''} product-card-image ${categoryClass(product)} view-${index}" aria-label="${label}" aria-pressed="${index === 0}" data-dialog-image="${index}"><span>${label}</span></button>`).join('')}</div>` : ''}<button class="primary-button w-full" type="button" data-dialog-add="${product.id}">Añadir al carrito <span aria-hidden="true">+</span></button></div></div>`;
    dialog.showModal(); syncScroll();
  }
  function setCategory(category, scroll = false) {
    state.category = category; state.occasion = ''; state.limit = 12;
    if (scroll) { state.search = ''; state.budget = 'all'; document.querySelector('#product-budget').value = 'all'; searchInput.value = ''; }
    renderProducts();
    if (scroll) { document.querySelector('#catalogo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); document.querySelector('.category-tab.is-active').focus({ preventScroll: true }); }
  }
  function closeMenu(restoreFocus = false) {
    nav.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Abrir menú');
    if (restoreFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open'); nav.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));
  matchMedia('(min-width: 768px)').addEventListener('change', () => closeMenu());
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true); });
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const recommend = target.closest('[data-recommend-product]'); if (recommend) addToCart(Number(recommend.dataset.recommendProduct));
    const add = target.closest('[data-add-product]'); if (add) addToCart(Number(add.dataset.addProduct));
    const view = target.closest('[data-view-product]'); if (view) openProduct(Number(view.dataset.viewProduct));
    const increase = target.closest('[data-increase]'); if (increase) changeQuantity(Number(increase.dataset.increase), 1);
    const remove = target.closest('[data-remove]'); if (remove) removeFromCart(Number(remove.dataset.remove));
    const decrease = target.closest('[data-decrease]'); if (decrease) changeQuantity(Number(decrease.dataset.decrease), -1);
    const occasion = target.closest('[data-occasion]');
    if (occasion) {
      state.category = 'Todos'; state.search = ''; state.budget = 'all'; state.limit = 12; state.occasion = occasion.dataset.occasion;
      searchInput.value = ''; document.querySelector('#product-budget').value = 'all'; renderProducts();
      document.querySelector('#catalog-title').focus({ preventScroll: true });
      document.querySelector('#catalogo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    const category = target.closest('[data-category]'); if (category) setCategory(category.dataset.category, category.classList.contains('inline-action'));
    if (target.closest('[data-close-cart]')) closeCart();
    const viewImage = target.closest('[data-dialog-image]');
    if (viewImage) {
      const main = document.querySelector('#dialog-main-image'); main.classList.remove('view-0', 'view-1', 'view-2'); main.classList.add(`view-${viewImage.dataset.dialogImage}`);
      document.querySelectorAll('.dialog-thumb').forEach((button) => { const selected = button === viewImage; button.classList.toggle('is-selected', selected); button.setAttribute('aria-pressed', String(selected)); });
    }
    const dialogAdd = target.closest('[data-dialog-add]');
    if (dialogAdd) { addToCart(Number(dialogAdd.dataset.dialogAdd)); dialog.close(); openCart(document.querySelector('.cart-button')); }
  });
  document.querySelector('.cart-button').addEventListener('click', () => openCart());
  document.querySelector('#cart-mini').addEventListener('click', () => openCart(document.querySelector('.cart-button')));
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', syncScroll);
  searchInput.addEventListener('input', (event) => { state.search = event.target.value; state.limit = 12; renderProducts(); });
  document.querySelector('#product-sort').addEventListener('change', (event) => { state.sort = event.target.value; renderProducts(); });
  document.querySelector('#product-budget').addEventListener('change', (event) => { state.budget = event.target.value; state.limit = 12; renderProducts(); });
  document.querySelector('#load-more-products').addEventListener('click', () => { const previous = state.limit; state.limit += 12; renderProducts(); productGrid.querySelectorAll('.add-product')[previous]?.focus({ preventScroll: false }); });
  document.querySelector('#clear-active-filters').addEventListener('click', () => { document.dispatchEvent(new Event('catalog:reset')); searchInput.focus(); });
  document.querySelector('#reset-filters').addEventListener('click', () => { state.search = ''; state.budget = 'all'; document.querySelector('#product-budget').value = 'all'; searchInput.value = ''; setCategory('Todos'); searchInput.focus(); });
  function orderMessage() {
    const entries = cartEntries(state.cart, products);
    const lines = entries.map(({ product, quantity }) => `${quantity} × ${product.name} (${product.size}) — ${money(Math.round(product.price * 100) * quantity / 100)}`);
    const delivery = document.querySelector('input[name="delivery"]:checked').value;
    const note = document.querySelector('#order-note').value.trim();
    const contact = [['Nombre', '#customer-name'], ['Celular', '#customer-phone'], ['Correo', '#customer-email'], ...(delivery === 'domicilio' ? [['Dirección', '#customer-address']] : [])].map(([label, selector]) => { const value = document.querySelector(selector).value.trim(); return value ? `${label}: ${value}` : ''; }).filter(Boolean);
    return ['Hola MICHOKS, quisiera consultar esta selección:', '', ...lines, '', `Total referencial: ${money(cartTotalValue(entries))} USD.`, `Entrega: ${delivery === 'domicilio' ? 'me gustaría consultar envío a domicilio' : 'por coordinar'}.`, ...contact, ...(note ? [`Indicaciones: ${note}`] : []), '¿Me confirman disponibilidad, precio final y opciones de entrega?', 'Soy mayor de 18 años.'].join('\n');
  }
  function updateOrderMessage() {
    document.querySelector('#order-message').textContent = orderMessage();
    document.querySelector('#note-count').textContent = document.querySelector('#order-note').value.length;
    document.querySelector('#copy-status').textContent = '';
    document.querySelector('#checkout-status').textContent = '';
    document.querySelector('#whatsapp-fallback').hidden = true;
  }
  function updateCatalogSelection() {
    document.querySelectorAll('[data-add-product]').forEach((button) => {
      const quantity = state.cart[button.dataset.addProduct] || 0;
      button.classList.toggle('is-in-cart', quantity > 0);
      button.innerHTML = quantity ? `En tu carrito · ${quantity}<span aria-hidden="true">+</span>` : 'Añadir al carrito <span aria-hidden="true">+</span>';
      button.disabled = quantity >= MAX_QUANTITY;
    });
  }
  function renderRecommendations() {
    const entries = cartEntries(state.cart, products);
    const base = entries.find(({ product }) => product.id === lastAddedId)?.product || entries[0]?.product;
    const available = products.filter((product) => !state.cart[product.id]);
    const suggestions = [...available].sort((a, b) => Number(b.category === base?.category) - Number(a.category === base?.category) || a.price - b.price).slice(0, 2);
    document.querySelector('#cart-recommendations').hidden = !entries.length || !suggestions.length;
    document.querySelector('#recommendation-items').innerHTML = suggestions.map((product) => `<article class="recommendation"><div class="recommendation-image product-card-image ${categoryClass(product)}">${productPhoto(product)}</div><div><p>${escapeHTML(product.name)}</p><span>${money(product.price)} · ${escapeHTML(product.size)}</span></div><button type="button" aria-label="Añadir a mi selección: ${escapeHTML(product.name)}" data-recommend-product="${product.id}">+</button></article>`).join('');
  }
  document.querySelector('#review-order').addEventListener('click', () => {
    cartDrawer.querySelector('.cart-footer').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    document.querySelector('input[name="delivery"]:checked').focus({ preventScroll: true });
  });
  const form = document.querySelector('#order-form');
  const validateOrder = initValidation(form, updateOrderMessage);
  form.addEventListener('submit', (event) => { event.preventDefault(); prepareConsultation(); });
  document.querySelectorAll('input[name="delivery"]').forEach((input) => input.addEventListener('change', () => { document.querySelector('#address-field').hidden = input.value !== 'domicilio'; updateOrderMessage(); }));
  document.querySelector('#copy-order').addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    if (!validateOrder()) return;
    try { await navigator.clipboard.writeText(orderMessage()); status.textContent = 'Mensaje copiado. Listo para compartir.'; }
    catch { status.textContent = 'Puedes seleccionar y copiar el mensaje de arriba.'; }
  });
  function prepareConsultation() {
    if (!cartEntries(state.cart, products).length || !validateOrder()) return;
    const invalidQuantity = cartItems.querySelector('[aria-invalid="true"]');
    if (invalidQuantity) { invalidQuantity.focus(); return; }
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`;
    const fallback = document.querySelector('#whatsapp-fallback'); fallback.href = url; fallback.hidden = false;
    window.open(url, '_blank', 'noopener,noreferrer');
    document.querySelector('#checkout-status').textContent = 'Continúa en WhatsApp y envía el mensaje para consultar. Tu pedido aún no está confirmado.';
  }
  document.addEventListener('catalog:reset', () => {
    state.search = ''; state.category = 'Todos'; state.sort = 'featured'; state.budget = 'all'; state.occasion = ''; state.limit = 12;
    document.querySelector('#product-budget').value = 'all';
    searchInput.value = ''; document.querySelector('#product-sort').value = 'featured';
    renderProducts();
  });
  renderProducts(); renderCart();

}
