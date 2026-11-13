import { pool, transaction } from '../config/db.js';

try {
  if (process.env.ALLOW_LOAD_TEST_DATA !== 'true') {
    throw new Error('Configura una base de pruebas y ALLOW_LOAD_TEST_DATA=true para generar datos ficticios.');
  }
  const { rows: [result] } = await transaction(async db => {
    const { rows: [source] } = await db.query('SELECT id_marca,id_presentacion,precio_base FROM producto ORDER BY id_producto LIMIT 1');
    if (!source) throw new Error('Importa primero el catálogo en la base de pruebas.');
    const result = await db.query(`INSERT INTO producto(id_marca,id_presentacion,sku,nombre,descripcion,precio_base)
      SELECT $1,$2,'PRUEBA-CARGA-'||n,'Producto de prueba '||n,
             'Producto ficticio para medición de rendimiento', $3
      FROM generate_series(1,10000) AS n
      ON CONFLICT(sku) DO NOTHING`, [source.id_marca, source.id_presentacion, source.precio_base]);
    return { rows: [{ count: result.rowCount }] };
  });
  console.log(`Productos ficticios agregados: ${result.count}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
