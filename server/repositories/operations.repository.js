import { movementUpdatesStock } from '../models/inventory.model.js';
import { transaction } from '../config/db.js';
import { HttpError } from '../lib/http.js';
const fail=message=>{throw new HttpError(409,message);};
async function orderLock(db,id){
 const {rows:[order]}=await db.query('SELECT p.*,s.es_anulado FROM pedido p JOIN estado_pedido s USING(id_estado_pedido) WHERE p.id_pedido=$1 FOR UPDATE OF p',[id]);
 if(!order || order.es_anulado)fail('El pedido no existe o está anulado.');
 return order;
}
async function movementType(db,name,sign){
 const {rows:[row]}=await db.query('INSERT INTO tipo_movimiento(nombre,signo) VALUES($1,$2) ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING *',[name,sign]);
 if(row.signo!==sign)fail('El signo del tipo de movimiento no corresponde a la operación.');
 return row.id_tipo_movimiento;
}
export async function invoice(input){
 return transaction(async db=>{
  const order=await orderLock(db,input.id_pedido);
  if((await db.query('SELECT 1 FROM factura WHERE id_pedido=$1',[input.id_pedido])).rowCount)fail('El pedido ya tiene factura.');
  if((await db.query('SELECT 1 FROM pedido_cupon WHERE id_pedido=$1',[input.id_pedido])).rowCount)fail('Este pedido tiene descuentos: completa su facturación con el desglose correspondiente en administración.');
  const {rows:[billing]}=await db.query('SELECT * FROM datos_facturacion WHERE id_datos_facturacion=$1 AND id_cliente=$2',[input.id_datos_facturacion,order.id_cliente]);
  if(!billing)fail('Los datos de facturación no pertenecen al cliente del pedido.');
  const {rows:taxes}=await db.query('SELECT * FROM impuesto WHERE id_impuesto=ANY($1::bigint[]) AND vigente_desde<=CURRENT_DATE AND (vigente_hasta IS NULL OR vigente_hasta>=CURRENT_DATE) ORDER BY id_impuesto',[input.impuestos]);
  if(taxes.length!==input.impuestos.length)fail('Hay impuestos inexistentes, repetidos o fuera de vigencia.');
  const {rows:lines}=await db.query('SELECT d.*,p.nombre,round(d.cantidad*d.precio_unitario,2) AS base FROM detalle_pedido d JOIN producto p USING(id_producto) WHERE id_pedido=$1 ORDER BY d.id_detalle_pedido',[input.id_pedido]);
  if(!lines.length)fail('El pedido no tiene detalles.');
  const {rows:[state]}=await db.query("INSERT INTO estado_factura(nombre) VALUES('Emitida') ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING *");
  if(state.es_anulado)fail('El estado Emitida está configurado como anulado.');
  const {rows:[bill]}=await db.query(`INSERT INTO factura(id_pedido,id_datos_facturacion,id_estado_factura,numero,tipo_identificacion_snapshot,identificacion_snapshot,razon_social_snapshot,direccion_fiscal_snapshot,email_snapshot,subtotal,total,moneda)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,0,0,$10) RETURNING id_factura`,[order.id_pedido,billing.id_datos_facturacion,state.id_estado_factura,input.numero,billing.tipo_identificacion,billing.identificacion,billing.razon_social,billing.direccion_fiscal,billing.email,order.moneda]);
  for(const line of lines){
   const {rows:[detail]}=await db.query(`INSERT INTO detalle_factura(id_factura,id_detalle_pedido,cantidad,descripcion,precio_unitario,base_imponible,total_linea) VALUES($1,$2,$3,$4,$5,$6,$6) RETURNING id_detalle_factura`,[bill.id_factura,line.id_detalle_pedido,line.cantidad,line.nombre,line.precio_unitario,line.base]);
   for(const tax of taxes)await db.query('INSERT INTO detalle_factura_impuesto(id_detalle_factura,id_impuesto,base_imponible,tasa_aplicada,importe) VALUES($1,$2,$3,$4,round($3::numeric*$4::numeric,2))',[detail.id_detalle_factura,tax.id_impuesto,line.base,tax.tasa]);
   await db.query(`UPDATE detalle_factura d SET impuesto=t.importe,total_linea=d.base_imponible+t.importe FROM (SELECT COALESCE(sum(importe),0) AS importe FROM detalle_factura_impuesto WHERE id_detalle_factura=$1) t WHERE d.id_detalle_factura=$1`,[detail.id_detalle_factura]);
  }
  return (await db.query(`UPDATE factura f SET subtotal=t.base,impuesto=t.impuesto,total=t.total FROM (SELECT sum(base_imponible) AS base,sum(impuesto) AS impuesto,sum(total_linea) AS total FROM detalle_factura WHERE id_factura=$1) t WHERE f.id_factura=$1 RETURNING f.*`,[bill.id_factura])).rows[0];
 });
}
export async function payment(input){
 return transaction(async db=>{
  const {rows:[bill]}=await db.query('SELECT f.*,e.es_anulado FROM factura f JOIN estado_factura e USING(id_estado_factura) WHERE id_factura=$1 FOR UPDATE OF f',[input.id_factura]);
  if(!bill || bill.es_anulado)fail('Factura inexistente o anulada.');
  await orderLock(db,bill.id_pedido);
  const {rows:[method]}=await db.query('SELECT 1 FROM metodo_pago WHERE id_metodo_pago=$1 AND activo',[input.id_metodo_pago]);
  if(!method)fail('Método de pago inactivo o inexistente.');
  const {rows:[{available}]}=await db.query(`SELECT $1::numeric<=f.total-COALESCE((SELECT sum(a.importe_aplicado) FROM aplicacion_pago_factura a JOIN pago p USING(id_pago) JOIN estado_pago e USING(id_estado_pago) WHERE a.id_factura=f.id_factura AND e.es_confirmado),0) AS available FROM factura f WHERE id_factura=$2`,[input.importe,bill.id_factura]);
  if(!available)fail('El importe excede el saldo pendiente de la factura.');
  const {rows:[state]}=await db.query("INSERT INTO estado_pago(nombre,es_confirmado) VALUES('Confirmado',true) ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING *");
  if(!state.es_confirmado)fail('El estado de pago Confirmado está mal configurado.');
  const {rows:[payment]}=await db.query('INSERT INTO pago(id_pedido,id_metodo_pago,id_estado_pago,importe,moneda,referencia_externa) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[bill.id_pedido,input.id_metodo_pago,state.id_estado_pago,input.importe,bill.moneda,input.referencia]);
  await db.query('INSERT INTO aplicacion_pago_factura(id_pago,id_factura,importe_aplicado) VALUES($1,$2,$3)',[payment.id_pago,bill.id_factura,input.importe]);
  return payment;
 });
}
export async function receive(input){
 return transaction(async db=>{
  const {rows:[purchase]}=await db.query('SELECT * FROM compra WHERE id_compra=$1 FOR UPDATE',[input.id_compra]);
  if(!purchase || !['confirmada','parcial'].includes(purchase.estado))fail('La compra debe estar confirmada o parcialmente recibida.');
  const {rows:[location]}=await db.query('SELECT * FROM ubicacion WHERE id_ubicacion=$1',[input.id_ubicacion]);
  if(!location)fail('Ubicación inexistente.');
  const {rows:[receipt]}=await db.query('INSERT INTO recepcion_compra(id_compra,id_almacen,referencia) VALUES($1,$2,$3) RETURNING *',[purchase.id_compra,location.id_almacen,input.referencia]);
  const type=await movementType(db,'Entrada por compra',1);
  for(const item of input.items){
   const {rows:[line]}=await db.query(`SELECT d.*,d.cantidad-COALESCE((SELECT sum(r.cantidad_recibida) FROM detalle_recepcion r WHERE r.id_detalle_compra=d.id_detalle_compra),0) AS pendiente FROM detalle_compra d WHERE id_detalle_compra=$1 AND id_compra=$2`,[item.id_detalle_compra,purchase.id_compra]);
   if(!line)fail('Detalle ajeno a la compra.');
   if(!(await db.query('SELECT $1::numeric <= $2::numeric AS valid',[item.cantidad,line.pendiente])).rows[0].valid)fail('La recepción supera la cantidad pendiente.');
   await db.query('SELECT id_producto FROM producto WHERE id_producto=$1 FOR UPDATE',[line.id_producto]);
   const {rows:[pa]}=await db.query('INSERT INTO producto_almacen(id_producto,id_almacen) VALUES($1,$2) ON CONFLICT(id_producto,id_almacen) DO UPDATE SET id_producto=EXCLUDED.id_producto RETURNING id_producto_almacen',[line.id_producto,location.id_almacen]);
   const {rows:[stock]}=await db.query(`INSERT INTO existencia(id_producto_almacen,id_ubicacion,cantidad) VALUES($1,$2,0) ON CONFLICT(id_producto_almacen,id_ubicacion) WHERE id_lote IS NULL DO UPDATE SET id_ubicacion=EXCLUDED.id_ubicacion RETURNING id_existencia`,[pa.id_producto_almacen,location.id_ubicacion]);
   if (!await movementUpdatesStock(db)) await db.query('UPDATE existencia SET cantidad=cantidad+$1::numeric WHERE id_existencia=$2',[item.cantidad,stock.id_existencia]);
   await db.query('INSERT INTO detalle_recepcion(id_recepcion_compra,id_detalle_compra,cantidad_recibida) VALUES($1,$2,$3)',[receipt.id_recepcion_compra,line.id_detalle_compra,item.cantidad]);
   await db.query('INSERT INTO movimiento_inventario(id_existencia,id_tipo_movimiento,cantidad,referencia) VALUES($1,$2,$3,$4)',[stock.id_existencia,type,item.cantidad,'Recepción #'+receipt.id_recepcion_compra]);
  }
  await db.query(`UPDATE compra SET estado=CASE WHEN EXISTS(SELECT 1 FROM detalle_compra d WHERE id_compra=$1 AND d.cantidad>COALESCE((SELECT sum(r.cantidad_recibida) FROM detalle_recepcion r WHERE r.id_detalle_compra=d.id_detalle_compra),0)) THEN 'parcial' ELSE 'recibida' END WHERE id_compra=$1`,[purchase.id_compra]);
  return receipt;
 });
}
export async function dispatch(input){
 return transaction(async db=>{
  const order=await orderLock(db,input.id_pedido);
  if((await db.query('SELECT 1 FROM envio WHERE id_pedido=$1',[order.id_pedido])).rowCount)fail('El pedido ya tiene un envío.');
  if(!(await db.query('SELECT 1 FROM transportista WHERE id_transportista=$1 AND activo',[input.id_transportista])).rowCount)fail('Transportista inexistente o inactivo.');
  let address,tariff;
  if(order.modalidad_entrega==='delivery'){
   address=(await db.query('SELECT * FROM direccion WHERE id_direccion=$1 AND id_cliente=$2',[order.id_direccion,order.id_cliente])).rows[0];
   tariff=(await db.query(`SELECT t.* FROM tarifa_delivery t JOIN zona_delivery z USING(id_zona_delivery) WHERE id_tarifa_delivery=$1 AND z.activo AND t.moneda=$2 AND t.vigente_desde<=now() AND (t.vigente_hasta IS NULL OR t.vigente_hasta>now())`,[input.id_tarifa_delivery,order.moneda])).rows[0];
   if(!address || !tariff || !input.ventana_inicio || !input.ventana_fin)fail('Delivery requiere dirección propia, tarifa vigente y ventana horaria.');
  }
  const {rows:[state]}=await db.query("INSERT INTO estado_envio(nombre) VALUES('Despachado') ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING *");
  if(state.es_final)fail('El estado Despachado no debe ser final.');
  const {rows:[shipment]}=await db.query('INSERT INTO envio(id_pedido,id_transportista,id_estado_envio,guia,fecha_programada) VALUES($1,$2,$3,$4,$5) RETURNING *',[order.id_pedido,input.id_transportista,state.id_estado_envio,input.guia,input.ventana_inicio || null]);
  await db.query('INSERT INTO historial_envio(id_envio,id_estado_envio,observacion) VALUES($1,$2,$3)',[shipment.id_envio,state.id_estado_envio,'Despacho con salida de inventario']);
  const {rows:lines}=await db.query('SELECT * FROM detalle_pedido WHERE id_pedido=$1 ORDER BY id_producto',[order.id_pedido]);
  if(!lines.length)fail('Pedido sin detalles.');
  const type=await movementType(db,'Salida por venta',-1);
  for(const line of lines){
   await db.query('SELECT id_producto FROM producto WHERE id_producto=$1 FOR UPDATE',[line.id_producto]);
   const {rows:reservations}=await db.query(`SELECT r.* FROM reserva_inventario r JOIN existencia e USING(id_existencia) WHERE id_detalle_pedido=$1 AND r.activa AND (r.vence_en IS NULL OR r.vence_en>now()) ORDER BY e.id_existencia FOR UPDATE OF e,r`,[line.id_detalle_pedido]);
   if(!(await db.query('SELECT COALESCE(sum(cantidad),0)=$1::numeric AS valid FROM reserva_inventario WHERE id_reserva_inventario=ANY($2::bigint[])',[line.cantidad,reservations.map(r=>r.id_reserva_inventario)])).rows[0].valid)fail('Reservas insuficientes para completar el despacho.');
   for(const r of reservations){
    const automatic = await movementUpdatesStock(db);
    const changed = automatic
      ? await db.query('SELECT id_existencia FROM existencia WHERE id_existencia=$2 AND cantidad>=$1::numeric',[r.cantidad,r.id_existencia])
      : await db.query('UPDATE existencia SET cantidad=cantidad-$1::numeric WHERE id_existencia=$2 AND cantidad>=$1::numeric',[r.cantidad,r.id_existencia]);
    if(!changed.rowCount)fail('Existencias insuficientes.');
    await db.query('UPDATE reserva_inventario SET activa=false WHERE id_reserva_inventario=$1',[r.id_reserva_inventario]);
    await db.query('INSERT INTO movimiento_inventario(id_existencia,id_tipo_movimiento,cantidad,referencia) VALUES($1,$2,$3,$4)',[r.id_existencia,type,r.cantidad,'Pedido #'+order.id_pedido]);
   }
  }
  if(tariff){
   const {rows:[delivery]}=await db.query(`INSERT INTO delivery(id_envio,id_direccion,id_zona_delivery,id_tarifa_delivery,direccion_entrega_snapshot,ciudad_snapshot,referencia,ventana_inicio,ventana_fin,costo_acordado) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id_delivery`,[shipment.id_envio,address.id_direccion,tariff.id_zona_delivery,tariff.id_tarifa_delivery,address.direccion,address.ciudad,address.referencia,input.ventana_inicio,input.ventana_fin,tariff.importe]);
   shipment.id_delivery=delivery.id_delivery;
   if(input.id_repartidor || input.id_vehiculo){
    const valid=(await db.query('SELECT 1 FROM repartidor r JOIN vehiculo v ON v.id_transportista=r.id_transportista WHERE r.id_repartidor=$1 AND v.id_vehiculo=$2 AND r.id_transportista=$3 AND r.activo AND v.activo',[input.id_repartidor,input.id_vehiculo,input.id_transportista])).rowCount;
    if(!valid)fail('Repartidor y vehículo deben estar activos y pertenecer al transportista.');
    await db.query('INSERT INTO asignacion_delivery(id_delivery,id_repartidor,id_vehiculo) VALUES($1,$2,$3)',[delivery.id_delivery,input.id_repartidor,input.id_vehiculo]);
   }
  }
  const {rows:[orderState]}=await db.query("INSERT INTO estado_pedido(nombre) VALUES('Despachado') ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_estado_pedido");
  await db.query('UPDATE pedido SET id_estado_pedido=$1 WHERE id_pedido=$2',[orderState.id_estado_pedido,order.id_pedido]);
  await db.query("INSERT INTO historial_pedido(id_pedido,id_estado_pedido,observacion) VALUES($1,$2,'Pedido despachado')",[order.id_pedido,orderState.id_estado_pedido]);
  return shipment;
 });
}
export async function delivered(input){
 return transaction(async db=>{
  const {rows:[shipment]}=await db.query('SELECT e.*,s.es_final FROM envio e JOIN estado_envio s USING(id_estado_envio) WHERE id_envio=$1 FOR UPDATE OF e',[input.id_envio]);
  if(!shipment || shipment.es_final)fail('Envío inexistente o finalizado.');
  await orderLock(db,shipment.id_pedido);
  const {rows:[state]}=await db.query("INSERT INTO estado_envio(nombre,es_entregado,es_final) VALUES('Entregado',true,true) ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING *");
  if(!state.es_entregado || !state.es_final)fail('El estado Entregado está mal configurado.');
  await db.query('UPDATE envio SET id_estado_envio=$1 WHERE id_envio=$2',[state.id_estado_envio,shipment.id_envio]);
  await db.query('INSERT INTO historial_envio(id_envio,id_estado_envio,observacion) VALUES($1,$2,$3)',[shipment.id_envio,state.id_estado_envio,input.observacion]);
  const {rows:[delivery]}=await db.query('SELECT id_delivery FROM delivery WHERE id_envio=$1',[shipment.id_envio]);
  if(delivery){
   const {rows:[attempt]}=await db.query("INSERT INTO intento_entrega(id_delivery,id_estado_envio,resultado,observacion) VALUES($1,$2,'entregado',$3) RETURNING id_intento_entrega",[delivery.id_delivery,state.id_estado_envio,input.observacion]);
   if(input.url_evidencia)await db.query("INSERT INTO evidencia_entrega(id_intento_entrega,tipo,url_archivo,receptor) VALUES($1,'otro',$2,$3)",[attempt.id_intento_entrega,input.url_evidencia,input.receptor]);
   await db.query('UPDATE asignacion_delivery SET fecha_fin=now() WHERE id_delivery=$1 AND fecha_fin IS NULL',[delivery.id_delivery]);
  }
  const {rows:[orderState]}=await db.query("INSERT INTO estado_pedido(nombre) VALUES('Entregado') ON CONFLICT(nombre) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id_estado_pedido");
  await db.query('UPDATE pedido SET id_estado_pedido=$1 WHERE id_pedido=$2',[orderState.id_estado_pedido,shipment.id_pedido]);
  await db.query('INSERT INTO historial_pedido(id_pedido,id_estado_pedido,observacion) VALUES($1,$2,$3)',[shipment.id_pedido,orderState.id_estado_pedido,input.observacion]);
  return {id_envio:shipment.id_envio,estado:'Entregado'};
 });
}

export async function countStock({ id_producto, id_ubicacion, cantidad, referencia }) {
  return transaction(async db => {
    const product = await db.query('SELECT 1 FROM producto WHERE id_producto=$1 AND activo FOR UPDATE', [id_producto]);
    if (!product.rowCount) throw new HttpError(404, 'Producto activo no encontrado.');
    const { rows: [location] } = await db.query('SELECT id_almacen FROM ubicacion WHERE id_ubicacion=$1', [id_ubicacion]);
    if (!location) throw new HttpError(404, 'Ubicación no encontrada.');
    const { rows: [placement] } = await db.query(`INSERT INTO producto_almacen(id_producto,id_almacen)
      VALUES ($1,$2) ON CONFLICT(id_producto,id_almacen) DO UPDATE SET id_producto=EXCLUDED.id_producto
      RETURNING id_producto_almacen`, [id_producto, location.id_almacen]);
    const { rows: [stock] } = await db.query(`INSERT INTO existencia(id_producto_almacen,id_ubicacion,cantidad)
      VALUES ($1,$2,0) ON CONFLICT(id_producto_almacen,id_ubicacion) WHERE id_lote IS NULL
      DO UPDATE SET id_ubicacion=EXCLUDED.id_ubicacion RETURNING id_existencia,cantidad`, [placement.id_producto_almacen, id_ubicacion]);
    const { rows: [adjustment] } = await db.query(`SELECT ($1::numeric-$2::numeric)::text AS diferencia,
      $1::numeric >= COALESCE(sum(cantidad),0) AS permite_reservas
      FROM reserva_inventario WHERE id_existencia=$3 AND activa AND (vence_en IS NULL OR vence_en>now())`,
    [cantidad, stock.cantidad, stock.id_existencia]);
    if (!adjustment.permite_reservas) fail('La cantidad contada es inferior a las unidades ya reservadas.');
    const difference = Number(adjustment.diferencia);
    if (difference) {
      const sign = Math.sign(difference);
      const type = await movementType(db, sign > 0 ? 'Ajuste de conteo: entrada' : 'Ajuste de conteo: salida', sign);
      if (!await movementUpdatesStock(db)) await db.query('UPDATE existencia SET cantidad=$1 WHERE id_existencia=$2', [cantidad, stock.id_existencia]);
      await db.query(`INSERT INTO movimiento_inventario(id_existencia,id_tipo_movimiento,cantidad,referencia)
        VALUES ($1,$2,abs($3::numeric),$4)`, [stock.id_existencia, type, adjustment.diferencia, referencia]);
    }
    return { id_existencia: stock.id_existencia, cantidad };
  });
}

export async function createStockLocation({ almacen, direccion, codigo }) {
  return transaction(async db => {
    await db.query('INSERT INTO almacen(nombre,direccion) VALUES ($1,$2) ON CONFLICT(nombre) DO NOTHING', [almacen, direccion]);
    const { rows: [warehouse] } = await db.query('SELECT id_almacen,direccion FROM almacen WHERE nombre=$1', [almacen]);
    if (warehouse.direccion !== direccion) fail('Ya existe un almacén con ese nombre y otra dirección.');
    const { rows: [location] } = await db.query(`INSERT INTO ubicacion(id_almacen,codigo) VALUES ($1,$2)
      ON CONFLICT(id_almacen,codigo) DO NOTHING RETURNING id_ubicacion`, [warehouse.id_almacen, codigo]);
    if (!location) fail('El almacén ya tiene una ubicación con ese código.');
    return location;
  });
}
