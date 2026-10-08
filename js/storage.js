// Cuatro copias versionadas. Una selección vacía también se guarda para no resucitar compras.
export const STORAGE_KEY = 'michoks-cart';
const COOKIE_KEY = 'michoks_cart';
let memory = null;
let databasePromise;
let queue = Promise.resolve();
const safely = (action, fallback = null) => { try { return action(); } catch { return fallback; } };
function parse(value) { return safely(() => JSON.parse(value)); }
function snapshot(value, products) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const modern = value.version === 1;
  const cart = modern ? value.cart : value;
  if (!cart || typeof cart !== 'object' || Array.isArray(cart)) return null;
  const entries = Object.entries(cart);
  if (entries.some(([id, quantity]) => !products.some((p) => String(p.id) === id) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99)) return null;
  if (modern && (!Number.isSafeInteger(value.updatedAt) || value.updatedAt < 0)) return null;
  return { version: 1, updatedAt: modern ? value.updatedAt : 0, cart: { ...cart } };
}
function cookieValue() {
  return safely(() => decodeURIComponent(document.cookie.split('; ').find((item) => item.startsWith(`${COOKIE_KEY}=`))?.slice(COOKIE_KEY.length + 1) || ''));
}
function candidates(products) {
  return [parse(safely(() => localStorage.getItem(STORAGE_KEY))), parse(safely(() => sessionStorage.getItem(STORAGE_KEY))), parse(cookieValue()), memory].map((value) => snapshot(value, products)).filter(Boolean);
}
function newest(values) { return values.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null; }
function database() {
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('michoks', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Base de datos bloqueada.'));
  });
  return databasePromise;
}
async function indexed(action, value) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', action === 'get' ? 'readonly' : 'readwrite');
    const store = tx.objectStore('state');
    const request = action === 'get' ? store.get(STORAGE_KEY) : store.put(value, STORAGE_KEY);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
function persist(value) {
  memory = value;
  const text = JSON.stringify(value);
  let successes = 0;
  for (const getStorage of [() => localStorage, () => sessionStorage]) {
    if (safely(() => { getStorage().setItem(STORAGE_KEY, text); return true; }, false)) successes++;
  }
  if (safely(() => {
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(text)}; Max-Age=2592000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    return cookieValue() === text;
  }, false)) successes++;
  // Serialize asynchronous writes so an earlier quantity cannot overwrite a later one.
  queue = queue.catch(() => {}).then(() => indexed('put', value)).catch(() => {});
  return successes > 0;
}
export function readStoredCart(products) { return { ...(newest(candidates(products))?.cart || {}) }; }
export async function recoverCart(products) {
  const values = candidates(products);
  try { const value = snapshot(await indexed('get'), products); if (value) values.push(value); } catch { /* Other stores remain usable. */ }
  values.push(...candidates(products)); // Include changes from another tab while IndexedDB was loading.
  const recovered = newest(values);
  if (recovered) persist(recovered);
  return { ...(recovered?.cart || {}) };
}
export function persistCart(cart) {
  const updatedAt = Math.max(Date.now(), (memory?.updatedAt || 0) + 1);
  return persist({ version: 1, updatedAt, cart: { ...cart } });
}
export function storageSettled() { return queue; }
