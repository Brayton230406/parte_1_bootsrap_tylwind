export const getToken = () => sessionStorage.getItem('michoks.session');
export function setToken(token) {
  if (token) sessionStorage.setItem('michoks.session', token);
  else sessionStorage.removeItem('michoks.session');
}
export async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let response;
  try { response = await fetch('/api/v1' + path, {
    method,
    cache:'no-store',
    signal:AbortSignal.timeout(15000),
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }); } catch {
    throw Object.assign(new Error('No se pudo conectar con la tienda. Revisa tu conexión e inténtalo de nuevo.'), {status:0});
  }
  if (response.status === 204) return {};
  const result = await response.json().catch(()=>({error:{message:'Respuesta inválida del servidor.'}}));
  if (!response.ok || result.status !== 'success') {
    if (response.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new CustomEvent('michoks:sesion-expirada'));
    }
    throw Object.assign(new Error(response.status >= 500 ? 'La tienda no está disponible. Inténtalo más tarde.' : result.error?.message || 'Error al consultar la tienda.'), { status: response.status, correlationId:result.error?.requestId || response.headers.get('X-Correlation-ID') });
  }
  return result;
}
