# Evolución del esquema PostgreSQL

La instalación existente usa `database/michoks-68.sql` como esquema inicial, creado por `npm run db:init` únicamente si aún no existe. Es un punto de partida histórico, no una migración Sequelize aplicada automáticamente a bases existentes.

Los modelos Sequelize en `server/orm/sequelize.js` representan las 68 tablas existentes y se usan para las lecturas administrativas. No se llama a `sync()` ni se alteran tablas automáticamente. Las escrituras administrativas y los flujos que requieren transacciones usan los repositorios SQL parametrizados existentes.

Para futuros cambios: diseña un archivo de migración versionado, pruébalo contra una base desechable y respalda la base de destino. Registra las migraciones ya aplicadas antes de adoptar una herramienta de migración. No ejecutes un esquema inicial sobre una base con datos ni uses opciones de reset en producción.
