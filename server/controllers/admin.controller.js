import * as model from '../models/admin.model.js';
import { ok, HttpError } from '../lib/http.js';
export function schema(req,res) { ok(res,model.metadata()); }
export function tableSchema(req,res) {
  const table = model.metadata().find(item => item.name === req.params.table);
  if (!table) throw new HttpError(404,'Tabla desconocida.');
  ok(res,table);
}
export async function list(req,res) {
  const limit=Number(req.query.limit || 10), offset=Number(req.query.offset || 0);
  if (!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0) throw new HttpError(422,'Paginación inválida.');
  const {rows,total}=await model.list(req.params.table,limit,offset); ok(res,rows,200,{total,limit,offset});
}
export async function get(req,res) { ok(res,await model.get(req.params.table,req.query)); }
export async function create(req,res) { ok(res,await model.write(req.params.table,'create',null,req.body),201); }
export async function update(req,res) { ok(res,await model.write(req.params.table,'update',req.body.key,req.body.data)); }
export async function remove(req,res) { await model.write(req.params.table,'delete',req.body.key,{}); res.sendStatus(204); }

export async function replace(req,res) { ok(res,await model.write(req.params.table,'replace',req.body.key,req.body.data)); }
