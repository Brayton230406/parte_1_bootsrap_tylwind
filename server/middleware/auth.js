import { authenticate } from '../models/auth.model.js';
import { HttpError } from '../lib/http.js';
export async function requireAuth(req, res, next) {
  req.token = req.get('authorization')?.replace(/^Bearer /, '');
  req.user = await authenticate(req.token); next();
}
export function requireRole(...roles) {
  return (req,res,next) => { if (!roles.some(role => req.user.roles.includes(role))) throw new HttpError(403, 'No tienes permisos para esta operación.'); next(); };
}
