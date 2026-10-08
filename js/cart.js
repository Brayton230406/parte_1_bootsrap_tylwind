import { STORAGE_KEY, readStoredCart, persistCart } from './storage.js';
export { STORAGE_KEY };
export const MAX_QUANTITY = 99;
export const readCart = readStoredCart;
export const saveCart = persistCart;

export function cartEntries(cart, products) { return Object.entries(cart).map(([id, quantity]) => ({ product: products.find((product) => product.id === Number(id)), quantity })); }

export function cartTotalValue(entries) { return entries.reduce((sum, { product, quantity }) => sum + Math.round(product.price * 100) * quantity, 0) / 100; }

// Operaciones puras del modelo: no conocen el DOM ni WhatsApp.
export function setQuantity(cart, id, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) throw new RangeError('Cantidad inválida');
  return { ...cart, [id]: quantity };
}
export function removeProduct(cart, id) { const next = { ...cart }; delete next[id]; return next; }
export function restoreProducts(cart, removed) {
  const next = { ...cart };
  for (const [id, quantity] of Object.entries(removed)) next[id] = Math.max(next[id] || 0, quantity);
  return next;
}
