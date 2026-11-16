# MICHOKS: implementación MVC y teoría de semanas 7 a 10

## Arquitectura

Navegador → rutas Express → middleware de autenticación/roles → controlador → modelo → PostgreSQL. La respuesta JSON vuelve al servicio del cliente y a la vista. Las rutas no consultan SQL; los controladores validan y coordinan; los modelos acceden a PostgreSQL. Las vistas no tienen credenciales ni acceso directo a la base.

- **Modelo:** `server/models/`, `server/config/db.js`. Persistencia real en el esquema `michoks`; consultas parametrizadas y transacciones con un mismo cliente del pool.
- **Vista:** `frontend/index.html`, `frontend/cuenta.html`, `frontend/js/components/`, componentes de `frontend/js/pages/account.js`, estilos e imágenes. La tienda conserva su diseño; el panel usa Vue 3.
- **Controlador:** `server/controllers/`. `server/routes/` declara endpoints. En el navegador, `js/app.js` inicia la tienda y `js/view.js` enlaza los eventos de la interfaz existente.
- **Servicios del cliente:** `frontend/js/services/`: API, autenticación, pedidos y administración. `frontend/js/repo.js` obtiene el catálogo exclusivamente de la API.
- **Middleware:** `server/middleware/`, `server/app.js`: identificación de peticiones, CORS, límite de solicitudes, seguridad HTTP, autenticación y manejo uniforme de errores.

## Correspondencia con la materia

| Semana | Concepto de la teoría | Aplicación verificable |
|---|---|---|
| 7 | Plataforma, cliente-servidor, responsabilidades y capas | Navegador separado del servidor; PostgreSQL en la capa de datos; credenciales solo en `.env`. |
| 8 | HTTP, JSON, API REST, Node.js, asincronía y flujo de pedidos | Express, API `/api/v1`, `fetch`, GET/POST/PUT/PATCH/DELETE, estados HTTP, CORS configurable y `X-Correlation-ID`. |
| 9 | Rutas/controladores/modelos, CRUD, validación, errores, paginación y concurrencia | Carpetas separadas, administración paginada del esquema, errores 401/403/404/409/422/503, consultas parametrizadas y transacciones de checkout. |
| 10 | Componentes, props, eventos, estado reactivo y servicios de API | Cuenta con Vue 3, componentes `OrderDetail` y `OperationsPanel` con props y eventos, formularios con `v-model`, estados de carga/error/vacío, servicios centralizados y sesión compartida en la pestaña. |

Los PDF presentan ejemplos didácticos de CaféCat y distintas alternativas de tecnología. Aquí se aplican sus principios a MICHOKS usando PostgreSQL, según la solicitud del proyecto. Los ejemplos de JSON de las semanas 8 y 9 se sustituyen por modelos de PostgreSQL. Vue se incorpora progresivamente a la cuenta y administración; no se reescribe la tienda entera con un framework.

## Dos proyectos en Visual Studio Code

Abre `MICHOKS.code-workspace`: muestra `frontend/` como proyecto de presentación y
`server/` como proyecto de aplicación y datos. Cada uno tiene su propio
`package.json`, dependencias y comando `npm run dev`. El servidor de desarrollo
del frontend publica las vistas en el puerto 5173 y reenvía `/api` al backend
Express en el 5050; la API consulta PostgreSQL. El frontend y la API conservan
el mismo origen visible para el navegador. La configuración opcional
`BACKEND_URL` permite apuntar a otro origen de API. En Render el servidor Express
sirve la misma carpeta `frontend/` y la API juntos, sin cambiar la URL publicada.
Los archivos `database/` y `data/` son recursos compartidos del repositorio,
utilizados por los scripts de inicialización del backend.

## Esquema utilizado

`database/michoks-68.sql` conserva el SQL adjunto de 68 tablas. Es la referencia de esta implementación; los diagramas y SQL anteriores en `database/` corresponden a versiones históricas. `server/config/schema.json` describe las columnas, claves primarias simples/compuestas y relaciones de ese SQL para los formularios administrativos. No se ejecutan los esquemas históricos.

`npm run db:check` comprueba las tablas y columnas esperadas en la conexión seleccionada. No modifica la base. `npm run db:init` crea el esquema únicamente si no existe y prepara los estados mínimos `Pendiente` y `Anulado`. No elimina tablas, no migra versiones anteriores y no carga datos de demostración. Si el esquema ya existe con otra estructura, hay que resolver las diferencias detectadas por `db:check` antes de operar.

## Funciones disponibles

- Registro de clientes con rol, perfil, declaración de mayoría de edad, consentimiento y preferencias dentro de una sola transacción.
- Contraseñas nuevas mediante scrypt con sal aleatoria; sesiones aleatorias con solo el hash SHA-256 almacenado en `sesion`; cierre de sesión revocable y expiración. Los hashes preexistentes deben ser compatibles con el algoritmo configurado; no se convierte texto plano ni se reemplazan credenciales existentes.
- Catálogo, filtros y carrito de la tienda usando los productos activos de PostgreSQL. Los filtros de ocasión usan categorías reservadas vinculadas a los productos mediante la relación existente `producto_categoria`.
- Los visitantes consultan el catálogo. El cliente mantiene su carrito en PostgreSQL y puede importar explícitamente una selección de la versión anterior. El servidor compara el estado del carrito antes de guardar cambios o registrar el pedido.
- Pedidos con precios consultados en PostgreSQL, dirección para delivery, historial y reserva de existencias. Una falta de stock revierte todo el pedido. No se reservan lotes caducados. El bloqueo de productos y existencias impide sobreventa entre pedidos concurrentes.
- Consulta de pedidos propios y cancelación con liberación de reservas. Un pedido con pago, factura o envío requiere intervención de la tienda.
- Administración de las 68 tablas, con formularios por columnas, relaciones documentadas, paginación y claves compuestas. Las sesiones son de solo lectura; los hashes y tokens están ocultos. Las contraseñas se generan mediante registro o el script administrativo, no mediante edición de hashes.

## Operación administrativa

El panel es una herramienta de mantenimiento de registros del esquema. Para cargar datos relacionados, crea primero los registros padre y luego sus relaciones: unidad → presentación; marca + presentación → producto; almacén → ubicación; producto + almacén → producto_almacen → existencia. El stock inicial no se inventa: debe reflejar las existencias reales del negocio antes de aceptar pedidos.

El panel incorpora operaciones de negocio además del mantenimiento de registros:

- **Registrar conteo físico:** selecciona un producto y ubicación y registra la cantidad real sin lote. Actualiza el inventario y registra el movimiento en una transacción. Rechaza cantidades inferiores a las reservas vigentes.
- **Emitir factura:** toma los detalles y precios históricos de un pedido, copia los datos fiscales de su cliente, calcula con `NUMERIC` las bases y los impuestos vigentes elegidos, y guarda cabecera, detalles e impuestos en una transacción. La numeración se introduce por el operador. La operación rechaza pedidos ya facturados y pedidos con cupones que requieren desglose de descuentos.
- **Registrar pago recibido:** verifica el método activo y el saldo de la factura, registra el pago confirmado y su aplicación. No ejecuta un cobro externo.
- **Recibir compra:** verifica la compra confirmada/parcial y las cantidades pendientes; crea recepción, detalles, entradas de inventario y stock, y cambia la compra a parcial o recibida.
- **Despachar pedido:** verifica reservas, descuenta existencias, desactiva las reservas consumidas, registra movimientos de salida, envío e historiales. Para delivery crea la copia histórica de dirección y tarifa vigente; permite asignar repartidor y vehículo del transportista.
- **Confirmar entrega:** actualiza envío y pedido, registra intento y evidencia opcional, y libera la asignación activa.

Las operaciones se completan o se revierten íntegramente. Las tarifas y tasas no se inventan: deben configurarse según el negocio. Las tablas de notas de crédito, reembolsos, cupones y demás catálogos también se mantienen desde sus formularios. Los CHECK y las claves foráneas verifican las restricciones declaradas en el esquema. La edición genérica es una herramienta administrativa; para los flujos anteriores se deben usar sus operaciones, que coordinan las tablas relacionadas. El SQL adjunto menciona un “script 02” de validación de sumas que no se adjuntó; esta versión no presupone que esté instalado.

La facturación no tiene integración con el SRI y los pagos no tienen pasarela externa. No se envían mensajes automáticamente. Las operaciones de recepción utilizan existencias sin lote; el mantenimiento por lote está disponible en sus tablas.

## Pruebas

`npm test` ejecuta validaciones, contraseñas y la protección de metadatos; omite la prueba PostgreSQL salvo activación explícita. Para integración:

```sh
TEST_DATABASE=true PGHOST=127.0.0.1 PGPORT=55439 PGUSER=michoks_test PGDATABASE=postgres npm test
```

Usa exclusivamente una base desechable: la prueba crea registros. La prueba cubre bloqueo de archivos del servidor, usuarios/roles, CRUD real, carrito, precios del servidor, rollback por falta de existencias, pedidos concurrentes, cancelación, factura con impuestos, pagos y sobrepago rechazado, recepción y exceso rechazado, despacho, delivery con asignación/evidencia y revocación de sesión. No ejecutes esta prueba sobre la base real del negocio.
