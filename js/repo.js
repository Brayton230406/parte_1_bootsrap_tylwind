// Única fuente del catálogo: data/productos.json.
export async function loadProducts() {
  const response = await fetch(new URL('../data/productos.json', import.meta.url));
  if (!response.ok) throw new Error(`No se pudo cargar el catálogo (${response.status}).`);
  const products = await response.json();
  const ids = new Set();
  if (!Array.isArray(products) || !products.length) throw new Error('Catálogo vacío o inválido.');
  for (const product of products) {
    if (!Number.isSafeInteger(product.id) || product.id < 1 || ids.has(product.id) || !Number.isFinite(product.price) || product.price < 0) throw new Error('Producto inválido.');
    ids.add(product.id);
    if (!Array.isArray(product.occasions) || !product.occasions.length || product.occasions.some(tag => !['regalo', 'cena', 'cocteles', 'compartir'].includes(tag))) throw new Error('Ocasiones inválidas.');
    for (const field of ['name', 'category', 'size', 'description', 'image']) {
      if (typeof product[field] !== 'string' || !product[field].trim()) throw new Error('Producto incompleto.');
    }
    if (!/^assets\/products\/[a-z0-9-]+\.(png|jpg|jpeg|webp|svg)$/i.test(product.image)) throw new Error('Imagen inválida.');
  }
  return products;
}
