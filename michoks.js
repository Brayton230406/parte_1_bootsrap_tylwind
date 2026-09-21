const products = [
  { id: 1, name: 'Whisky Glenfiddich 12', category: 'Whisky', price: 59.9, size: '750 ml', image: 1, description: 'Notas frescas de pera, roble suave y un final largo para tomarlo con calma.', gallery: [1, 11, 4, 6, 9] },
  { id: 2, name: 'Malbec Reserva Andino', category: 'Vinos', price: 24.5, size: '750 ml', image: 2, description: 'Vino tinto intenso, frutal y perfecto para una mesa compartida.', gallery: [2, 5, 8, 10] },
  { id: 3, name: 'Gin Mare Mediterranean', category: 'Gin', price: 68.0, size: '700 ml', image: 3, description: 'Botánicos mediterráneos para un gin tonic aromático y elegante.', gallery: [3, 12, 7, 9] },
  { id: 4, name: 'Tequila Don Julio Blanco', category: 'Tequila', price: 74.9, size: '700 ml', image: 4, description: 'Agave azul, notas cítricas y un final limpio para celebrar.', gallery: [4, 9, 1, 6] },
  { id: 5, name: 'Cerveza artesanal IPA', category: 'Cervezas', price: 4.75, size: '330 ml', image: 5, description: 'Amargor equilibrado, cítrica y lista para abrir bien fría.', gallery: [5, 6, 10] },
  { id: 6, name: 'Ron Zacapa 23', category: 'Whisky', price: 79.9, size: '750 ml', image: 6, description: 'Ron añejo de cuerpo sedoso, caramelo y especias dulces.', gallery: [6, 1, 11, 3, 8] },
  { id: 7, name: 'Champagne Moët & Chandon', category: 'Vinos', price: 89.0, size: '750 ml', image: 7, description: 'Burbujas finas y frescas para los momentos que merecen brindis.', gallery: [7, 10, 2, 5] },
  { id: 8, name: 'Vodka Grey Goose', category: 'Gin', price: 64.5, size: '750 ml', image: 8, description: 'Vodka suave y limpio, ideal para cócteles clásicos.', gallery: [8, 3, 12, 4] },
  { id: 9, name: 'Aperol Spritz Kit', category: 'Vinos', price: 36.9, size: 'Kit 3 piezas', image: 9, description: 'Aperitivo, burbujas y cítricos para preparar el clásico en casa.', gallery: [9, 3, 5, 7] },
  { id: 10, name: 'Cerveza Lager Pack x6', category: 'Cervezas', price: 16.9, size: '6 x 330 ml', image: 10, description: 'Seis cervezas ligeras y refrescantes para compartir sin pausa.', gallery: [10, 5, 6] },
  { id: 11, name: 'Bourbon Maker\'s Mark', category: 'Whisky', price: 62.9, size: '750 ml', image: 11, description: 'Bourbon de vainilla, caramelo y especias con carácter americano.', gallery: [11, 1, 4, 6, 9] },
  { id: 12, name: 'Tequila 1800 Reposado', category: 'Tequila', price: 48.9, size: '700 ml', image: 12, description: 'Reposado cálido y redondo para shots, margaritas y sobremesas.', gallery: [12, 4, 3, 8] },
];

const state = { category: 'Todos', search: '', cart: JSON.parse(localStorage.getItem('michoks-cart') || '{}') };
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
let toastTimer;
cartDrawer.setAttribute('aria-hidden', 'true');

function money(value) { return `$${value.toFixed(2)}`; }
function imageClass(image) { return `img-${image}`; }
function visibleProducts() {
  return products.filter((product) => {
    const matchesCategory = state.category === 'Todos' || product.category === state.category;
    const search = state.search.toLowerCase();
    return matchesCategory && (!search || `${product.name} ${product.category}`.toLowerCase().includes(search));
  });
}
function renderProducts() {
  const visible = visibleProducts();
  productGrid.innerHTML = visible.map((product) => `<article class="product-card"><div class="product-card-image ${imageClass(product.image)}"><button class="quick-view" type="button" aria-label="Vista rápida: ${product.name}" data-view-product="${product.id}">Vista rápida</button></div><p class="product-category">${product.category}</p><h3>${product.name}</h3><div class="product-meta"><strong class="product-price">${money(product.price)}</strong><span class="product-size">${product.size}</span></div><button class="add-product" type="button" data-add-product="${product.id}">Añadir al carrito <span aria-hidden="true">+</span></button></article>`).join('');
  emptyProducts.hidden = visible.length > 0;
}
function saveCart() { localStorage.setItem('michoks-cart', JSON.stringify(state.cart)); }
function cartEntries() { return Object.entries(state.cart).map(([id, quantity]) => ({ product: products.find((product) => product.id === Number(id)), quantity })).filter((entry) => entry.product); }
function renderCart() {
  const entries = cartEntries();
  const count = entries.reduce((total, entry) => total + entry.quantity, 0);
  const total = entries.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0);
  cartCount.textContent = count;
  cartTotal.textContent = money(total);
  checkoutButton.disabled = entries.length === 0;
  cartItems.innerHTML = entries.length ? entries.map(({ product, quantity }) => `<div class="cart-line"><div class="cart-line-image product-card-image ${imageClass(product.image)}" role="img" aria-label="${product.name}"></div><div><h3>${product.name}</h3><p>${money(product.price)} · ${product.size}</p><div class="quantity-controls"><button type="button" aria-label="Reducir ${product.name}" data-decrease="${product.id}">−</button><span>${quantity}</span><button type="button" aria-label="Aumentar ${product.name}" data-increase="${product.id}">+</button></div></div><strong class="line-price">${money(product.price * quantity)}</strong></div>`).join('') : '<p class="cart-empty">Tu carrito está esperando una buena botella.</p>';
}
function showToast(message) { toast.textContent = message; toast.classList.add('is-visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2500); }
function addToCart(id) { state.cart[id] = (state.cart[id] || 0) + 1; saveCart(); renderCart(); showToast('Producto añadido al carrito'); }
function changeQuantity(id, amount) { state.cart[id] = (state.cart[id] || 0) + amount; if (state.cart[id] <= 0) delete state.cart[id]; saveCart(); renderCart(); }
function openCart() { cartDrawer.classList.add('is-open'); cartDrawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll'); }
function closeCart() { cartDrawer.classList.remove('is-open'); cartDrawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll'); }
function openProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  dialogContent.innerHTML = `<div class="dialog-layout"><div class="dialog-main-image product-card-image ${imageClass(product.image)}" id="dialog-main-image" role="img" aria-label="${product.name}"></div><div class="dialog-info"><p class="kicker">${product.category} · ${product.size}</p><h2>${product.name}</h2><p>${product.description}</p><strong class="dialog-price">${money(product.price)}</strong><div class="dialog-gallery" aria-label="Más imágenes de ${product.name}">${product.gallery.map((image, index) => `<button type="button" class="dialog-thumb ${index === 0 ? 'is-selected' : ''} product-card-image ${imageClass(image)}" aria-label="Ver imagen ${index + 1}" data-dialog-image="${image}"></button>`).join('')}</div><button class="gold-button full-button" type="button" data-dialog-add="${product.id}">Añadir al carrito <span aria-hidden="true">+</span></button></div></div>`;
  dialog.showModal();
}

document.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-add-product]');
  const viewButton = event.target.closest('[data-view-product]');
  const increase = event.target.closest('[data-increase]');
  const decrease = event.target.closest('[data-decrease]');
  const categoryButton = event.target.closest('[data-category]');
  if (addButton) addToCart(Number(addButton.dataset.addProduct));
  if (viewButton) openProduct(Number(viewButton.dataset.viewProduct));
  if (increase) changeQuantity(Number(increase.dataset.increase), 1);
  if (decrease) changeQuantity(Number(decrease.dataset.decrease), -1);
  if (categoryButton) { state.category = categoryButton.dataset.category; document.querySelectorAll('.category-tab').forEach((button) => button.classList.toggle('is-active', button.dataset.category === state.category)); renderProducts(); document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth' }); }
  if (event.target.closest('[data-close-cart]')) closeCart();
  const dialogImage = event.target.closest('[data-dialog-image]');
  if (dialogImage) { document.querySelector('#dialog-main-image').className = `dialog-main-image product-card-image ${imageClass(dialogImage.dataset.dialogImage)}`; document.querySelectorAll('.dialog-thumb').forEach((button) => button.classList.remove('is-selected')); dialogImage.classList.add('is-selected'); }
  const dialogAdd = event.target.closest('[data-dialog-add]');
  if (dialogAdd) { addToCart(Number(dialogAdd.dataset.dialogAdd)); dialog.close(); openCart(); }
});
document.querySelector('.cart-button').addEventListener('click', openCart);
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
searchInput.addEventListener('input', (event) => { state.search = event.target.value; renderProducts(); });
checkoutButton.addEventListener('click', () => { showToast('Pedido listo: te contactaremos por WhatsApp'); });
document.querySelectorAll('.inline-action').forEach((button) => button.addEventListener('click', () => { state.category = button.dataset.category; document.querySelectorAll('.category-tab').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.category === state.category)); renderProducts(); document.querySelector('#catalogo').scrollIntoView({ behavior: 'smooth' }); }));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && cartDrawer.classList.contains('is-open')) closeCart(); });
renderProducts();
renderCart();
