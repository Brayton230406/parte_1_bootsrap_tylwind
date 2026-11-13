import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import supertest from 'supertest';
import { app } from '../app.js';
import { pool, transaction } from '../config/db.js';
import { hashPassword } from '../lib/password.js';

const api = supertest(app);
const prefix = '/api/v1';
after(() => pool.end());

test('sirve la tienda y la vista Vue y protege rutas privadas', async () => {
  await api.get('/').expect(200);
  await api.get('/cuenta').expect(200);
  await api.get('/vendor/vue.js').expect(200);
  await api.get('/database/michoks-68.sql').expect(404);
  await api.get(prefix + '/admin/esquema').expect(401);
  await api.post(prefix + '/pedidos').send({}).expect(401);
  await api.get(prefix + '/productos?limit=-1').expect(422);
});

test('PostgreSQL: cuenta, carrito, pedido, inventario y administración', {
  skip: process.env.TEST_DATABASE !== 'true',
}, async () => {
  // Usar únicamente una base de pruebas desechable inicializada con db:init.
  const suffix = randomUUID().slice(0, 8);
  const password = 'Prueba-local-123';
  const { id, admin } = await transaction(async db => {
    const {rows: [admin]} = await db.query('INSERT INTO usuario(nombre_usuario,nombre,correo,password_hash) VALUES($1,$1,$2,$3) RETURNING id_usuario', [
      'admin_' + suffix, 'admin_' + suffix + '@example.test', await hashPassword(password),
    ]);
    await db.query("INSERT INTO usuario_rol(id_usuario,codigo_rol) VALUES($1,'administrador')", [admin.id_usuario]);
    await db.query('INSERT INTO administrador(id_usuario) VALUES($1)', [admin.id_usuario]);
    const {rows: [unit]} = await db.query('INSERT INTO unidad_medida(nombre,simbolo) VALUES($1,$2) RETURNING id_unidad_medida', ['Unidad ' + suffix, suffix]);
    const {rows: [brand]} = await db.query('INSERT INTO marca(nombre) VALUES($1) RETURNING id_marca', ['Marca ' + suffix]);
    const {rows: [size]} = await db.query("INSERT INTO presentacion(id_unidad_medida,nombre,cantidad) VALUES($1,'750 ml',1) RETURNING id_presentacion", [unit.id_unidad_medida]);
    const {rows: [product]} = await db.query("INSERT INTO producto(id_marca,id_presentacion,sku,nombre,precio_base) VALUES($1,$2,$3,'Producto de prueba',12.50) RETURNING id_producto", [brand.id_marca, size.id_presentacion, suffix]);
    const {rows: [warehouse]} = await db.query("INSERT INTO almacen(nombre,direccion) VALUES($1,'Dirección de prueba') RETURNING id_almacen", ['Almacén ' + suffix]);
    const {rows: [bin]} = await db.query("INSERT INTO ubicacion(id_almacen,codigo) VALUES($1,'A') RETURNING id_ubicacion", [warehouse.id_almacen]);
    const {rows: [link]} = await db.query('INSERT INTO producto_almacen(id_producto,id_almacen) VALUES($1,$2) RETURNING id_producto_almacen', [product.id_producto, warehouse.id_almacen]);
    await db.query('INSERT INTO existencia(id_producto_almacen,id_ubicacion,cantidad) VALUES($1,$2,2)', [link.id_producto_almacen, bin.id_ubicacion]);
    return { id: product.id_producto, admin: 'admin_' + suffix };
  });
  await api.get(prefix + '/salud').expect(200);
  const {body: catalog} = await api.get(prefix + '/productos?q=' + suffix).expect(200);
  assert.equal(catalog.data[0].stock, 2);
  const username = 'cliente_' + suffix;
  await api.post(prefix + '/auth/registro').send({
    nombre_usuario: username, nombre: 'Cliente de prueba', correo: username + '@example.test',
    password, mayor_edad: true, acepta_terminos: true,
  }).expect(201);
  async function signIn(identifier) {
    const {body} = await api.post(prefix + '/auth/login').send({identifier,password}).expect(200);
    return 'Bearer ' + body.data.token;
  }
  const token = await signIn(username);
  const jwt = token.slice('Bearer '.length);
  assert.equal(jwt.split('.').length, 3);
  const parts = jwt.split('.');
  const tampered = parts[0] + '.' + parts[1] + '.' + (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
  await api.get(prefix + '/auth/me').set('Authorization', 'Bearer ' + tampered).expect(401);

  await api.get(prefix + '/admin/esquema').set('Authorization', token).expect(403);
  const items = [{id_producto: id, cantidad: 2}];
  await api.put(prefix + '/carrito').set('Authorization', token).send({items, previos: []}).expect(200);
  await api.put(prefix + '/carrito').set('Authorization', token).send({items: [], previos: []}).expect(409);
  await api.post(prefix + '/admin/operaciones/conteo').set('Authorization', token).send({}).expect(403);
  const {body: cart} = await api.get(prefix + '/carrito').set('Authorization', token).expect(200);
  assert.equal(Number(cart.data[0].cantidad), 2);
  await api.post(prefix + '/pedidos').set('Authorization', token).send({items:[{id_producto:id,cantidad:3}],modalidad_entrega:'retiro'}).expect(409);
  const {body: before} = await api.get(prefix + '/pedidos').set('Authorization', token).expect(200);
  assert.deepEqual(before.data, []);
  const {body: order} = await api.post(prefix + '/pedidos').set('Authorization', token).send({
    items, desde_carrito:true, modalidad_entrega:'delivery', direccion:'Dirección de prueba', ciudad:'Quito',
  }).expect(201);
  await api.post(prefix + '/pedidos').set('Authorization', token).send({
    items, desde_carrito:true, modalidad_entrega:'retiro',
  }).expect(409);
  const orderPath = prefix + '/pedidos/' + order.data.id_pedido;
  const {body: detail} = await api.get(orderPath).set('Authorization', token).expect(200);
  assert.equal(detail.data.detalles[0].precio_unitario, '12.50');
  await api.post(orderPath + '/cancelacion').set('Authorization', token).expect(200);
  const {body: product} = await api.get(prefix + '/productos/' + id).expect(200);
  assert.equal(product.data.stock, 2);
  const otherSession = await signIn(username);
  await api.put(prefix + '/auth/contrasena').set('Authorization', token).send({
    actual:password, nueva:'Nueva-Clave-123',
  }).expect(204);
  await api.get(prefix + '/auth/me').set('Authorization', otherSession).expect(401);
  await api.get(prefix + '/auth/me').set('Authorization', token).expect(200);
  await api.post(prefix + '/auth/logout').set('Authorization', token).expect(204);
  await api.get(prefix + '/auth/me').set('Authorization', token).expect(401);

  const adminToken = await signIn(admin);
  const {body: schema} = await api.get(prefix + '/admin/esquema').set('Authorization', adminToken).expect(200);
  assert.equal(schema.data.length, 68);
  for (const table of schema.data) {
    await api.get(prefix + '/admin/' + table.name + '?limit=1').set('Authorization', adminToken).expect(200);
  }
  const {body: location} = await api.post(prefix + '/admin/operaciones/ubicacion')
    .set('Authorization', adminToken).send({almacen:'Conteo ' + suffix,direccion:'Dirección de prueba',codigo:'A'}).expect(201);
  const count = (cantidad) => api.post(prefix + '/admin/operaciones/conteo').set('Authorization', adminToken)
    .send({id_producto:id,id_ubicacion:location.data.id_ubicacion,cantidad,referencia:'Conteo de prueba'});
  const {body: adjusted} = await count('8').expect(200);
  await count('8').expect(200);
  await count('5').expect(200);
  const {rows: movements} = await pool.query(`SELECT t.signo,m.cantidad FROM movimiento_inventario m
    JOIN tipo_movimiento t USING(id_tipo_movimiento) WHERE id_existencia=$1 ORDER BY id_movimiento_inventario`,
  [adjusted.data.id_existencia]);
  assert.deepEqual(movements, [{signo:1,cantidad:'8.000'},{signo:-1,cantidad:'3.000'}]);
  const brands = prefix + '/admin/marca';
  const {body: brand} = await api.post(brands).set('Authorization', adminToken).send({nombre:'CRUD ' + suffix}).expect(201);
  const key = {id_marca: brand.data.id_marca};
  await api.patch(brands).set('Authorization', adminToken).send({key,data:{nombre:'Actualizada ' + suffix}}).expect(200);
  await api.delete(brands).set('Authorization', adminToken).send({key}).expect(204);
});
