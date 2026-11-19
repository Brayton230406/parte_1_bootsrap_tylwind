# MICHOKS MVC · Node.js, Express, PostgreSQL y Vue

La versión actual usa el esquema PostgreSQL de **68 tablas** suministrado para MICHOKS. La tienda carga el catálogo desde la API y permite registrar pedidos autenticados. `/cuenta` contiene registro, inicio de sesión, pedidos, administración por roles y operaciones de facturación, pagos recibidos, recepción de compras, despacho y delivery.

## Iniciar

Para abrir los **dos proyectos** en Visual Studio Code, abre el archivo
`MICHOKS.code-workspace`. Aparecerán `MICHOKS Frontend` y `MICHOKS Backend`.
Desde la carpeta raíz, instala y ejecuta cada proyecto en una terminal distinta:

```sh
cd server
npm ci
npm run dev
```

```sh
cd frontend
npm ci
npm run dev
```

Abre **http://127.0.0.1:5173**. El frontend reenvía `/api` al backend en
`http://127.0.0.1:5050`; para cambiar este destino, configura `BACKEND_URL` al
iniciar el frontend. El backend lee el `.env` de la raíz y necesita PostgreSQL.
El esquema SQL y el catálogo inicial permanecen en las carpetas compartidas
`database/` y `data/` de la raíz. En desarrollo se deben mantener ambas terminales abiertas.

También se puede iniciar el modo integrado desde la raíz (utilizado por Render):

```sh
npm install
cp .env.example .env  # Solo si todavía no tienes un .env configurado.
# Edita .env con el host, puerto, base, usuario y contraseña de tu PostgreSQL.
npm run db:check
# Si necesitas crear el esquema en una base nueva o preparar estados mínimos:
npm run db:init
npm start
```

Abre **http://127.0.0.1:5050**. El servidor requiere Node.js 22 o superior y PostgreSQL 14 o superior. El archivo `.env` está excluido de Git. Nunca se deben colocar credenciales en JavaScript del navegador. Live Server y el antiguo servidor HTTP estático no ejecutan la API; `python3 INICIAR-LOCAL.py` ahora inicia el servidor MVC.

## Administrador

Crea una cuenta administrativa desde la terminal, enviando su contraseña por entrada estándar:

```sh
# En zsh, solicita la clave sin mostrarla; no la escribas como argumento.
read -s 'MICHOKS_ADMIN_PASSWORD?Contraseña del nuevo administrador: '
printf '%s' "$MICHOKS_ADMIN_PASSWORD" | npm run admin:create -- admin admin@tudominio.com Nombre Apellido
unset MICHOKS_ADMIN_PASSWORD
```

Usa un correo real del negocio y una contraseña de 10 a 128 caracteres. El registro público crea únicamente clientes. El panel administrativo se muestra al iniciar sesión con un perfil activo de administrador.

## Acceso y catálogo

- **Visitante:** consulta productos, precios y disponibilidad. Puede ingresar o crear una cuenta.
- **Cliente:** mantiene el carrito en PostgreSQL y registra, consulta o cancela sus pedidos pendientes. En el carrito puede recuperar una selección de la versión anterior.
- **Administrador:** usa **Inventario** para crear una ubicación y registrar el conteo físico de cada producto. **Operaciones** reúne facturación interna, pagos recibidos, recepción y entrega. **Tablas** da acceso al mantenimiento del esquema.
- **Seguridad:** permite cambiar la contraseña y cerrar las demás sesiones.

En una base nueva, después de `npm run db:init`, usa `npm run db:import-catalog` para importar el catálogo existente. Luego registra las existencias reales desde **Inventario** para habilitar compras.

## Arquitectura y alcance

Lee [la guía MVC y la correspondencia con semanas 7–10](docs/MVC-Y-SEMANAS.md) y [la referencia de API](docs/API.md). Incluyen estructura, operaciones, configuración y límites de los flujos administrativos. Los archivos de bases y auditorías anteriores se conservan como antecedentes; el esquema actual es `database/michoks-68.sql`.

La [guía de semana 11](docs/SEMANA-11.md) explica Sequelize, los esquemas y la API administrativa de las 68 tablas. Para probarla en VS Code, importa `server/thunder-collection.json` en Thunder Client o abre `server/pruebas.http` con una extensión compatible; sustituye los valores de ejemplo por credenciales de prueba sin guardarlas en el repositorio.

`npm test` ejecuta las pruebas unitarias. Las pruebas de PostgreSQL requieren `TEST_DATABASE=true` y una base temporal, porque crean registros.

## Inventario de demostración

`npm run db:demo` carga 10 unidades por producto activo en el almacén **MICHOKS · Demostración**, ubicación **DEMO-01**, y registra cada entrada. Las cantidades son ficticias para el proyecto académico. Repetir el comando conserva las existencias ya creadas, incluidas las consumidas por pedidos.

El registro público crea clientes con contraseña. El administrador se crea con `npm run admin:create` y tiene acceso a inventario y operaciones. Las credenciales locales y los datos de usuarios se configuran en cada instalación.

## Publicación

Este proyecto necesita un servicio que ejecute Node.js y una base PostgreSQL accesible desde ese servicio. GitHub almacena el código y ejecuta las pruebas de CI. GitHub Pages sirve archivos estáticos y requiere un backend externo para ofrecer inicio de sesión y compras.

Para una instalación nueva, configura las variables de `.env.example`, ejecuta `npm ci`, `npm run db:init`, `npm run db:import-catalog` y, si deseas datos de ejemplo, `npm run db:demo`. Usa `npm start` como comando de arranque. Configura `HOST=0.0.0.0` y el `PORT` asignado por el proveedor. La conexión PostgreSQL se configura mediante `DATABASE_URL` o las variables `PG*`.

La API devuelve diez productos por página por defecto. El catálogo solicita la siguiente página cuando se elige «Ver más productos». La búsqueda, categoría, ocasión, presupuesto y orden se consultan al servidor. La cuenta guarda los carritos en PostgreSQL.

La configuración para Render está en [render.yaml](render.yaml). Consulta [la guía de Render](docs/RENDER.md) para las variables, datos de demostración y duración del plan gratuito.
