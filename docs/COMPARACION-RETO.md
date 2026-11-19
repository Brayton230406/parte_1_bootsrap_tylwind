# Comparación con los proyectos de referencia

Los archivos recibidos describen una aplicación de gimnasio. Se trasladan sus principios de arquitectura a MICHOKS, conservando el modelo y las reglas de la tienda, sin copiar tablas de gimnasio, credenciales, imágenes ni datos de sus autores.

| Tema | MICHOKS |
| --- | --- |
| Proyectos separados | `frontend/`, `server/` y espacio de trabajo `MICHOKS.code-workspace`. |
| MVC y capas | Rutas y middleware → controladores → modelos → factoría y repositorios → PostgreSQL; el navegador usa servicios, componentes, vistas y controladores. |
| Persistencia y ORM | El original incorpora modelos Sequelize para consultas administrativas. La copia separada `MICHOKS-Prisma` incluye el esquema Prisma para las 68 tablas y consultas administrativas con Prisma Client. Las escrituras y transacciones de negocio usan los repositorios SQL parametrizados existentes; la migración a ORM no es total. |
| Esquemas y API por tabla | Panel privado y rutas genéricas para cada tabla incluida en la lista blanca: esquema, lista, registro por clave y operaciones CRUD sujetas a las restricciones de la tabla. Las claves compuestas se envían en campos separados. |
| Roles | JWT y sesión revocable; las rutas administrativas verifican el rol administrador. El registro público crea clientes. |
| Tienda | Catálogo paginado, precios verificados en el servidor, carrito y pedido persistentes, reserva y cancelación transaccionales. |
| Pruebas | `npm test`; las pruebas de integración solo deben ejecutarse contra una base desechable. `server/thunder-collection.json` se puede importar en Thunder Client y `server/pruebas.http` en REST Client. |
| Semana 9 | Express, rutas, controladores, modelos, CRUD, validaciones y errores. |
| Semana 10 | Componentes Vue para cuenta y administración, props, eventos, estado y servicios de API; la tienda conserva sus módulos JavaScript existentes. |
| Semana 11 | PostgreSQL, pools, ORM, esquema, restricciones y transacciones; el SQL existente es la referencia de creación inicial. No se ejecutan migraciones automáticamente sobre bases existentes. |

La referencia de los compañeros usa Prisma para toda su capa de datos y tiene archivos de migración propios. MICHOKS aún no tiene esa conversión integral ni una línea base de Prisma Migrate; no se afirma equivalencia completa. El esquema tiene restricciones SQL que deben conservarse al preparar una migración, y los flujos de inventario y pedidos deben mantenerse atómicos.
