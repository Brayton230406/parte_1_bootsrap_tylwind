// Funciones de presentación compartidas por tarjetas, carrito y detalle.
export function escapeHTML(value) { return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
export function money(value) { return `$${value.toFixed(2)}`; }
export function normalize(text) { return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
export function categoryClass(product) { return `category-${normalize(product.category).replace(/[^a-z0-9-]/g, '')}`; }
export function productPhoto(product) {
    if (!product.image) return '<div class="photo-pending"><span aria-hidden="true">M.</span><p>Fotografía por confirmar</p></div>';
    return `<img class="product-photo" src="${product.image}" alt="${escapeHTML(product.name)}, fotografía de referencia" width="800" height="800" loading="lazy" decoding="async">`;
  }

// <dialog> supplies modal semantics; this helper keeps Tab within visible controls.
export function trapDialogFocus(modal) {
  modal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...modal.querySelectorAll('button, a[href], input, textarea, select, summary, [tabindex="0"]')].filter((control) => {
      if (control.disabled || control.tabIndex < 0 || !control.getClientRects().length) return false;
      const closed = control.closest('details:not([open])');
      if (closed && !(control.tagName === 'SUMMARY' && control.parentElement === closed)) return false;
      if (control.matches('input[type="radio"]') && !control.checked) {
        return ![...modal.querySelectorAll('input[type="radio"]')].some((radio) => radio.name === control.name && radio.checked);
      }
      return true;
    });
    if (!controls.length) return;
    event.preventDefault();
    const current = controls.indexOf(document.activeElement);
    const next = current < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (current + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    controls[next].focus();
  });
}
