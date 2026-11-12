import schema from '../config/schema.json' with { type: 'json' };
import { pool } from '../config/db.js';

try {
  const { rows } = await pool.query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='michoks'",
  );
  const available = new Set(rows.map(row => `${row.table_name}.${row.column_name}`));
  const missing = Object.entries(schema).flatMap(([table, definition]) =>
    definition.columns.map(column => `${table}.${column.name}`).filter(column => !available.has(column)),
  );
  if (missing.length) throw new Error(`Columnas ausentes o inaccesibles: ${missing.join(', ')}`);
  console.log(`PostgreSQL conectado. Columnas verificadas en ${Object.keys(schema).length} tablas.`);
} catch (error) {
  console.error(error.code || '', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
