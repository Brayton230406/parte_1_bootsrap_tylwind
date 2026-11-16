# MICHOKS en Render

El Blueprint de la raíz crea un servicio Node.js y una base PostgreSQL en la misma región. La API, el cliente y el servidor se publican juntos. Los cambios en la rama conectada activan nuevos despliegues.

El arranque prepara el esquema de 68 tablas y, si el catálogo está vacío, importa los 284 productos. En una instalación nueva crea el inventario de demostración autorizado de 10 unidades por producto y el administrador `admin_michoks`. Se requiere configurar `INITIAL_ADMIN_PASSWORD` como secreto en Render, con al menos 10 caracteres. El token JWT utiliza un secreto generado por Render.

La inicialización conserva los productos, el inventario y las cuentas existentes en despliegues posteriores. Para crear cuentas de cliente se usa el formulario público.

## Datos entre servicios

PostgreSQL de Render es una base independiente de las bases de Railway y del equipo local. La configuración inicial importa el catálogo del repositorio. Los usuarios, pedidos y cambios de inventario de otras bases requieren una migración explícita si se desea conservarlos.

El Blueprint selecciona los planes gratuitos para la demostración. La base gratuita de Render tiene una duración limitada de 30 días y debe actualizarse a un plan pagado para evitar su eliminación después del plazo y período de gracia. Revisa los detalles y las condiciones vigentes en https://render.com/docs/free.

## Variables principales

- `DATABASE_URL` apunta a la conexión interna PostgreSQL proporcionada por Render.
- `JWT_SECRET` se genera durante el despliegue.
- `INITIAL_ADMIN_PASSWORD` se configura en la interfaz de Render y debe guardarse de forma privada.
- `INITIAL_DEMO_INVENTORY=true` habilita el stock ficticio inicial.
- `HOST=0.0.0.0` y el puerto asignado por Render permiten recibir tráfico.
