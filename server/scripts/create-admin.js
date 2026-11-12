import { pool, transaction } from '../config/db.js';
import { hashPassword } from '../lib/password.js';

try {
  const [username, email, ...name] = process.argv.slice(2);
  if (!username || !email || !name.length) throw new Error('Uso: npm run admin:create -- usuario correo Nombre completo');
  if (process.stdin.isTTY) throw new Error('Envía la contraseña por entrada estándar sin mostrarla en pantalla.');
  process.stdin.setEncoding('utf8');
  let password = '';
  for await (const chunk of process.stdin) password += chunk;
  const hash = await hashPassword(password.replace(/\r?\n$/, ''));
  await transaction(async db => {
    const { rows: [user] } = await db.query(
      'INSERT INTO usuario(nombre_usuario,nombre,correo,password_hash) VALUES($1,$2,$3,$4) RETURNING id_usuario',
      [username, name.join(' '), email.toLowerCase(), hash],
    );
    await db.query("INSERT INTO usuario_rol(id_usuario,codigo_rol) VALUES($1,'administrador')", [user.id_usuario]);
    await db.query('INSERT INTO administrador(id_usuario) VALUES($1)', [user.id_usuario]);
  });
  console.log('Administrador creado.');
} catch (error) {
  console.error(error.code || '', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
