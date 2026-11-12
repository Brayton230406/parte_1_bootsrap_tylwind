import pg from 'pg';
export const pool = new pg.Pool({
  ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {}),
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : false,
  max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
  options: '-c search_path=michoks,public',
});
pool.on('error', error => console.error('PostgreSQL:', error.code || error.message));
export async function transaction(work) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
