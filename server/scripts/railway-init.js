import { spawn } from 'node:child_process';
import { pool } from '../config/db.js';

async function run(script, args = [], input = '') {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: ['pipe', 'inherit', 'inherit'] });
    child.stdin.end(input);
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`Falló ${script} (${code}).`)));
  });
}
try {
  await run('server/scripts/init-db.js');
  const { rows: [summary] } = await pool.query(`SELECT
    (SELECT count(*)::int FROM michoks.producto) AS products,
    EXISTS (SELECT 1 FROM michoks.almacen WHERE nombre='MICHOKS · Demostración') AS demo,
    EXISTS (SELECT 1 FROM michoks.administrador a JOIN michoks.usuario u USING(id_usuario)
      WHERE a.activo AND u.activo) AS admin`);
  if (!summary.products) await run('server/scripts/import-catalog.js');
  if (!summary.demo && process.env.INITIAL_DEMO_INVENTORY === 'true') {
    await run('server/scripts/seed-demo-inventory.js');
  }
  if (!summary.admin && process.env.INITIAL_ADMIN_PASSWORD) {
    await run('server/scripts/create-admin.js', [
      'admin_michoks', 'admin@michoks.local', 'Administración', 'MICHOKS',
    ], process.env.INITIAL_ADMIN_PASSWORD + '\n');
  }
  console.log('Preparación de la base completada.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
