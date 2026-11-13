import { pool } from '../config/db.js';
import { occasionCategories } from '../models/catalog-occasions.js';
const occasionNames = Object.values(occasionCategories);
const category = `COALESCE((SELECT c.nombre FROM producto_categoria pc JOIN categoria c USING(id_categoria)
 WHERE pc.id_producto=p.id_producto AND c.nombre <> ALL($2::text[]) ORDER BY c.id_categoria LIMIT 1),'Otros')`;
const select = `SELECT p.id_producto::text AS id,p.nombre AS name,p.precio_base::float8 AS price,
 ${category} AS category,pr.nombre AS size,COALESCE(p.descripcion,'Sin descripción') AS description,
 COALESCE((SELECT i.ruta FROM imagen_producto i WHERE i.id_producto=p.id_producto ORDER BY i.orden LIMIT 1),'assets/michoks-logo.svg') AS image,
 ARRAY(SELECT split_part(c.nombre, ': ', 2) FROM producto_categoria pc JOIN categoria c USING(id_categoria)
 WHERE pc.id_producto=p.id_producto AND c.nombre = ANY($2::text[]) ORDER BY c.id_categoria) AS occasions,
 COALESCE((SELECT sum(GREATEST(0,e.cantidad-COALESCE((SELECT sum(r.cantidad) FROM reserva_inventario r
 WHERE r.id_existencia=e.id_existencia AND r.activa AND (r.vence_en IS NULL OR r.vence_en>now())),0)))
 FROM existencia e JOIN producto_almacen pa USING(id_producto_almacen) LEFT JOIN lote l USING(id_lote)
 WHERE pa.id_producto=p.id_producto AND (l.fecha_caducidad IS NULL OR l.fecha_caducidad>=CURRENT_DATE)),0)::float8 AS stock
 FROM producto p JOIN presentacion pr USING(id_presentacion)`;
export async function list({limit,offset,q,category:filterCategory,occasion,budget,sort}) {
  const where = ` WHERE p.activo
    AND ($1::text IS NULL OR translate(lower(p.nombre || ' ' || p.sku || ' ' || ${category}), 'áéíóúüñ', 'aeiouun') LIKE $1 ESCAPE '\\')
    AND ($3::text IS NULL OR ${category}=$3)
    AND ($4::text IS NULL OR EXISTS(SELECT 1 FROM producto_categoria pc JOIN categoria c USING(id_categoria) WHERE pc.id_producto=p.id_producto AND c.nombre=$4))
    AND ($5::numeric IS NULL OR p.precio_base <= $5)`;
  const escaped = q?.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\\%_]/g,'\\$&');
  const params=[escaped ? `%${escaped}%` : null, occasionNames, filterCategory || null,
    occasion ? occasionCategories[occasion] : null, budget ?? null];
  const orders={'featured':'p.id_producto','price-asc':'p.precio_base ASC,p.id_producto','price-desc':'p.precio_base DESC,p.id_producto','name':'p.nombre ASC,p.id_producto'};
  const {rows}=await pool.query(select+where+' ORDER BY '+orders[sort || 'featured']+' LIMIT $6 OFFSET $7',[...params,limit,offset]);
  const {rows:[{total}]}=await pool.query('SELECT count(*)::int AS total FROM producto p'+where,params);
  return {rows,total};
}
export async function categories(){
 const {rows}=await pool.query(`SELECT c.nombre AS name,count(DISTINCT p.id_producto)::int AS count
 FROM categoria c JOIN producto_categoria pc USING(id_categoria) JOIN producto p USING(id_producto)
 WHERE p.activo AND c.nombre <> ALL($1::text[]) GROUP BY c.id_categoria,c.nombre ORDER BY c.nombre`,[occasionNames]);
 return rows;
}
export async function get(id) { return (await pool.query(select+' WHERE p.id_producto=$1 AND p.activo',[id,occasionNames])).rows[0]; }
