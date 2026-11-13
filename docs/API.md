# API MICHOKS v1

Base: `/api/v1`. Intercambio JSON. Respuesta correcta `{status:"success",data,meta?}`; error `{status:"error",error:{message,requestId}}`. Cada petición incluye `X-Correlation-ID`. Las respuestas API llevan `Cache-Control: no-store`.

| Método | Ruta | Acceso | Operación |
|---|---|---|---|
| GET | /salud | Público | Verificar conexión y presencia del catálogo |
| GET | /productos?limit=10&offset=0&q=texto | Público | Catálogo activo; `meta.total` |
| GET | /productos/categorias | Público | Categorías y número de productos |
| GET | /productos/:id | Público | Producto activo |
| POST | /auth/registro | Público | Registro de cliente |
| POST | /auth/login | Público | Crear sesión y devolver token |
| GET | /auth/me | Autenticado | Identidad y roles activos |
| POST | /auth/logout | Autenticado | Revocar sesión; 204 |
| PUT | /auth/contrasena | Autenticado | Cambiar contraseña y revocar otras sesiones |
| GET | /carrito | Cliente | Recuperar carrito activo |
| PUT | /carrito | Cliente | Reemplazar carrito completo |
| POST | /pedidos | Cliente | Pedido transaccional y reservas |
| GET | /pedidos | Cliente | Pedidos propios |
| GET | /pedidos/:id | Cliente | Cabecera, detalles e historial propios |
| POST | /pedidos/:id/cancelacion | Cliente | Anular y liberar reservas |
| POST | /admin/operaciones/ubicacion | Administrador | Crear ubicación y almacén si hace falta |
| POST | /admin/operaciones/conteo | Administrador | Guardar conteo físico y movimiento de inventario |
| POST | /admin/operaciones/facturar | Administrador | Factura, detalles e impuestos desde pedido |
| POST | /admin/operaciones/pagar | Administrador | Pago recibido aplicado a una factura |
| POST | /admin/operaciones/recibir | Administrador | Recepción de compra con entrada de stock |
| POST | /admin/operaciones/despachar | Administrador | Consumo de reservas, envío y delivery |
| POST | /admin/operaciones/entregar | Administrador | Entrega e historiales |
| GET | /admin/esquema | Administrador | Metadatos de 68 tablas |
| GET | /admin/:tabla?limit=25&offset=0 | Administrador | Listado paginado |
| POST | /admin/:tabla | Administrador | Crear registro |
| PATCH | /admin/:tabla | Administrador | Actualizar por clave simple/compuesta |
| DELETE | /admin/:tabla | Administrador | Eliminar por clave; 204 |

En las rutas protegidas: `Authorization: Bearer <token>`. La autorización procede de PostgreSQL, nunca de cabeceras de rol indicadas por el navegador. Los identificadores bigint viajan como cadenas para conservar su precisión.

Registro:

```json
{"nombre_usuario":"cliente","nombre":"Nombre Apellido","correo":"cliente@example.com","telefono":"0991234567","password":"contraseña de al menos 10 caracteres","mayor_edad":true,"acepta_terminos":true}
```

Login:

```json
{"identifier":"cliente@example.com","password":"contraseña"}
```

Pedido (las cantidades se limitan a enteros de 1 a 99; los precios se obtienen de la base):

```json
{"modalidad_entrega":"delivery","direccion":"Calle y número","ciudad":"Quito","items":[{"id_producto":"1","cantidad":2}]}
```

Para retiro, usa `modalidad_entrega:"retiro"` y omite dirección/ciudad. El carrito recibe `{ "items": [...], "previos": [...] }`. Una lista vacía lo limpia. Si `previos` se incluye, debe coincidir con el carrito actual. Con `desde_carrito: true`, un pedido exige que `items` coincida con el carrito antes de convertirlo.

PATCH de una relación con clave compuesta:

```json
{"key":{"id_carrito":"1","id_producto":"2"},"data":{"cantidad":3}}
```

DELETE recibe únicamente `{ "key": { ... } }`. Los campos generados, contraseñas y tokens no admiten edición genérica. Para una tabla con clave primaria generada, POST omite esa clave. Los errores de FK devuelven 409; los CHECK y datos inválidos, 422. Ningún endpoint administrativo es público.

Fuentes técnicas: [Express: errores](https://expressjs.com/en/guide/error-handling.html), [node-postgres: consultas](https://node-postgres.com/features/queries), [node-postgres: transacciones](https://node-postgres.com/features/transactions), [Vue: componentes](https://vuejs.org/guide/essentials/component-basics.html).

## Operaciones transaccionales

Todos los identificadores pueden enviarse como cadenas. Para emitir una factura:

```json
{"id_pedido":"1","id_datos_facturacion":"1","numero":"FACT-001","impuestos":["1"]}
```

Registrar un pago ya recibido:

```json
{"id_factura":"1","id_metodo_pago":"1","importe":"20.50","referencia":"TRANSFERENCIA-001"}
```

Recibir una compra confirmada:

```json
{"id_compra":"1","id_ubicacion":"1","referencia":"RECEPCION-001","items":[{"id_detalle_compra":"1","cantidad":"10"}]}
```

Despachar un pedido con delivery (para retiro basta pedido y transportista):

```json
{"id_pedido":"1","id_transportista":"1","id_tarifa_delivery":"1","ventana_inicio":"2026-11-12T15:00:00-05:00","ventana_fin":"2026-11-12T17:00:00-05:00","id_repartidor":"1","id_vehiculo":"1"}
```

Confirmar entrega:

```json
{"id_envio":"1","observacion":"Entrega confirmada","receptor":"Nombre del receptor","url_evidencia":"https://servidor-del-negocio/evidencia.jpg"}
```

No se descargan ni se publican archivos desde la URL de evidencia: se guarda su referencia. Los endpoints de facturación, pago, recepción y despacho devuelven 201; entrega devuelve 200. Errores de negocio devuelven 409.

El catálogo acepta category, occasion, budget y sort. Los valores de sort son featured, price-asc, price-desc y name. La búsqueda y los filtros se aplican antes de la paginación.
