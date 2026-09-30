const products = [
  { id: 1, name: 'Whisky Johnnie Walker Red Label', category: 'Whisky', price: 39.9, size: '750 ml', image: 'assets/products/red-label.png', description: 'Whisky escocés clásico para llevar, compartir o regalar.' },
  { id: 2, name: 'Whisky Old Parr 12 años', category: 'Whisky', price: 59.9, size: '750 ml', image: 'assets/products/old-parr-12.jpg', description: 'Whisky de 12 años con perfil suave y presentación premium.' },
  { id: 3, name: 'Vino Casillero del Diablo', category: 'Vinos', price: 18.9, size: '750 ml', image: 'assets/products/casillero-cabernet.jpg', description: 'Vino chileno para acompañar la mesa y llevar a casa.' },
  { id: 4, name: 'Cerveza Club Verde', category: 'Cervezas', price: 1.5, size: '330 ml', image: 'assets/products/club-verde.png', description: 'La Club Verde bien fría, lista para tu pedido.' },
  { id: 5, name: 'Cerveza Pilsener', category: 'Cervezas', price: 1.25, size: '330 ml', image: 'assets/products/pilsener.png', description: 'La clásica Pilsener ecuatoriana para llevar.' },
  { id: 6, name: 'Cóctel Switch Bongo Bongo', category: 'Cócteles', price: 1.5, size: '1500 ml', image: 'assets/products/switch-bongo.png', description: 'Cóctel Switch Bongo Bongo en presentación de 1,5 litros. Confirma el precio y disponibilidad al consultar.' },
  { id: 8, name: 'Zhumir Seco Suave', category: 'Zhumir', price: 9.9, size: '700 ml', image: 'assets/products/zhumir-seco.png', description: 'Zhumir ecuatoriano para llevar, con el sabor de siempre.' },
  { id: 9, name: 'Tequila José Cuervo Especial', category: 'Tequilas', price: 34.9, size: '750 ml', image: 'assets/products/jose-cuervo.png', description: 'Tequila José Cuervo para completar tu pedido de licores.' },
  { id: 10, name: 'Vodka Smirnoff', category: 'Vodkas', price: 22.9, size: '750 ml', image: 'assets/products/smirnoff.jpg', description: 'Vodka Smirnoff original, una botella infaltable en tu compra.' },
  { id: 11, name: 'Vino Gato Negro', category: 'Vinos', price: 12.9, size: '750 ml', image: 'assets/products/gato-negro.png', description: 'Vino Gato Negro para una compra práctica y rendidora.' },
  { id: 12, name: 'Whisky Chivas Regal 12', category: 'Whisky', price: 69.9, size: '750 ml', image: 'assets/products/chivas-12.jpg', description: 'Whisky premium de 12 años para ocasiones especiales.' },
];

const WHATSAPP_NUMBER = '593959862988';
const STORAGE_KEY = 'michoks-cart';
const MAX_QUANTITY = 99;
function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([id, quantity]) => products.some((product) => String(product.id) === id) && Number.isInteger(quantity) && quantity > 0 && quantity <= MAX_QUANTITY));
  } catch { return {}; }
}
const state = { category: 'Todos', search: '', sort: 'featured', cart: readCart() };
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
for (const modal of [cartDrawer, dialog]) {
  modal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...modal.querySelectorAll('button:not([disabled]), a[href], input, select, [tabindex="0"]')].filter((control) => control.getClientRects().length > 0);
    const first = controls[0]; const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
}
let toastTimer;
let cartOpener;
function money(value) { return `$${value.toFixed(2)}`; }
function normalize(text) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function categoryClass(product) { return `category-${normalize(product.category)}`; }
function productPhoto(product) {
  if (!product.image) return '<div class="photo-pending"><span aria-hidden="true">M.</span><p>Fotografía por confirmar</p></div>';
  return `<img class="product-photo" src="${product.image}" alt="${product.name}, fotografía de referencia" width="800" height="800" loading="lazy" decoding="async">`;
}
function visibleProducts() {
  const visible = products.filter((product) => (state.category === 'Todos' || product.category === state.category) && normalize(`${product.name} ${product.category}`).includes(normalize(state.search)));
  if (state.sort === 'price-asc') visible.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-desc') visible.sort((a, b) => b.price - a.price);
  if (state.sort === 'name') visible.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return visible;
}
function renderProducts() {
  const visible = visibleProducts();
  productGrid.innerHTML = visible.map((product) => `<article class="product-card"><div class="product-card-image ${categoryClass(product)}">${productPhoto(product)}<button class="quick-view" type="button" aria-label="Vista rápida: ${product.name}" data-view-product="${product.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></div><p class="product-category">${product.category}</p><h3>${product.name}</h3><div class="product-meta"><strong class="product-price">${money(product.price)}</strong><span class="product-size">${product.size}</span></div><button class="add-product" type="button" aria-label="Añadir al carrito: ${product.name}" data-add-product="${product.id}">Añadir al carrito <span aria-hidden="true">+</span></button></article>`).join('');
  emptyProducts.hidden = visible.length > 0;
  document.querySelector('#results-count').textContent = `${visible.length} ${visible.length === 1 ? 'producto' : 'productos'} para descubrir`;
  document.querySelectorAll('.category-tab').forEach((button) => {
    const active = button.dataset.category === state.category;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart)); return true; }
  catch { return false; }
}
function cartEntries() { return Object.entries(state.cart).map(([id, quantity]) => ({ product: products.find((product) => product.id === Number(id)), quantity })); }
function renderCart() {
  const active = document.activeElement;
  const focusSelector = active?.dataset.increase ? `[data-increase="${active.dataset.increase}"]` : active?.dataset.decrease ? `[data-decrease="${active.dataset.decrease}"]` : null;
  const entries = cartEntries();
  cartCount.textContent = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  cartTotal.textContent = money(entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0));
  checkoutButton.disabled = entries.length === 0;
  document.querySelector('#checkout-status').textContent = '';
  document.querySelector('#whatsapp-fallback').hidden = true;
  cartItems.innerHTML = entries.length ? entries.map(({ product, quantity }) => `<div class="cart-line"><div class="cart-line-image product-card-image ${categoryClass(product)}">${productPhoto(product)}</div><div><h3>${product.name}</h3><p>${money(product.price)} · ${product.size}</p><div class="quantity-controls"><button type="button" aria-label="Reducir ${product.name}" data-decrease="${product.id}">−</button><span>${quantity}</span><button type="button" aria-label="Aumentar ${product.name}" data-increase="${product.id}" ${quantity >= MAX_QUANTITY ? 'disabled' : ''}>+</button></div></div><strong class="line-price">${money(product.price * quantity)}</strong></div>`).join('') : '<p class="cart-empty"><strong>Tu próxima selección<br>empieza aquí.</strong>Explora el catálogo y añade tus favoritos.</p>';
  if (focusSelector && cartDrawer.open) (cartItems.querySelector(focusSelector) || cartItems.querySelector('button') || cartDrawer.querySelector('[data-close-cart]')).focus({ preventScroll: true });
}
function showToast(message) { toast.textContent = message; toast.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3500); }
function addToCart(id) {
  if (!products.some((product) => product.id === id)) return;
  if ((state.cart[id] || 0) >= MAX_QUANTITY) { showToast('Máximo de 99 unidades por producto. Consulta pedidos mayores por WhatsApp.'); return; }
  state.cart[id] = (state.cart[id] || 0) + 1;
  const saved = saveCart(); renderCart();
  showToast(saved ? 'Añadido a tu selección. ¡Buen gusto!' : 'Producto añadido. Tu navegador no permite guardar el carrito al cerrar.');
}
function changeQuantity(id, amount) {
  if (!state.cart[id]) return;
  state.cart[id] = Math.min(MAX_QUANTITY, state.cart[id] + amount);
  if (state.cart[id] <= 0) delete state.cart[id];
  const saved = saveCart(); renderCart();
  if (!saved) showToast('Cantidad actualizada. No se pudo guardar para otra visita.');
}
function syncScroll() { document.body.classList.toggle('no-scroll', cartDrawer.open || dialog.open); }
function openCart(opener = document.activeElement) {
  closeMenu(); cartOpener = opener;
  cartDrawer.setAttribute('aria-hidden', 'false');
  cartDrawer.showModal(); syncScroll();
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
  dialogContent.innerHTML = `<div class="dialog-layout"><div class="dialog-main-image product-card-image ${categoryClass(product)}" id="dialog-main-image">${productPhoto(product)}</div><div class="dialog-info"><p class="eyebrow">${product.category} · ${product.size}</p><h2 id="detail-title">${product.name}</h2><p>${product.description}</p><strong class="dialog-price">${money(product.price)}</strong><p>Precio referencial. Confirma la presentación y disponibilidad al consultar.</p>${product.image ? `<div class="dialog-gallery" role="group" aria-label="Ver fotografía del producto">${['Botella completa', 'Ampliar etiqueta'].map((label, index) => `<button type="button" class="dialog-thumb ${index === 0 ? 'is-selected' : ''} product-card-image ${categoryClass(product)} view-${index}" aria-label="${label}" aria-pressed="${index === 0}" data-dialog-image="${index}"><span>${label}</span></button>`).join('')}</div>` : ''}<button class="primary-button w-full" type="button" data-dialog-add="${product.id}">Añadir al carrito <span aria-hidden="true">+</span></button></div></div>`;
  dialog.showModal(); syncScroll();
}
function setCategory(category, scroll = false) {
  state.category = category;
  if (scroll) { state.search = ''; searchInput.value = ''; }
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
  const add = target.closest('[data-add-product]'); if (add) addToCart(Number(add.dataset.addProduct));
  const view = target.closest('[data-view-product]'); if (view) openProduct(Number(view.dataset.viewProduct));
  const increase = target.closest('[data-increase]'); if (increase) changeQuantity(Number(increase.dataset.increase), 1);
  const decrease = target.closest('[data-decrease]'); if (decrease) changeQuantity(Number(decrease.dataset.decrease), -1);
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
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', syncScroll);
searchInput.addEventListener('input', (event) => { state.search = event.target.value; renderProducts(); });
document.querySelector('#product-sort').addEventListener('change', (event) => { state.sort = event.target.value; renderProducts(); });
document.querySelector('#reset-filters').addEventListener('click', () => { state.search = ''; searchInput.value = ''; setCategory('Todos'); searchInput.focus(); });
checkoutButton.addEventListener('click', () => {
  const entries = cartEntries(); if (!entries.length) return;
  const total = entries.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  const lines = entries.map(({ product, quantity }) => `${quantity} × ${product.name} (${product.size}) — ${money(product.price * quantity)}`);
  const message = ['Hola MICHOKS, quisiera consultar esta selección:', '', ...lines, '', `Total referencial: ${money(total)} USD.`, '¿Me confirman disponibilidad, precio final y opciones de entrega?', 'Soy mayor de 18 años.'].join('\n');
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  const fallback = document.querySelector('#whatsapp-fallback'); fallback.href = url; fallback.hidden = false;
  window.open(url, '_blank', 'noopener,noreferrer');
  document.querySelector('#checkout-status').textContent = 'Continúa en WhatsApp y envía el mensaje para consultar. Tu pedido aún no está confirmado.';
});
renderProducts(); renderCart();
