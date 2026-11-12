import { pool, transaction } from '../config/db.js';
import { movementUpdatesStock } from '../models/inventory.model.js';

try {
  const result = await transaction(async db => {
    await db.query('SELECT pg_advisory_xact_lock(682027)');
    const { rows: [warehouse] } = await db.query(`INSERT INTO almacen(nombre,direccion)
      VALUES ('MICHOKS · Demostración','Ubicación de demostración académica')
      ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_almacen`);
    const { rows: [location] } = await db.query(`INSERT INTO ubicacion(id_almacen,codigo,descripcion)
      VALUES ($1,'DEMO-01','Inventario ficticio para probar compras y roles')
      ON CONFLICT(id_almacen,codigo) DO UPDATE SET codigo=EXCLUDED.codigo RETURNING id_ubicacion`, [warehouse.id_almacen]);
    const { rows: [type] } = await db.query(`INSERT INTO tipo_movimiento(nombre,signo)
      VALUES ('Carga inicial de demostración',1)
      ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_tipo_movimiento,signo`);
    if (type.signo !== 1) throw new Error('El movimiento de demostración debe ser de entrada.');
    const { rows: products } = await db.query('SELECT id_producto FROM producto WHERE activo ORDER BY id_producto FOR UPDATE');
    const automatic = await movementUpdatesStock(db);
    let added = 0;
    for (const product of products) {
      const { rows: [placement] } = await db.query(`INSERT INTO producto_almacen(id_producto,id_almacen)
        VALUES ($1,$2) ON CONFLICT(id_producto,id_almacen) DO UPDATE SET id_producto=EXCLUDED.id_producto
        RETURNING id_producto_almacen`, [product.id_producto, warehouse.id_almacen]);
      const { rows: [stock] } = await db.query(`INSERT INTO existencia(id_producto_almacen,id_ubicacion,cantidad)
        VALUES ($1,$2,0) ON CONFLICT(id_producto_almacen,id_ubicacion) WHERE id_lote IS NULL
        DO NOTHING RETURNING id_existencia`, [placement.id_producto_almacen, location.id_ubicacion]);
      if (!stock) continue;
      await db.query(`INSERT INTO movimiento_inventario(id_existencia,id_tipo_movimiento,cantidad,referencia)
        VALUES ($1,$2,10,'DEMO: 10 unidades iniciales autorizadas para pruebas académicas')`, [stock.id_existencia,type.id_tipo_movimiento]);
      if (!automatic) await db.query('UPDATE existencia SET cantidad=cantidad+10 WHERE id_existencia=$1',[stock.id_existencia]);
      added++;
    }
    return { productos_cargados: added, unidades_por_producto: 10, ubicacion: 'DEMO-01' };
  });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error.code || '', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
