# Semana 11: persistencia en MICHOKS

MICHOKS utiliza PostgreSQL por sus relaciones y transacciones ACID. En la capa de datos, `server/config/db.js` configura el pool de `pg`, y `server/orm/sequelize.js` mapea las 68 tablas existentes en modelos Sequelize sin crear ni alterar tablas. Los listados administrativos usan `findAndCountAll`, paginación y selección de columnas seguras. Las operaciones de escritura y los procesos de pedido, inventario y facturación siguen usando SQL parametrizado y transacciones del repositorio existente: la incorporación del ORM es gradual, no una conversión completa.

El MVC mantiene rutas → middleware → controladores → modelos/repositorios → PostgreSQL. Las variables de conexión permanecen en `.env`, fuera de Git. Los controles de entrada, claves, relaciones, excepciones y respuestas HTTP siguen aplicándose en el backend y la base.

## Una API por tabla

La API reutiliza rutas genéricas, resolviendo cada nombre de tabla contra la lista cerrada de 68 tablas; no genera 68 archivos repetidos. Todas las rutas requieren una sesión con rol administrador:

- `GET /api/v1/admin/esquema`: lista los esquemas disponibles y las relaciones.
- `GET /api/v1/admin/esquema/producto`: muestra columnas y claves de una tabla.
- `GET /api/v1/admin/producto?limit=10&offset=0`: lista registros.
- `GET /api/v1/admin/producto/registro?id_producto=1`: consulta un registro por su clave primaria. Para una clave compuesta se envía cada campo como parámetro.
- `POST /api/v1/admin/producto`: crea un registro con JSON.
- `PUT` o `PATCH /api/v1/admin/producto`: reemplaza o actualiza con `{ "key": {...}, "data": {...} }`.
- `DELETE /api/v1/admin/producto`: elimina con `{ "key": {...} }`.

Sustituye `producto` por cualquier tabla declarada en `server/config/schema.json`. Hay restricciones deliberadas: `sesion` es de solo lectura; los hashes y tokens se ocultan; los usuarios se crean por registro. Las operaciones de negocio deben usar sus endpoints específicos para conservar transacciones y reglas. Las claves compuestas se envían completas en `key`.

## Esquema y migraciones

`database/michoks-68.sql` es el punto de partida existente. No se ejecutan `sync`, borrados ni migraciones automáticas al iniciar el ORM. Lee `server/migrations/README.md` antes de evolucionar el esquema. Las alternativas SQL y NoSQL de la teoría se estudian como opciones; este proyecto no requiere instalar otras bases para trabajar con PostgreSQL.
