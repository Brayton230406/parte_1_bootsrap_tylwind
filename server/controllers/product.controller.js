import * as model from '../models/product.model.js';
import { ok, id, HttpError } from '../lib/http.js';
export async function list(req,res) {
  const limit = Number(req.query.limit || 10), offset = Number(req.query.offset || 0);
  if (!Number.isInteger(limit) || limit<1 || limit>500 || !Number.isInteger(offset) || offset<0 || (req.query.q && typeof req.query.q!=='string')) throw new HttpError(422,'Paginación o búsqueda inválida.');
  const {rows,total} = await model.list({limit,offset,q:req.query.q}); ok(res,rows,200,{total,limit,offset});
}
export async function get(req,res) { const row = await model.get(id(req.params.id)); if (!row) throw new HttpError(404,'Producto no encontrado.'); ok(res,row); }
