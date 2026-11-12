import * as orders from '../models/order.model.js';
import * as cart from '../models/cart.model.js';
import { ok, items, id, text, HttpError } from '../lib/http.js';
export async function create(req,res) {
  const b=req.body;
  if (!['retiro','delivery','coordinar'].includes(b.modalidad_entrega)) throw new HttpError(422,'Modalidad de entrega inválida.');
  const input={items:items(b.items),desde_carrito:b.desde_carrito === true,modalidad_entrega:b.modalidad_entrega,observacion:b.observacion ? text(b.observacion,'Observación',1000) : null};
  if (b.modalidad_entrega==='delivery') { input.direccion=text(b.direccion,'Dirección',300); input.ciudad=text(b.ciudad,'Ciudad',100); }
  ok(res,await orders.create(req.user.id_cliente,input),201);
}
export async function list(req,res) { ok(res,await orders.list(req.user.id_cliente)); }
export async function detail(req,res) { ok(res,await orders.detail(req.user.id_cliente,id(req.params.id))); }
export async function cancel(req,res) { ok(res,await orders.cancel(req.user.id_cliente,id(req.params.id))); }
export async function getCart(req,res) { ok(res,await cart.get(req.user.id_cliente)); }
function cartItems(value) {
  return Array.isArray(value) && !value.length ? [] : items(value);
}
export async function putCart(req,res) {
  const { items: selection, previos } = req.body || {};
  ok(res, await cart.replace(req.user.id_cliente, cartItems(selection),
    previos === undefined ? undefined : cartItems(previos)));
}
