import { createHash, randomBytes } from 'node:crypto';
import { pool, transaction } from '../config/db.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { HttpError } from '../lib/http.js';
const digest = token => createHash('sha256').update(token).digest('hex');
export async function register(input) {
  const hash = await hashPassword(input.password);
  return transaction(async db => {
    const { rows: [user] } = await db.query('INSERT INTO usuario(nombre_usuario,nombre,correo,telefono,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING id_usuario,nombre_usuario,nombre,correo', [input.nombre_usuario,input.nombre,input.correo,input.telefono || null,hash]);
    await db.query("INSERT INTO usuario_rol(id_usuario,codigo_rol) VALUES($1,'cliente')", [user.id_usuario]);
    const { rows: [customer] } = await db.query('INSERT INTO cliente(id_usuario) VALUES($1) RETURNING id_cliente', [user.id_usuario]);
    await db.query("INSERT INTO verificacion_edad(id_cliente,declaracion_mayoria,metodo) VALUES($1,true,'declaracion_registro')", [customer.id_cliente]);
    await db.query('INSERT INTO preferencia(id_usuario) VALUES($1)', [user.id_usuario]);
    await db.query("INSERT INTO consentimiento(id_usuario,tipo,version,aceptado) VALUES($1,'terminos','1',true)", [user.id_usuario]);
    return user;
  });
}
export async function login(identifier, password) {
  const { rows: [user] } = await pool.query('SELECT * FROM usuario WHERE lower(correo)=lower($1) OR lower(nombre_usuario)=lower($1)', [identifier]);
  if (!user || !user.activo || !await verifyPassword(password, user.password_hash)) throw new HttpError(401, 'Credenciales incorrectas.');
  const token = randomBytes(32).toString('hex');
  await transaction(async db => {
    const updated = await db.query('UPDATE usuario SET ultimo_acceso=now() WHERE id_usuario=$1 AND activo AND password_hash=$2',
      [user.id_usuario, user.password_hash]);
    if (!updated.rowCount) throw new HttpError(401, 'Credenciales incorrectas.');
    await db.query("INSERT INTO sesion(id_usuario,expiracion,token_hash) VALUES($1,now()+($2::int * interval '1 hour'),$3)", [user.id_usuario,Number(process.env.SESSION_HOURS || 24),digest(token)]);
  });
  return { token, user: await authenticate(token) };
}
export async function authenticate(token) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) throw new HttpError(401, 'Inicia sesión para continuar.');
  const { rows: [user] } = await pool.query(`SELECT u.id_usuario,u.nombre_usuario,u.nombre,u.correo,c.id_cliente,
    ARRAY(SELECT ur.codigo_rol FROM usuario_rol ur WHERE ur.id_usuario=u.id_usuario
      AND (ur.codigo_rol NOT IN ('cliente','empleado','administrador')
        OR (ur.codigo_rol='cliente' AND c.activo)
        OR (ur.codigo_rol='empleado' AND EXISTS(SELECT 1 FROM empleado e WHERE e.id_usuario=u.id_usuario AND e.activo))
        OR (ur.codigo_rol='administrador' AND EXISTS(SELECT 1 FROM administrador a WHERE a.id_usuario=u.id_usuario AND a.activo)))) AS roles
    FROM sesion s JOIN usuario u USING(id_usuario) LEFT JOIN cliente c USING(id_usuario)
    WHERE s.token_hash=$1 AND s.revocada_en IS NULL AND s.expiracion>now() AND u.activo`, [digest(token)]);
  if (!user) throw new HttpError(401, 'La sesión expiró. Inicia sesión nuevamente.');
  return user;
}
export async function logout(token) { await pool.query('UPDATE sesion SET revocada_en=now() WHERE token_hash=$1', [digest(token)]); }

export async function changePassword(userId, token, current, replacement) {
  const { rows: [user] } = await pool.query('SELECT password_hash FROM usuario WHERE id_usuario=$1', [userId]);
  if (!user || !await verifyPassword(current, user.password_hash)) throw new HttpError(422, 'La contraseña actual es incorrecta.');
  if (current === replacement) throw new HttpError(422, 'Elige una contraseña distinta de la actual.');
  const nextHash = await hashPassword(replacement);
  await transaction(async db => {
    const changed = await db.query('UPDATE usuario SET password_hash=$1 WHERE id_usuario=$2 AND password_hash=$3 AND activo',
      [nextHash, userId, user.password_hash]);
    if (!changed.rowCount) throw new HttpError(409, 'La contraseña cambió durante la solicitud.');
    await db.query(`UPDATE sesion SET revocada_en=now()
      WHERE id_usuario=$1 AND token_hash<>$2 AND revocada_en IS NULL`, [userId, digest(token)]);
  });
}
