import * as model from '../models/auth.model.js';
import { ok, text, HttpError } from '../lib/http.js';
export async function register(req,res) {
  const b = req.body;
  if (b.mayor_edad !== true || b.acepta_terminos !== true) throw new HttpError(422, 'Debes ser mayor de edad y aceptar los términos.');
  const nombre_usuario = text(b.nombre_usuario,'Usuario',60);
  const correo = text(b.correo,'Correo',254).toLowerCase();
  if (!/^[A-Za-z0-9_.-]{3,60}$/.test(nombre_usuario) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new HttpError(422, 'Usuario o correo inválido.');
  ok(res, await model.register({ nombre_usuario,correo,nombre:text(b.nombre,'Nombre',160),telefono:b.telefono ? text(b.telefono,'Teléfono',30) : null,password:b.password }),201);
}
export async function login(req,res) { ok(res,await model.login(text(req.body.identifier,'Usuario o correo',254),req.body.password)); }
export async function logout(req,res) { await model.logout(req.token); res.sendStatus(204); }
export function me(req,res) { ok(res,req.user); }

export async function changePassword(req,res) {
  const { actual, nueva } = req.body || {};
  await model.changePassword(req.user.id_usuario, req.token, actual, nueva);
  res.sendStatus(204);
}
