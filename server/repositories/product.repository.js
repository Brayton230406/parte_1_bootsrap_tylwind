import { pool } from '../config/db.js';
import { occasionCategories } from '../models/catalog-occasions.js';
const occasionNames = Object.values(occasionCategories);
const select = `SELECT p.id_producto::text AS id,p.nombre AS name,p.precio_base::float8 AS price,
 COALESCE((SELECT c.nombre FROM producto_categoria pc JOIN categoria c USING(id_categoria) WHERE pc.id_producto=p.id_producto AND c.nombre <> ALL($2::text[]) ORDER BY c.id_categoria LIMIT 1),'Otros') AS category,
 pr.nombre AS size,COALESCE(p.descripcion,'Sin descripción') AS description,
 COALESCE((SELECT i.ruta FROM imagen_producto i WHERE i.id_producto=p.id_producto ORDER BY i.orden LIMIT 1),'assets/michoks-logo.svg') AS image,
 ARRAY(SELECT split_part(c.nombre, ': ', 2) FROM producto_categoria pc JOIN categoria c USING(id_categoria)
   WHERE pc.id_producto=p.id_producto AND c.nombre = ANY($2::text[]) ORDER BY c.id_categoria) AS occasions,
 COALESCE((SELECT sum(GREATEST(0,e.cantidad-COALESCE((SELECT sum(r.cantidad) FROM reserva_inventario r WHERE r.id_existencia=e.id_existencia AND r.activa AND (r.vence_en IS NULL OR r.vence_en>now())),0))) FROM existencia e JOIN producto_almacen pa USING(id_producto_almacen) LEFT JOIN lote l USING(id_lote) WHERE pa.id_producto=p.id_producto AND (l.fecha_caducidad IS NULL OR l.fecha_caducidad>=CURRENT_DATE)),0)::float8 AS stock
 FROM producto p JOIN presentacion pr USING(id_presentacion)`;
export async function list({limit,offset,q}) {
  const where = ' WHERE p.activo AND ($1::text IS NULL OR p.nombre ILIKE $1 OR p.sku ILIKE $1)';
  const params = [q ? `%${q}%` : null];
  const { rows } = await pool.query(select+where+' ORDER BY p.id_producto LIMIT $3 OFFSET $4',[...params,occasionNames,limit,offset]);
  const { rows:[{total}] } = await pool.query('SELECT count(*)::int AS total FROM producto p'+where,params);
  return { rows, total };
}
export async function get(id) { return (await pool.query(select+' WHERE p.id_producto=$1 AND p.activo',[id,occasionNames])).rows[0]; }
