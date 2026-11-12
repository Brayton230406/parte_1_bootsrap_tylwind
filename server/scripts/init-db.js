import { readFile } from 'node:fs/promises';
import { pool, transaction } from '../config/db.js';

try {
  await transaction(async db => {
    await db.query('SELECT pg_advisory_xact_lock(682026)');
    const { rows: [{ present }] } = await db.query("SELECT to_regnamespace('michoks') IS NOT NULL AS present");
    if (!present) await db.query(await readFile(new URL('../../database/michoks-68.sql', import.meta.url), 'utf8'));
    await db.query(`INSERT INTO michoks.estado_pedido(nombre, es_anulado)
      VALUES ('Pendiente', false), ('Anulado', true) ON CONFLICT (nombre) DO NOTHING`);
  });
  console.log('Esquema disponible y estados iniciales preparados.');
} catch (error) {
  console.error(error.code || '', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
