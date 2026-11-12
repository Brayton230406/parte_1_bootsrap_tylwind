import { request } from './services/api.js';

export async function loadProducts() {
  const products = [];
  let total;
  do {
    const { data, meta } = await request(`/productos?limit=500&offset=${products.length}`);
    products.push(...data);
    total = data.length ? meta.total : products.length;
  } while (products.length < total);
  if (products.some(product => typeof product.id !== 'string' || !/^[1-9]\d{0,18}$/.test(product.id))) {
    throw new Error('El catálogo devolvió un identificador inválido.');
  }
  return products;
}
