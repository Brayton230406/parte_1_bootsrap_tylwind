export const getToken = () => sessionStorage.getItem('michoks.session');
export function setToken(token) {
  if (token) sessionStorage.setItem('michoks.session', token);
  else sessionStorage.removeItem('michoks.session');
}
export async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const response = await fetch('/api/v1' + path, {
    method,
    cache:'no-store',
    signal:AbortSignal.timeout(15000),
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return {};
  const result = await response.json().catch(()=>({error:{message:'Respuesta inválida del servidor.'}}));
  if (!response.ok || result.status !== 'success') {
    if (response.status === 401 && token) setToken(null);
    throw Object.assign(new Error(result.error?.message || 'Error al consultar la tienda.'), { status: response.status });
  }
  return result;
}
