import { pool, transaction } from '../config/db.js';
import { HttpError } from '../lib/http.js';
async function read(db, customer) {
  const { rows } = await db.query(`SELECT d.id_producto,d.cantidad FROM carrito c
    JOIN detalle_carrito d USING(id_carrito) JOIN producto p USING(id_producto)
    WHERE c.id_cliente=$1 AND c.estado='activo' AND p.activo ORDER BY d.id_producto`, [customer]);
  return rows;
}
export function get(customer) {
  return read(pool, customer);
}
export async function lockCustomer(db, customer) {
  const result = await db.query('SELECT id_cliente FROM cliente WHERE id_cliente=$1 AND activo FOR UPDATE', [customer]);
  if (!result.rowCount) throw new HttpError(403, 'El perfil de cliente no está activo.');
}
export async function checkSnapshot(db, customer, expected) {
  const current = await read(db, customer);
  if (current.length !== expected.length || current.some((item, index) =>
    item.id_producto !== expected[index].id_producto || item.cantidad !== expected[index].cantidad)) {
    throw new HttpError(409, 'El carrito cambió. Revisa la selección actual e inténtalo de nuevo.');
  }
}
export async function replace(customer, items, expected) {
  return transaction(async db => {
    await lockCustomer(db, customer);
    if (expected) await checkSnapshot(db, customer, expected);
    const {rows:[cart]}=await db.query("INSERT INTO carrito(id_cliente) VALUES($1) ON CONFLICT(id_cliente) WHERE estado='activo' AND id_cliente IS NOT NULL DO UPDATE SET id_cliente=EXCLUDED.id_cliente RETURNING id_carrito",[customer]);
    await db.query('DELETE FROM detalle_carrito WHERE id_carrito=$1',[cart.id_carrito]);
    for (const item of items) {
      const {rowCount}=await db.query('SELECT id_producto FROM producto WHERE id_producto=$1 AND activo',[item.id_producto]);
      if (!rowCount) throw new HttpError(422,'Producto inexistente o inactivo.');
      await db.query('INSERT INTO detalle_carrito(id_carrito,id_producto,cantidad) VALUES($1,$2,$3)',[cart.id_carrito,item.id_producto,item.cantidad]);
    }
    return items;
  });
}
