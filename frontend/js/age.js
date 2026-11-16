// Declaración de edad guardada en este navegador; no solicita fecha de nacimiento.
const KEY = 'michoks-age-confirmed';
export function confirmAge() {
  const gate = document.querySelector('#age-gate');
  const content = document.querySelector('#age-content');
  const accept = document.querySelector('#age-accept');
  const decline = document.querySelector('#age-decline');
  function confirmed() {
    for (const type of ['localStorage', 'sessionStorage']) {
      try { if (window[type].getItem(KEY) === '1') return true; } catch { /* almacenamiento restringido */ }
    }
    return false;
  }
  function reveal(focus) {
    gate.hidden = true;
    content.hidden = false;
    if (focus) { const heading = content.querySelector('h1'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
  if (confirmed()) { reveal(false); return Promise.resolve(); }
  accept.disabled = false;
  accept.focus({ preventScroll: true });
  decline.addEventListener('click', event => {
    event.preventDefault();
    for (const type of ['localStorage', 'sessionStorage']) {
      try { window[type].removeItem(KEY); } catch { /* no se guarda una aprobación */ }
    }
    location.replace(decline.href);
  });
  return new Promise(resolve => {
    accept.addEventListener('click', () => {
      try { localStorage.setItem(KEY, '1'); }
      catch { try { sessionStorage.setItem(KEY, '1'); } catch { /* confirmar nuevamente en otra visita */ } }
      reveal(true); resolve();
    }, { once: true });
  });
}
