import * as model from '../models/operations.model.js';
import { id,text,ok,HttpError } from '../lib/http.js';
const optionalId=v=>v ? id(v) : null;
const optionalText=(v,name,max)=>v ? text(v,name,max) : null;
function decimal(v){if(!/^\d{1,12}(\.\d{1,3})?$/.test(String(v)) || Number(v)<=0)throw new HttpError(422,'Importe o cantidad positiva inválida.');return String(v);}
export async function invoice(req,res){
 const b=req.body;
 if(b.impuestos!==undefined && !Array.isArray(b.impuestos))throw new HttpError(422,'Impuestos debe ser una lista de identificadores.');
 ok(res,await model.invoice({id_pedido:id(b.id_pedido),id_datos_facturacion:id(b.id_datos_facturacion),numero:text(b.numero,'Número de factura',60),impuestos:(b.impuestos || []).map(id)}),201);
}
export async function payment(req,res){const b=req.body;if(!/^\d{1,12}(\.\d{1,2})?$/.test(String(b.importe)))throw new HttpError(422,'El importe admite hasta dos decimales.');ok(res,await model.payment({id_factura:id(b.id_factura),id_metodo_pago:id(b.id_metodo_pago),importe:decimal(b.importe),referencia:optionalText(b.referencia,'Referencia',160)}),201);}
export async function receive(req,res){
 const b=req.body;if(!Array.isArray(b.items)||!b.items.length||b.items.length>100)throw new HttpError(422,'La recepción requiere entre 1 y 100 detalles.');
 const seen=new Set();const items=b.items.map(r=>{const key=id(r.id_detalle_compra);if(seen.has(key))throw new HttpError(422,'Detalle repetido.');seen.add(key);return {id_detalle_compra:key,cantidad:decimal(r.cantidad)};}).sort((a,b)=>BigInt(a.id_detalle_compra)<BigInt(b.id_detalle_compra)?-1:1);
 ok(res,await model.receive({id_compra:id(b.id_compra),id_ubicacion:id(b.id_ubicacion),referencia:optionalText(b.referencia,'Referencia',100),items}),201);
}
export async function dispatch(req,res){
 const b=req.body;const input={id_pedido:id(b.id_pedido),id_transportista:id(b.id_transportista),id_tarifa_delivery:optionalId(b.id_tarifa_delivery),id_repartidor:optionalId(b.id_repartidor),id_vehiculo:optionalId(b.id_vehiculo),guia:optionalText(b.guia,'Guía',100),ventana_inicio:b.ventana_inicio || null,ventana_fin:b.ventana_fin || null};
 if(input.ventana_inicio && (!Number.isFinite(Date.parse(input.ventana_inicio)) || !Number.isFinite(Date.parse(input.ventana_fin)) || Date.parse(input.ventana_fin)<=Date.parse(input.ventana_inicio)))throw new HttpError(422,'Ventana horaria inválida.');
 ok(res,await model.dispatch(input),201);
}
export async function delivered(req,res){const b=req.body;ok(res,await model.delivered({id_envio:id(b.id_envio),observacion:optionalText(b.observacion,'Observación',1000),url_evidencia:optionalText(b.url_evidencia,'URL de evidencia',2000),receptor:optionalText(b.receptor,'Receptor',160)}));}

export async function countStock(req,res) {
  const input = req.body || {};
  const cantidad = String(input.cantidad);
  if (!/^\d{1,11}(\.\d{1,3})?$/.test(cantidad)) throw new HttpError(422, 'Ingresa una cantidad de cero o más con hasta tres decimales.');
  ok(res, await model.countStock({
    id_producto: id(input.id_producto),
    id_ubicacion: id(input.id_ubicacion),
    cantidad,
    referencia: text(input.referencia, 'Motivo del conteo', 100),
  }));
}

export async function createStockLocation(req,res) {
  const input = req.body || {};
  ok(res, await model.createStockLocation({
    almacen: text(input.almacen, 'Nombre del almacén', 100),
    direccion: text(input.direccion, 'Dirección', 300),
    codigo: text(input.codigo, 'Código de ubicación', 40),
  }), 201);
}
