// Reglas compartidas por el formulario y los controles de cantidad.
export const rules = {
  quantity: /^(?:[1-9]|[1-9][0-9])$/,
  name: /^[\p{L}\p{M}][\p{L}\p{M} .’'\-]{1,59}$/u,
  phone: /^(?:\+593|593|0)9\d{8}$/,
  email: /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/,
  address: /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s.,#º°/()’'\-]{7,159}$/u,
  note: /^[^<>\u0000-\u0008\u000b\u000c\u000e-\u001f]{0,300}$/u,
};
export function fieldError(field, value, delivery) {
  const text = value.trim();
  if (field === 'address' && delivery !== 'domicilio') return '';
  if (!text) return '';// Customer details are optional when making a WhatsApp consultation.
  if (field === 'phone') return rules.phone.test(text.replace(/[\s()-]/g, '')) ? '' : 'Usa un celular de Ecuador: 0991234567 o +593991234567.';
  const messages = { name: 'Escribe de 2 a 60 caracteres: letras, espacios, apóstrofos o guiones.', email: 'Introduce un correo válido, por ejemplo nombre@dominio.com.', address: 'Escribe de 8 a 160 caracteres con la calle y una referencia.', note: 'Usa hasta 300 caracteres, sin etiquetas HTML ni caracteres de control.' };
  return rules[field].test(text) ? '' : messages[field];
}
export function showFieldError(input, message) {
  input.setAttribute('aria-invalid', String(Boolean(message)));
  const error = document.getElementById(`${input.id}-error`);
  if (error) error.textContent = message;
  input.setCustomValidity(message);
}
export function initValidation(form, onChange) {
  const inputs = [...form.querySelectorAll('[data-rule]')];
  const validate = (input) => {
    const delivery = form.querySelector('input[name="delivery"]:checked').value;
    const error = fieldError(input.dataset.rule, input.value, delivery);
    showFieldError(input, error); return !error;
  };
  for (const input of inputs) {
    input.addEventListener('blur', () => validate(input));
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') validate(input); onChange(); });
  }
  return () => {
    const invalid = inputs.filter((input) => !validate(input));
    if (invalid.length) { const details = invalid[0].closest('details'); if (details) details.open = true; invalid[0].focus(); }
    return invalid.length === 0;
  };
}
