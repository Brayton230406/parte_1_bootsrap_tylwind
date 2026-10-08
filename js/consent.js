import { trapDialogFocus } from './components.js';
const KEY = 'michoks-cookie-consent';
let memoryChoice = null;
export function cookieChoice() {
  if (memoryChoice) return memoryChoice;
  for (const type of ['sessionStorage', 'localStorage']) {
    try { const value = window[type].getItem(KEY); if (['accepted', 'denied'].includes(value)) return value; } catch { /* navegador restringido */ }
  }
  return memoryChoice;
}
export function cookiesAllowed() { return cookieChoice() === 'accepted'; }
export function clearCartCookie() {
  try { document.cookie = `michoks_cart=; Max-Age=0; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`; } catch { /* cookies bloqueadas por el navegador */ }
}
export function initCookieConsent() {
  const dialog = document.querySelector('#cookie-dialog');
  const preferences = document.querySelector('#cookie-preferences');
  trapDialogFocus(dialog);
  if (!cookiesAllowed()) clearCartCookie();
  let resolveChoice;
  function choose(value) {
    memoryChoice = value;
    try { localStorage.setItem(KEY, value); try { sessionStorage.removeItem(KEY); } catch { /* opcional */ } }
    catch { try { sessionStorage.setItem(KEY, value); } catch { /* elección solo durante esta visita */ } }
    if (value === 'denied') clearCartCookie();
    document.dispatchEvent(new Event('cookie:change'));
    dialog.close();
    resolveChoice?.(); resolveChoice = null;
  }
  document.querySelector('#cookie-accept').addEventListener('click', () => choose('accepted'));
  document.querySelector('#cookie-deny').addEventListener('click', () => choose('denied'));
  dialog.addEventListener('cancel', event => { event.preventDefault(); choose('denied'); });
  preferences.addEventListener('click', () => { dialog.showModal(); document.querySelector('#cookie-deny').focus(); });
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) {
      memoryChoice = null;
      if (!cookiesAllowed()) clearCartCookie();
      document.dispatchEvent(new Event('cookie:change'));
    }
  });
  if (cookieChoice()) return Promise.resolve();
  dialog.showModal();
  document.querySelector('#cookie-deny').focus();
  return new Promise(resolve => { resolveChoice = resolve; });
}
