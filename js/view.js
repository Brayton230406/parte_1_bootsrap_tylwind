import { getCart, putCart } from './services/orders.service.js';
import { getToken, request } from './services/api.js';
import { removeLegacyCart } from './storage.js';
import { revealElements } from './motion.js';
import { money, normalize, categoryClass, productPhoto, escapeHTML, trapDialogFocus } from './components.js';
import { rules, showFieldError } from './validation.js';
import { MAX_QUANTITY, cartEntries, cartTotalValue, setQuantity, removeProduct, restoreProducts } from './cart.js';



export function initView(products, { user, cart, legacy }) {
  const isCustomer = Boolean(user?.roles.includes('cliente'));
  const isAdmin = Boolean(user?.roles.includes('administrador'));
  const productById = new Map(products.map(product => [product.id, product]));
  const selection = rows => Object.fromEntries(rows.map(item => [item.id_producto, item.cantidad]));
  const toItems = values => Object.entries(values).map(([id_producto, cantidad]) => ({ id_producto, cantidad }));
  const stockLimit = product => Math.min(MAX_QUANTITY, Math.floor(product.stock));
  let committed = selection(cart);
  let saving = false;
  let submittingOrder = false;
  const state = { category: 'Todos', search: '', sort: 'featured', budget: 'all', occasion: '', limit: 12, cart: committed };
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
  const importButton = document.querySelector('#import-legacy-cart');

  async function reloadCart() {
    committed = selection(await getCart());
    state.cart = committed;
    removedCart = null;
    renderCart();
  }
  async function saveCart(next, options) {
    if (saving || submittingOrder) return false;
    saving = true;
    state.cart = next;
    renderCart(options);
    try {
      await putCart(toItems(next), toItems(committed));
      committed = next;
      return true;
    } catch (error) {
      state.cart = committed;
      removedCart = null;
      if (error.status === 401) location.assign('/cuenta');
      try { await reloadCart(); } catch { /* Keep the last confirmed selection. */ }
      showToast(error.message);
      return false;
    } finally {
      saving = false;
      renderCart();
    }
  }
  importButton.addEventListener('click', async () => {
    const restored = restoreProducts(committed, legacy);
    if (await saveCart(restored)) {
      await removeLegacyCart();
      legacy = {};
      renderCart();
      showToast('Selección anterior guardada en tu cuenta.');
    }
  });

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
    productGrid.innerHTML = visible.slice(0, state.limit).map((product) => `<article class="product-card"><div class="product-card-image ${categoryClass(product)}">${productPhoto(product)}${/^\d+\s*×/.test(product.size) ? `<span class="pack-badge">${escapeHTML(product.size.split('×')[0].trim())} PACK</span>` : ''}<button class="quick-view" type="button" aria-haspopup="dialog" aria-controls="product-dialog" aria-label="Vista rápida: ${escapeHTML(product.name)}" data-view-product="${product.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></div><p class="product-category">${escapeHTML(product.category)}</p><h3>${escapeHTML(product.name)}</h3><div class="product-meta"><strong class="product-price">${money(product.price)}</strong><span class="product-size">${escapeHTML(product.size)}</span></div><button class="add-product" type="button" aria-label="Añadir al carrito: ${escapeHTML(product.name)}" data-add-product="${product.id}">Añadir al carrito <span aria-hidden="true">+</span></button></article>`).join('');
    revealElements(productGrid);
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
    const unavailable = entries.some(({ product, quantity }) => quantity > stockLimit(product));
    checkoutButton.disabled = saving || submittingOrder || !entries.length || unavailable;
    document.querySelector('#availability-note').hidden = !unavailable;
    importButton.hidden = !isCustomer || !Object.keys(legacy).length;
    importButton.disabled = saving || submittingOrder;
    const units = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    document.querySelector('#cart-summary').textContent = `${entries.length} ${entries.length === 1 ? 'producto' : 'productos'} · ${units} ${units === 1 ? 'unidad' : 'unidades'}`;
    document.querySelector('#clear-cart').hidden = entries.length === 0;
    document.querySelector('.cart-button').setAttribute('aria-label', `Abrir carrito, ${units} ${units === 1 ? 'unidad' : 'unidades'}`);
    document.querySelector('#cart-undo').hidden = removedCart === null;
    if (!preserveRows) cartItems.innerHTML = entries.length ? entries.map(({ product, quantity }) => `<article class="cart-line"><div class="cart-line-image product-card-image ${categoryClass(product)}">${productPhoto(product)}</div><div class="cart-line-info"><p class="cart-category">${escapeHTML(product.category)} <span>· ${escapeHTML(product.size)}</span></p><h3>${escapeHTML(product.name)}</h3><p class="unit-price">${money(product.price)} por unidad</p><div class="cart-line-actions"><div class="quantity-controls"><button type="button" aria-label="Reducir ${escapeHTML(product.name)}" data-decrease="${product.id}">−</button><input type="number" min="1" max="99" step="1" inputmode="numeric" value="${quantity}" aria-describedby="quantity-${product.id}-error" aria-label="Cantidad de ${escapeHTML(product.name)}" id="quantity-${product.id}" data-quantity="${product.id}"><button type="button" aria-label="Aumentar ${escapeHTML(product.name)}" data-increase="${product.id}" ${quantity >= stockLimit(product) ? 'disabled' : ''}>+</button></div><p id="quantity-${product.id}-error" class="field-error" aria-live="polite"></p><button class="remove-product" type="button" aria-label="Eliminar ${escapeHTML(product.name)}" data-remove="${product.id}">Eliminar</button></div></div><strong class="line-price">${money(Math.round(product.price * 100) * quantity / 100)}</strong></article>`).join('') : '<div class="cart-empty"><div class="empty-emblem" aria-hidden="true">M<span>✦</span></div><p class="eyebrow">LOS BUENOS MOMENTOS EMPIEZAN AQUÍ</p><h3>Un carrito vacío.<br>Mil buenos planes.</h3><p>Encuentra esa botella que va contigo.<br>Nosotros te ayudamos con el resto.</p><button class="primary-button" type="button" data-discover-catalog>Descubrir el catálogo <span aria-hidden="true">↗</span></button></div>';
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

    if (preserveRows) {
      for (const { product, quantity } of entries) {
        const input = cartItems.querySelector(`[data-quantity="${product.id}"]`);
        if (input && input !== document.activeElement) input.value = quantity;
        const row = input?.closest('.cart-line');
        if (row) {
          row.querySelector('.line-price').textContent = money(Math.round(product.price * 100) * quantity / 100);
          row.querySelector('[data-increase]').disabled = quantity >= stockLimit(product);
        }
      }
    } else renderRecommendations();
    updateCatalogSelection();

    if (!preserveRows && focusSelector && cartDrawer.open) (cartItems.querySelector(`${focusSelector}:not(:disabled)`) || cartItems.querySelector('button:not(:disabled)') || cartDrawer.querySelector('[data-close-cart]')).focus({ preventScroll: true });
  }
  function showToast(message) {
    const feedback = document.querySelector('#cart-feedback');
    if (cartDrawer.open) feedback.textContent = message;
    else { toast.textContent = message; toast.classList.add('is-visible'); }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.classList.remove('is-visible'); feedback.textContent = ''; }, 5000);
  }
  async function addToCart(id) {
    const product = productById.get(id);
    if (!product || !stockLimit(product) || isAdmin && !isCustomer) return;
    if (!isCustomer) { location.assign('/cuenta?desde=tienda'); return; }
    if (saving || submittingOrder) return;
    const quantity = (state.cart[id] || 0) + 1;
    if (quantity > stockLimit(product)) { showToast('Alcanzaste la cantidad disponible.'); return; }
    lastAddedId = id;
    if (await saveCart(setQuantity(state.cart, id, quantity))) showToast(`${product.name} añadido a tu selección.`);
  }
  function changeQuantity(id, amount) {
    if (saving || submittingOrder || !state.cart[id]) return;
    const quantity = state.cart[id] + amount;
    if (quantity <= 0) { removeFromCart(id); return; }
    if (amount > 0 && quantity > stockLimit(productById.get(id))) return;
    saveCart(setQuantity(state.cart, id, quantity));
  }
  function removeFromCart(id) {
    if (saving || submittingOrder || !state.cart[id]) return;
    removedCart = { [id]: state.cart[id] };
    document.querySelector('#cart-undo-message').textContent = 'Producto eliminado del carrito.';
    saveCart(removeProduct(state.cart, id));
  }
  cartItems.addEventListener('change', (event) => {
    const input = event.target.closest('[data-quantity]');
    if (!input) return;
    if (saving || submittingOrder) { input.value = state.cart[input.dataset.quantity]; return; }
    const id = input.dataset.quantity;
    const quantity = Number(input.value);
    if (!rules.quantity.test(input.value)) {
      showFieldError(input, 'Introduce una cantidad entera entre 1 y 99.');
      showToast('Introduce una cantidad entera entre 1 y 99.');
      return;
    }
    if (quantity > stockLimit(productById.get(id))) {
      showFieldError(input, 'La cantidad supera las existencias disponibles.');
      return;
    }
    showFieldError(input, '');
    saveCart(setQuantity(state.cart, id, quantity), { preserveRows: true });
  });
  document.querySelector('#clear-cart').addEventListener('click', () => {
    if (saving || submittingOrder) return;
    removedCart = { ...state.cart };
    document.querySelector('#cart-undo-message').textContent = 'Carrito vaciado. Puedes recuperar tu selección.';
    saveCart({});
    document.querySelector('#undo-cart').focus();
  });
  document.querySelector('#undo-cart').addEventListener('click', () => {
    if (!removedCart || saving || submittingOrder) return;
    const restored = restoreProducts(state.cart, removedCart);
    removedCart = null;
    saveCart(restored);
    cartItems.querySelector('button')?.focus();
  });
  function syncScroll() { document.body.classList.toggle('no-scroll', cartDrawer.open || dialog.open); document.querySelector('#cart-mini').hidden = !cartEntries(state.cart, products).length || cartDrawer.open || dialog.open; }
  function openCart(opener = document.activeElement) {
    if (!isCustomer) return;
    closeMenu(); cartOpener = opener;
    cartDrawer.setAttribute('aria-hidden', 'false');
    renderCart(); cartDrawer.showModal(); syncScroll();
    if (!saving && !submittingOrder) refreshOpenCart();
  }
  async function refreshOpenCart() {
    saving = true;
    renderCart();
    try { await reloadCart(); }
    catch (error) { showToast(error.message); }
    finally { saving = false; renderCart(); }
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
    dialogContent.innerHTML = `<div class="dialog-layout"><div class="dialog-main-image product-card-image ${categoryClass(product)}" id="dialog-main-image">${productPhoto(product)}</div><div class="dialog-info"><p class="eyebrow">${escapeHTML(product.category)} · ${escapeHTML(product.size)}</p><h2 id="detail-title">${escapeHTML(product.name)}</h2><p>${escapeHTML(product.description)}</p><strong class="dialog-price">${money(product.price)}</strong><p>${stockLimit(product) ? 'Disponible' : 'Agotado'}</p>${product.image ? `<div class="dialog-gallery" role="group" aria-label="Ver fotografía del producto">${['Botella completa', 'Ampliar etiqueta'].map((label, index) => `<button type="button" class="dialog-thumb ${index === 0 ? 'is-selected' : ''} product-card-image ${categoryClass(product)} view-${index}" aria-label="${label}" aria-pressed="${index === 0}" data-dialog-image="${index}"><span>${label}</span></button>`).join('')}</div>` : ''}${stockLimit(product) && (!isAdmin || isCustomer) ? `<button class="primary-button w-full" type="button" data-dialog-add="${product.id}">${isCustomer ? 'Añadir al carrito' : 'Ingresa para comprar'} <span aria-hidden="true">+</span></button>` : ''}</div></div>`;
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
    const recommend = target.closest('[data-recommend-product]'); if (recommend) addToCart(recommend.dataset.recommendProduct);
    const add = target.closest('[data-add-product]'); if (add) addToCart(add.dataset.addProduct);
    const view = target.closest('[data-view-product]'); if (view) openProduct(view.dataset.viewProduct);
    const increase = target.closest('[data-increase]'); if (increase) changeQuantity(increase.dataset.increase, 1);
    const remove = target.closest('[data-remove]'); if (remove) removeFromCart(remove.dataset.remove);
    const decrease = target.closest('[data-decrease]'); if (decrease) changeQuantity(decrease.dataset.decrease, -1);
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
    if (dialogAdd) addToCart(dialogAdd.dataset.dialogAdd);
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
  function updateCatalogSelection() {
    document.querySelectorAll('[data-add-product]').forEach((button) => {
      const id = button.dataset.addProduct;
      const quantity = state.cart[id] || 0;
      const available = stockLimit(productById.get(id));
      const label = !available ? 'Agotado' : quantity ? `En tu carrito · ${quantity}` :
        isCustomer ? 'Añadir al carrito' : isAdmin ? 'Disponible' : 'Ingresa para comprar';
      button.classList.toggle('is-in-cart', quantity > 0);
      button.textContent = label;
      button.setAttribute('aria-label', `${label}: ${productById.get(id).name}`);
      button.disabled = !available || quantity >= available || isAdmin && !isCustomer || saving || submittingOrder;
    });
  }
  function renderRecommendations() {
    const entries = cartEntries(state.cart, products);
    const base = entries.find(({ product }) => product.id === lastAddedId)?.product || entries[0]?.product;
    const available = products.filter((product) => stockLimit(product) && !state.cart[product.id]);
    const suggestions = [...available].sort((a, b) => Number(b.category === base?.category) - Number(a.category === base?.category) || a.price - b.price).slice(0, 2);
    document.querySelector('#cart-recommendations').hidden = !entries.length || !suggestions.length;
    document.querySelector('#recommendation-items').innerHTML = suggestions.map((product) => `<article class="recommendation"><div class="recommendation-image product-card-image ${categoryClass(product)}">${productPhoto(product)}</div><div><p>${escapeHTML(product.name)}</p><span>${money(product.price)} · ${escapeHTML(product.size)}</span></div><button type="button" aria-label="Añadir a mi selección: ${escapeHTML(product.name)}" data-recommend-product="${product.id}">+</button></article>`).join('');
  }
  document.querySelector('#review-order').addEventListener('click', () => {
    cartDrawer.querySelector('.cart-footer').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    document.querySelector('input[name="delivery"]:checked').focus({ preventScroll: true });
  });
  const form = document.querySelector('#order-form');
  const deliveryAddress = document.querySelector('#delivery-address');
  function updateDelivery() {
    const home = form.elements.delivery.value === 'domicilio';
    deliveryAddress.hidden = !home;
    deliveryAddress.disabled = !home || submittingOrder;
    document.querySelector('#delivery-summary').textContent = home ? 'Entrega a domicilio' : 'Retiro en tienda';
    document.querySelector('#delivery-hint').textContent = home
      ? 'Confirmaremos cobertura y tarifa. El envío no está incluido.'
      : 'Coordinaremos contigo el punto y horario de retiro.';
  }
  form.addEventListener('change', updateDelivery);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!isCustomer || saving || submittingOrder || checkoutButton.disabled) return;
    if (!getToken()) { location.assign('/cuenta?desde=tienda'); return; }
    const invalidQuantity = cartItems.querySelector('[aria-invalid="true"]');
    if (invalidQuantity) { invalidQuantity.focus(); return; }
    const values = Object.fromEntries(new FormData(form));
    const items = toItems(committed);
    const status = document.querySelector('#checkout-status');
    submittingOrder = true;
    checkoutButton.disabled = true;
    updateCatalogSelection();
    status.textContent = 'Registrando pedido…';
    let message;
    try {
      const {data} = await request('/pedidos', { method: 'POST', body: {
        items, desde_carrito: true, modalidad_entrega: values.delivery === 'domicilio' ? 'delivery' : 'retiro',
        direccion: values.direccion, ciudad: values.ciudad, observacion: values.observacion,
      }});
      committed = {};
      state.cart = committed;
      removedCart = null;
      form.reset();
      message = `Pedido #${data.id_pedido} registrado. Consulta su estado en Mi cuenta.`;
      await Promise.allSettled(items.map(async item => {
        const {data: product} = await request('/productos/' + item.id_producto);
        productById.get(item.id_producto).stock = product.stock;
      }));
    } catch (error) {
      if (error.status === 401) location.assign('/cuenta?desde=tienda');
      if (error.status === 409) {
        try { await reloadCart(); } catch { /* Keep the last confirmed selection. */ }
      }
      message = error.message;
    } finally {
      submittingOrder = false;
      updateDelivery();
      renderCart();
      status.textContent = message;
    }
  });
  updateDelivery();
  document.addEventListener('catalog:reset', () => {
    state.search = ''; state.category = 'Todos'; state.sort = 'featured'; state.budget = 'all'; state.occasion = ''; state.limit = 12;
    document.querySelector('#product-budget').value = 'all';
    searchInput.value = ''; document.querySelector('#product-sort').value = 'featured';
    renderProducts();
  });
  renderProducts(); renderCart();

}
