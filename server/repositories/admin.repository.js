import schema from '../config/schema.json' with {type:'json'};
import { pool, transaction } from '../config/db.js';
import { HttpError } from '../lib/http.js';
// Nombres SQL siempre tomados de la lista cerrada del esquema adjunto.
const quote = value => '"'+value+'"';
const hidden = new Set(['password_hash','token_hash','token_invitado']);
const readonly = new Set(['sesion']);
export function metadata() {
  return Object.entries(schema).map(([name,t])=>({name,...t,columns:t.columns.filter(c=>!hidden.has(c.name)),readonly:readonly.has(name)}));
}
function table(name) { const t=schema[name]; if (!Object.hasOwn(schema,name)) throw new HttpError(404,'Tabla desconocida.'); return t; }
function columns(t) { return t.columns.filter(c=>!hidden.has(c.name)).map(c=>quote(c.name)).join(','); }
export async function list(name,limit,offset) {
  const t=table(name);
  const {rows}=await pool.query(`SELECT ${columns(t)} FROM ${quote(name)} ORDER BY ${t.primaryKey.map(quote).join(',')} LIMIT $1 OFFSET $2`,[limit,offset]);
  const {rows:[{total}]}=await pool.query(`SELECT count(*)::int AS total FROM ${quote(name)}`);
  return {rows,total};
}
export async function write(name,operation,key,input) {
  const t=table(name);
  if (readonly.has(name)) throw new HttpError(403,'Las sesiones se gestionan mediante autenticación.');
  if (name==='usuario' && operation==='create') throw new HttpError(422,'Crea usuarios mediante el registro para generar su contraseña.');
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new HttpError(422,'Objeto de datos inválido.');
  const allowed=t.columns.filter(c=>!hidden.has(c.name) && !c.generated && (operation==='create' || !t.primaryKey.includes(c.name))).map(c=>c.name);
  if (Object.keys(input).some(c=>!allowed.includes(c))) throw new HttpError(422,'Campo desconocido, protegido o generado.');
  const fields=Object.keys(input);
  if (operation!=='delete' && !fields.length) throw new HttpError(422,'Introduce campos para guardar.');
  const where=t.primaryKey.map((c,i)=>`${quote(c)}=$${i+1}`).join(' AND ');
  const keys=operation==='create' ? [] : t.primaryKey.map(c=>{if (key?.[c]==null) throw new HttpError(422,`Falta clave ${c}.`); return key[c];});
  return transaction(async db=>{
    let result;
    if (operation==='create') result=await db.query(`INSERT INTO ${quote(name)} (${fields.map(quote).join(',')}) VALUES (${fields.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING ${columns(t)}`,fields.map(c=>input[c]));
    else if (operation==='update') result=await db.query(`UPDATE ${quote(name)} SET ${fields.map((c,i)=>`${quote(c)}=$${keys.length+i+1}`).join(',')} WHERE ${where} RETURNING ${columns(t)}`,[...keys,...fields.map(c=>input[c])]);
    else result=await db.query(`DELETE FROM ${quote(name)} WHERE ${where} RETURNING ${columns(t)}`,keys);
    if (!result.rowCount) throw new HttpError(404,'Registro no encontrado.');
    return result.rows[0];
  });
}
