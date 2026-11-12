import test from 'node:test';
import assert from 'node:assert/strict';
import { items } from '../lib/http.js';
import { hashPassword,verifyPassword } from '../lib/password.js';
import { metadata } from '../models/admin.model.js';
test('cantidades y productos duplicados se rechazan',()=>{
 for(const value of [[],[{id_producto:1,cantidad:0}],[{id_producto:1,cantidad:1.5}],[{id_producto:1,cantidad:1},{id_producto:'1',cantidad:2}]])assert.throws(()=>items(value));
 assert.deepEqual(items([{id_producto:2,cantidad:99}]),[{id_producto:'2',cantidad:99}]);
});
test('contraseñas con sal y verificación segura',async()=>{
 const hash=await hashPassword('Una-clave-larga-123');
 assert.notEqual(hash,await hashPassword('Una-clave-larga-123'));
 assert.equal(await verifyPassword('Una-clave-larga-123',hash),true);
 assert.equal(await verifyPassword('incorrecta',hash),false);
 assert.equal(await verifyPassword('incorrecta','hash-invalido'),false);
});
test('68 tablas sin contraseñas ni tokens en metadatos públicos administrativos',()=>{
 const tables=metadata(); assert.equal(tables.length,68);
 assert.ok(tables.every(t=>t.primaryKey.length && !t.columns.some(c=>['password_hash','token_hash','token_invitado'].includes(c.name))));
});
