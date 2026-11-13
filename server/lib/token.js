import { randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { HttpError } from './http.js';

const configured = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && (!configured || configured.length < 32)) {
  throw new Error('JWT_SECRET debe contener al menos 32 caracteres en producción.');
}
const secret = new TextEncoder().encode(configured || randomBytes(32).toString('hex'));
const issuer = 'michoks';
const audience = 'michoks-web';

export async function createToken(userId, hours) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(userId))
    .setIssuer(issuer)
    .setAudience(audience)
    .setJti(randomBytes(24).toString('hex'))
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(secret);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'], issuer, audience });
    if (typeof payload.sub !== 'string' || !/^[1-9]\d*$/.test(payload.sub)) throw new Error('sub');
    return payload.sub;
  } catch {
    throw new HttpError(401, 'La sesión expiró. Inicia sesión nuevamente.');
  }
}
