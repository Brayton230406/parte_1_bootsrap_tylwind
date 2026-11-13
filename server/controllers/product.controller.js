import * as model from '../models/product.model.js';
import { ok, id, HttpError } from '../lib/http.js';
export async function list(req,res) {
  const limit = Number(req.query.limit || 10), offset = Number(req.query.offset || 0);
  const { q, category, occasion, budget, sort } = req.query;
  if (!Number.isInteger(limit) || limit<1 || limit>500 || !Number.isSafeInteger(offset) || offset<0 ||
      [q,category,occasion,sort,budget].some(value=>value !== undefined && typeof value !== 'string') ||
      (q && q.length>180) || (category && category.length>80) ||
      (occasion && !['regalo','cena','cocteles','compartir'].includes(occasion)) ||
      (sort && !['featured','price-asc','price-desc','name'].includes(sort)) ||
      (budget !== undefined && (!/^\d+(?:\.\d{1,2})?$/.test(budget) || Number(budget)>1000000))) {
    throw new HttpError(422,'Paginación o búsqueda inválida.');
  }
  const {rows,total} = await model.list({limit,offset,q,category,occasion,budget,sort});
  ok(res,rows,200,{total,limit,offset});
}
export async function categories(req,res) { ok(res,await model.categories()); }
export async function get(req,res) { const row = await model.get(id(req.params.id)); if (!row) throw new HttpError(404,'Producto no encontrado.'); ok(res,row); }
