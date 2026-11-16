// Reglas compartidas por el formulario y los controles de cantidad.
export const rules = {
  quantity: /^(?:[1-9]|[1-9][0-9])$/,
  name: /^[\p{L}\p{M}][\p{L}\p{M} .’'\-]{1,59}$/u,
  phone: /^(?:\+593|593|0)9\d{8}$/,
  email: /^(?!\.)(?![^@]*\.\.)(?![^@]*\.@)[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/,
  city: /^[\p{L}\p{M} .'-]{2,100}$/u,
  address: /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s.,#º°/()’'\-]{7,159}$/u,
};
export function fieldError(field, value, delivery) {
  const text = value.trim();
  if (['address','city'].includes(field) && delivery !== 'domicilio') return '';
  if (!text) return ({ name: 'Escribe tu nombre y apellido.', phone: 'Escribe un celular para coordinar tu pedido.', email: 'Escribe tu correo electrónico.', city: 'Escribe la ciudad.', address: 'Escribe la dirección completa para la entrega a domicilio.' })[field] || '';
  if (field === 'phone') return rules.phone.test(text.replace(/[\s()-]/g, '')) ? '' : 'Usa un celular de Ecuador: 0991234567 o +593991234567.';
  if (field === 'name' && (!rules.name.test(text) || text.split(/\s+/).length < 2)) return 'Escribe nombre y apellido, de 2 a 60 caracteres, sin números.';
  const messages = { city: 'Escribe una ciudad válida de 2 a 100 caracteres.', name: 'Escribe nombre y apellido válidos.', email: 'Introduce un correo válido, por ejemplo nombre@dominio.com.', address: 'Escribe de 8 a 160 caracteres con ciudad o sector, calle y número de casa.' };
  return rules[field].test(text) ? '' : messages[field];
}
export function showFieldError(input, message) {
  input.setAttribute('aria-invalid', String(Boolean(message)));
  const error = document.getElementById(`${input.id}-error`);
  if (error && error.textContent !== message) error.textContent = message;
  input.setCustomValidity(message);
}
// Validación progresiva: no encierra el foco; deshabilita los campos posteriores.
export function initValidation(form, onChange) {
  const inputs = [...form.querySelectorAll('[data-rule]')];
  const touched = new Set();
  const delivery = () => form.querySelector('input[name="delivery"]:checked').value;
  const applicable = input => !['address','city'].includes(input.dataset.rule) || delivery() === 'domicilio';
  function refresh() {
    let previousValid = true;
    let firstPending;
    for (const input of inputs) {
      const active = applicable(input);
      const error = active ? fieldError(input.dataset.rule, input.value, delivery()) : '';
      input.disabled = !active || !previousValid;
      if (!active || input.disabled) showFieldError(input, '');
      else if (touched.has(input)) showFieldError(input, error);
      if (active) {
        if (!firstPending && error) firstPending = input;
        previousValid = previousValid && !error;
      }
    }
    const progress = form.querySelector('#form-progress');
    const status = firstPending ? `Completa correctamente: ${form.querySelector(`label[for="${firstPending.id}"]`).textContent}. Los campos siguientes se habilitan en orden.` : 'Datos completos. Ya puedes enviar tu solicitud.';
    if (progress && progress.textContent !== status) progress.textContent = status;
  }
  for (const input of inputs) {
    input.addEventListener('input', () => { touched.add(input); refresh(); onChange(); });
    input.addEventListener('blur', () => { touched.add(input); refresh(); });
    // Permite autocompletado del navegador además de escritura y pegado.
    input.addEventListener('change', () => { touched.add(input); refresh(); onChange(); });
  }
  const validate = () => {
    const firstInvalid = inputs.find(input => applicable(input) && fieldError(input.dataset.rule, input.value, delivery()));
    if (firstInvalid) {
      touched.add(firstInvalid); refresh();
      const details = firstInvalid.closest('details'); if (details) details.open = true;
      firstInvalid.focus(); return false;
    }
    refresh(); return true;
  };
  validate.refresh = refresh;
  refresh();
  return validate;
}
