export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function ok(res, data, status = 200, meta) { return res.status(status).json({ status: 'success', data, ...(meta ? { meta } : {}) }); }
export function text(value, name, max = 180) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new HttpError(422, `${name}: texto obligatorio de hasta ${max} caracteres.`);
  return value.trim();
}
export function id(value) {
  if (!/^[1-9]\d{0,18}$/.test(String(value))) throw new HttpError(422, 'Identificador inválido.');
  return String(value);
}
export function items(value) {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new HttpError(422, 'Selecciona entre 1 y 100 productos.');
  const seen = new Set();
  return value.map(row => {
    const product = id(row?.id_producto);
    if (seen.has(product) || !Number.isInteger(row.cantidad) || row.cantidad < 1 || row.cantidad > 99) throw new HttpError(422, 'Productos repetidos o cantidades inválidas (1–99).');
    seen.add(product); return { id_producto: product, cantidad: row.cantidad };
  }).sort((a,b) => BigInt(a.id_producto) < BigInt(b.id_producto) ? -1 : 1);
}
