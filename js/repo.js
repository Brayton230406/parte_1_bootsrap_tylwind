import { request } from './services/api.js';

export async function loadProducts({offset = 0, q, category, occasion, budget, sort} = {}) {
  const params = new URLSearchParams({limit:'10',offset:String(offset)});
  for (const [key, value] of Object.entries({q,category,occasion,budget,sort})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  return request('/productos?' + params);
}
export async function loadProduct(id) {
  return (await request('/productos/' + encodeURIComponent(id))).data;
}
export async function loadCategories() {
  return (await request('/productos/categorias')).data;
}
