import { pool, transaction } from '../config/db.js';
import { lockCustomer, checkSnapshot } from './cart.model.js';
import { HttpError } from '../lib/http.js';
export async function create(customer, input) {
  return transaction(async db => {
    // Serializa checkout y sincronización del carrito del mismo cliente.
    await lockCustomer(db, customer);
    if (input.desde_carrito) await checkSnapshot(db, customer, input.items);
    const {rows:states}=await db.query("SELECT id_estado_pedido FROM estado_pedido WHERE nombre='Pendiente' AND NOT es_anulado");
    if (!states.length) throw new HttpError(409,'Falta configurar el estado de pedido Pendiente. Ejecuta db:init o créalo en administración.');
    let address = null;
    if (input.modalidad_entrega==='delivery') {
      const {rows:[row]}=await db.query('INSERT INTO direccion(id_cliente,direccion,ciudad) VALUES($1,$2,$3) RETURNING id_direccion',[customer,input.direccion,input.ciudad]);
      address=row.id_direccion;
    }
    const {rows:[order]}=await db.query('INSERT INTO pedido(id_cliente,id_direccion,id_estado_pedido,modalidad_entrega,observacion) VALUES($1,$2,$3,$4,$5) RETURNING *',[customer,address,states[0].id_estado_pedido,input.modalidad_entrega,input.observacion || null]);
    for (const item of input.items) {
      const {rows:[product]}=await db.query('SELECT * FROM producto WHERE id_producto=$1 AND activo FOR UPDATE',[item.id_producto]);
      if (!product) throw new HttpError(422,'Producto inexistente o inactivo.');
      const {rows:[line]}=await db.query('INSERT INTO detalle_pedido(id_pedido,id_producto,cantidad,precio_unitario) VALUES($1,$2,$3,$4) RETURNING id_detalle_pedido',[order.id_pedido,item.id_producto,item.cantidad,product.precio_base]);
      // Bloqueo de existencias evita sobreventa entre clientes concurrentes.
      const {rows:stock}=await db.query(`SELECT e.* FROM existencia e JOIN producto_almacen pa USING(id_producto_almacen) LEFT JOIN lote l USING(id_lote)
        WHERE pa.id_producto=$1 AND (l.fecha_caducidad IS NULL OR l.fecha_caducidad>=CURRENT_DATE) ORDER BY e.id_existencia FOR UPDATE OF e`,[item.id_producto]);
      let pending=String(item.cantidad);
      for (const entry of stock) {
        const {rows:[allocation]}=await db.query(`SELECT LEAST($1::numeric,GREATEST($2::numeric-COALESCE(sum(cantidad),0),0)) AS take
          FROM reserva_inventario WHERE id_existencia=$3 AND activa AND (vence_en IS NULL OR vence_en>now())`,[pending,entry.cantidad,entry.id_existencia]);
        if(Number(allocation.take)>0) {
          await db.query('INSERT INTO reserva_inventario(id_existencia,id_detalle_pedido,cantidad) VALUES($1,$2,$3)',[entry.id_existencia,line.id_detalle_pedido,allocation.take]);
          pending=(await db.query('SELECT $1::numeric-$2::numeric AS remaining',[pending,allocation.take])).rows[0].remaining;
        }
        if(Number(pending)===0)break;
      }
      if (pending>0) throw new HttpError(409,`Stock insuficiente para ${product.nombre}.`);
    }
    await db.query('INSERT INTO historial_pedido(id_pedido,id_estado_pedido,observacion) VALUES($1,$2,$3)',[order.id_pedido,order.id_estado_pedido,'Pedido registrado desde la tienda']);
    await db.query("UPDATE carrito SET estado='convertido' WHERE id_cliente=$1 AND estado='activo'",[customer]);
    return order;
  });
}
export async function list(customer) {
  return (await pool.query(`SELECT p.*,s.nombre AS estado,
    (SELECT COALESCE(sum(round(d.cantidad*d.precio_unitario,2)),0)::text FROM detalle_pedido d WHERE d.id_pedido=p.id_pedido) AS subtotal
    FROM pedido p JOIN estado_pedido s USING(id_estado_pedido) WHERE p.id_cliente=$1 ORDER BY p.id_pedido DESC`,[customer])).rows;
}
export async function detail(customer,id) {
  const {rows:[order]}=await pool.query('SELECT * FROM pedido WHERE id_pedido=$1 AND id_cliente=$2',[id,customer]);
  if (!order) throw new HttpError(404,'Pedido no encontrado.');
  order.detalles=(await pool.query('SELECT d.*,p.nombre FROM detalle_pedido d JOIN producto p USING(id_producto) WHERE id_pedido=$1',[id])).rows;
  order.historial=(await pool.query('SELECT h.*,e.nombre AS estado FROM historial_pedido h JOIN estado_pedido e USING(id_estado_pedido) WHERE id_pedido=$1 ORDER BY fecha',[id])).rows;
  return order;
}
export async function cancel(customer,id) {
  return transaction(async db => {
    const {rows:[order]}=await db.query('SELECT p.*, e.nombre AS estado, e.es_anulado FROM pedido p JOIN estado_pedido e USING(id_estado_pedido) WHERE p.id_pedido=$1 AND p.id_cliente=$2 FOR UPDATE OF p',[id,customer]);
    if (!order) throw new HttpError(404,'Pedido no encontrado.');
    if (order.es_anulado) return {id_pedido:id};
    if (order.estado !== 'Pendiente') throw new HttpError(409,'Solo se pueden cancelar pedidos pendientes.');
    if ((await db.query('SELECT 1 FROM pago WHERE id_pedido=$1 UNION ALL SELECT 1 FROM factura WHERE id_pedido=$1 UNION ALL SELECT 1 FROM envio WHERE id_pedido=$1',[id])).rowCount) throw new HttpError(409,'Contacta con la tienda: este pedido ya tiene pagos, factura o envío.');
    const {rows:[state]}=await db.query("SELECT id_estado_pedido FROM estado_pedido WHERE nombre='Anulado' AND es_anulado");
    if (!state) throw new HttpError(409,'Falta configurar el estado Anulado.');
    await db.query('UPDATE pedido SET id_estado_pedido=$1 WHERE id_pedido=$2',[state.id_estado_pedido,id]);
    await db.query('UPDATE reserva_inventario SET activa=false WHERE id_detalle_pedido IN(SELECT id_detalle_pedido FROM detalle_pedido WHERE id_pedido=$1)',[id]);
    await db.query("INSERT INTO historial_pedido(id_pedido,id_estado_pedido,observacion) VALUES($1,$2,'Cancelado por el cliente')",[id,state.id_estado_pedido]);
    return {id_pedido:id};
  });
}
