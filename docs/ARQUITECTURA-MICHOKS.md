# Arquitectura de MICHOKS

## Estilos arquitectónicos

MICHOKS es un monolito modular con comunicación cliente-servidor y una API REST versionada. Utiliza tres capas.

| Capa | Responsabilidad | Implementación |
| --- | --- | --- |
| Presentación | Catálogo, formularios, vistas y consumo HTTP | HTML, CSS, JavaScript y Vue 3 |
| Aplicación | Rutas, permisos, validación y operaciones | Node.js y Express |
| Datos | Persistencia e integridad | PostgreSQL |

El esquema michoks conserva las 68 tablas originales, incluidas usuario, rol y usuario_rol. El ejemplo dbo de la consigna se adapta a este esquema.

## MVC

Los controladores reciben y validan las peticiones y coordinan operaciones. Los modelos ofrecen las operaciones del dominio. Las vistas muestran resultados y envían acciones mediante los servicios HTTP del navegador.

La ruta de una operación es navegador → Express → ruta → middleware → controlador → modelo → repositorio → PostgreSQL. La respuesta vuelve como JSON y la vista actualiza su estado.

## Repository, Factory y Singleton

Los módulos de server/repositories encapsulan SQL parametrizado y transacciones. Los modelos en server/models acceden a ellos mediante repositoryFactory. La fábrica selecciona implementaciones registradas y rechaza nombres desconocidos.

server/config/db.js exporta una instancia compartida del pool PostgreSQL. La caché de módulos ES proporciona una instancia por proceso, aplicando Singleton al recurso de conexión. Cada transacción reserva un cliente, confirma o revierte y lo libera.

El modelo actual ofrece funciones de dominio. La consigna adicional de objetos de entidad con getters y setters requiere completar la entidad Producto.

## Servidor y middleware

server/server.js levanta Express y atiende el cierre del proceso. server/app.js configura cabeceras, CORS, JSON, límites de solicitudes, archivos públicos y manejo central de errores. server/routes/api.js monta los recursos bajo /api/v1.

Los valores de usuario llegan a PostgreSQL mediante parámetros. Los nombres de tablas administrativas proceden de una lista cerrada. La sanitización debe preservar contraseñas y texto legítimo y las vistas deben escapar los valores al renderizar.

## Identidad

El registro público crea un usuario y su perfil de cliente dentro de una transacción. Las contraseñas se almacenan con scrypt y sal aleatoria. Los administradores se crean mediante el comando administrativo. Los permisos se comprueban en el servidor usando los roles activos de PostgreSQL.

La versión actual usa tokens opacos revocables. La consigna nueva requiere sustituirlos por JWT firmados, comprobando algoritmo, emisor, audiencia y expiración.

## Contrato HTTP

| Código | Uso |
| --- | --- |
| 200 | Consulta o actualización completada |
| 201 | Recurso creado, con representación cuando corresponde |
| 204 | Operación completada sin cuerpo |
| 400 | JSON mal formado |
| 401 | Sesión ausente, inválida o expirada |
| 403 | Usuario autenticado sin permiso |
| 404 | Recurso inexistente |
| 409 | Conflicto de estado, relaciones o inventario |
| 422 | Datos inválidos para la operación |
| 429 | Límite de solicitudes |
| 503 | Base de datos indisponible |

POST no implica automáticamente ausencia de cuerpo. Una creación con 201 puede devolver el recurso creado. La ausencia de permisos de un usuario autenticado corresponde a 403.

## Configuración

.env contiene las credenciales y opciones y está excluido de Git. .env.example documenta las variables públicas. El backend configura HOST, PORT, PostgreSQL, CLIENT_ORIGIN y SESSION_HOURS.

La nueva consigna indica puerto 5050. El cambio debe coordinar servidor, iniciador local, documentación y pruebas.

## Inventario académico

DEMO-01 contiene 10 unidades iniciales por cada uno de los 284 productos, autorizadas para demostración. Cada entrada tiene un movimiento de inventario. El comando db:demo es repetible y conserva existencias ya creadas.

## Rendimiento y entrega pendiente

La API ya implementa LIMIT y OFFSET en PostgreSQL. Para verificar el objetivo de 3.000 ms deben medirse la respuesta HTTP y el renderizado en una base de prueba de 10.000 productos. Se deben registrar entorno, tamaño de página, repeticiones y percentiles.

La ampliación de la consigna aún requiere lo siguiente.

- JWT y pruebas de firma, expiración y revocación.
- Enrutamiento SPA entre tienda, acceso y cuenta sin recarga del documento.
- Paginación centralizada de 10 registros y catálogo que solicite una página por vez.
- PUT para reemplazo de recursos junto con GET, POST, PATCH y DELETE.
- Rutas separadas por módulo y validación de tipo JSON.
- Puerto 5050 en los puntos de entrada.
- Entidad Producto y carga reproducible de 10.000 registros.
- Medición de rendimiento y publicación en GitHub.

Este estado diferencia lo implementado de los requisitos pendientes para que la documentación pueda verificarse contra el código.
