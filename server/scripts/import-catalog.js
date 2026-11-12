import { readFile } from 'node:fs/promises';
import { pool, transaction } from '../config/db.js';
import { occasionCategories } from '../models/catalog-occasions.js';

const catalogFile = new URL('../../data/productos.json', import.meta.url);

try {
  const products = JSON.parse(await readFile(catalogFile, 'utf8'));
  const sourceIds = new Set();
  const entries = products.map(product => {
    const presentation = /^(?:(\d+) × )?(\d+(?:\.\d+)?) (ml|L)$/.exec(product.size);
    if (!presentation || !Number.isSafeInteger(product.id) || product.id <= 0 ||
        sourceIds.has(product.id) || !Number.isFinite(product.price) || product.price < 0) {
      throw new Error(`Producto inválido en el catálogo de origen: ${product.id}`);
    }
    sourceIds.add(product.id);
    const [, pack = '1', amount, unit] = presentation;
    return { ...product, pack, amount, unit, sku: `MICHOKS-LEGADO-${product.id}` };
  });
  if (!entries.length) throw new Error('El catálogo de origen está vacío.');

  const imported = await transaction(async db => {
    // Conserva los identificadores usados por los carritos del catálogo anterior.
    await db.query('LOCK TABLE michoks.producto IN SHARE ROW EXCLUSIVE MODE');
    const { rows: existing } = await db.query('SELECT id_producto::text, sku FROM producto');
    const skuById = new Map(entries.map(entry => [String(entry.id), entry.sku]));
    if (existing.some(row => skuById.get(row.id_producto) !== row.sku)) {
      throw new Error('La base tiene productos de otro origen. Se requiere una correspondencia explícita de SKU para importarlos.');
    }
    const importedIds = new Set(existing.map(row => row.id_producto));

    await db.query("INSERT INTO marca(nombre) VALUES ('Sin especificar') ON CONFLICT DO NOTHING");
    const { rows: [brand] } = await db.query("SELECT id_marca FROM marca WHERE nombre='Sin especificar'");
    await db.query("INSERT INTO unidad_medida(nombre,simbolo) VALUES ('Mililitro','ml'),('Litro','L') ON CONFLICT DO NOTHING");
    const { rows: units } = await db.query("SELECT id_unidad_medida, simbolo FROM unidad_medida WHERE simbolo IN ('ml','L')");
    const unitIds = new Map(units.map(row => [row.simbolo, row.id_unidad_medida]));
    const categoryIds = new Map();
    const presentationIds = new Map();
    let added = 0;

    const tags = Object.values(occasionCategories);
    await db.query('INSERT INTO categoria(nombre) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING', [tags]);
    const { rows: occasionRows } = await db.query('SELECT nombre,id_categoria FROM categoria WHERE nombre=ANY($1::text[])', [tags]);
    const occasionIds = new Map(occasionRows.map(row => [row.nombre,row.id_categoria]));

    for (const entry of entries) {
      if (importedIds.has(String(entry.id))) continue;
      if (!categoryIds.has(entry.category)) {
        await db.query('INSERT INTO categoria(nombre) VALUES ($1) ON CONFLICT DO NOTHING', [entry.category]);
        const { rows: [category] } = await db.query('SELECT id_categoria FROM categoria WHERE nombre=$1', [entry.category]);
        categoryIds.set(entry.category, category.id_categoria);
      }
      if (!presentationIds.has(entry.size)) {
        const definition = [entry.size, unitIds.get(entry.unit), entry.amount, entry.pack];
        await db.query(`INSERT INTO presentacion(nombre,id_unidad_medida,cantidad,unidades_pack)
          VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`, definition);
        const { rows: [presentation] } = await db.query(`SELECT id_presentacion FROM presentacion
          WHERE nombre=$1 AND id_unidad_medida=$2 AND cantidad=$3 AND unidades_pack=$4`, definition);
        presentationIds.set(entry.size, presentation.id_presentacion);
      }
      await db.query(`INSERT INTO producto(id_producto,id_marca,id_presentacion,sku,nombre,descripcion,precio_base)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
        entry.id, brand.id_marca, presentationIds.get(entry.size), entry.sku, entry.name, entry.description, entry.price,
      ]);
      await db.query('INSERT INTO producto_categoria(id_producto,id_categoria) VALUES ($1,$2)', [entry.id, categoryIds.get(entry.category)]);
      if (entry.image) {
        await db.query('INSERT INTO imagen_producto(id_producto,ruta,texto_alternativo) VALUES ($1,$2,$3)', [entry.id, entry.image, entry.name]);
      }
      added++;
    }

    const links = entries.flatMap(entry => (entry.occasions || []).map(occasion => {
      if (!Object.hasOwn(occasionCategories, occasion)) throw new Error(`Ocasión desconocida: ${occasion}`);
      return [entry.id, occasionIds.get(occasionCategories[occasion])];
    }));
    const linked = await db.query(`INSERT INTO producto_categoria(id_producto,id_categoria)
      SELECT * FROM unnest($1::bigint[],$2::bigint[]) ON CONFLICT DO NOTHING`,
    [links.map(link => link[0]), links.map(link => link[1])]);

    if (added) {
      await db.query(`SELECT setval(sequence_name, GREATEST(pg_sequence_last_value(sequence_name),
        (SELECT max(id_producto) FROM michoks.producto)))
        FROM (SELECT pg_get_serial_sequence('michoks.producto','id_producto')::regclass AS sequence_name) sequence`);
    }
    return { added, linked: linked.rowCount };
  });

  console.log(`Productos importados: ${imported.added} de ${entries.length}. Relaciones de ocasión añadidas: ${imported.linked}.`);
} catch (error) {
  console.error(error.code || '', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
