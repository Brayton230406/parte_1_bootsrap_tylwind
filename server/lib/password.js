import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError } from './http.js';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) throw new HttpError(422, 'La contraseña debe tener entre 10 y 128 caracteres.');
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${Buffer.from(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function verifyPassword(password, hash) {
  if (typeof password !== 'string' || password.length > 128) return false;
  const [algorithm, salt, digest] = hash.split('$');
  if (algorithm !== 'scrypt' || !/^[0-9a-f]{32}$/.test(salt) || !/^[0-9a-f]{128}$/.test(digest)) return false;
  return timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(await scrypt(password, salt, 64)));
}
