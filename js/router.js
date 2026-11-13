let accountElement;
let accountLoading;
const store = document.querySelector('#age-content');
const ageGate = document.querySelector('#age-gate');

async function accountView() {
  if (accountElement) return accountElement;
  if (!accountLoading) accountLoading = (async () => {
    const response = await fetch('/cuenta-contenido');
    if (!response.ok) throw new Error('No se pudo cargar la cuenta.');
    const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
    const wrapper = document.createElement('div');
    wrapper.className = 'account-page';
    wrapper.id = 'account-view';
    wrapper.append(...parsed.querySelectorAll('.account-header, main.account'));
    document.body.append(wrapper);
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/assets/account.css';
    document.head.append(css);
    accountElement = wrapper;
    await import('./pages/account.js');
    return wrapper;
  })();
  return accountLoading;
}

async function renderRoute() {
  const account = location.pathname === '/cuenta';
  if (account) {
    const view = await accountView();
    if (location.pathname !== '/cuenta') return;
    ageGate.hidden = true;
    store.hidden = true;
    view.hidden = false;
    window.scrollTo(0, 0);
  } else {
    if (accountElement) accountElement.hidden = true;
    const confirmed = ['localStorage', 'sessionStorage'].some(type => {
      try { return window[type].getItem('michoks-age-confirmed') === '1'; } catch { return false; }
    });
    ageGate.hidden = confirmed;
    store.hidden = !confirmed;
  }
}
function navigate(url) {
  history.pushState(null, '', url);
  renderRoute().catch(error => console.error('Navegación:', error));
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || !['/', '/cuenta'].includes(url.pathname)) return;
  if (url.pathname === location.pathname && url.pathname === '/') return;
  event.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});
document.addEventListener('michoks:navigate', event => navigate(event.detail));
window.addEventListener('popstate', renderRoute);
if (location.pathname === '/cuenta') renderRoute();
