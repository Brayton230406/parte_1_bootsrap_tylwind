# MICHOKS — Tu próximo brindis

Catálogo de licorería con diseño adaptable, carrito persistente y consultas por WhatsApp. El sitio funciona con HTML5, CSS3 y módulos JavaScript ES6, sin compilación ni dependencias de ejecución. Los precios son referenciales; no procesa pagos ni confirma pedidos.

## Ejecutar

Abre la carpeta con Visual Studio Code y usa **Live Server** sobre `index.html`. También puedes ejecutar desde esta carpeta:

```sh
python3 -m http.server 5500 --bind 127.0.0.1
```

Visita http://127.0.0.1:5500. Usa un servidor HTTP: abrir el HTML con `file://` impide cargar los módulos y el JSON en los navegadores habituales.

## Estructura y responsabilidades

```text
index.html              Estructura semántica y formularios
assets/styles.css       Estilos y componentes adaptables
assets/fonts/           Fuentes locales y sus licencias
assets/products/        Fotografías y archivo de procedencia
assets/michoks-logo.svg  Logotipo
assets/michoks-bar.jpg   Fotografía principal
data/productos.json     Única fuente del catálogo
js/navigation.js        Acceso al catálogo, cierre de paneles y foco
js/app.js               Inicialización, carga y recuperación de errores
js/repo.js              Lectura y validación del catálogo JSON
js/cart.js              Operaciones del modelo y cálculo en centavos
js/storage.js           Persistencia y recuperación versionada
js/view.js              Controlador de eventos y renderizado de la interfaz
js/components.js        Presentación compartida y foco de los diálogos
js/validation.js        Expresiones regulares y mensajes accesibles
js/tests/rubrica.mjs     Comprobaciones automatizadas de la rúbrica
README.md               Instrucciones y evidencias de la rúbrica
```

La arquitectura separa los datos y las operaciones del modelo de la presentación. El controlador conecta los eventos con el modelo y actualiza la vista. Los componentes reutilizan imágenes, formato de moneda, normalización, escape de texto y navegación modal. `.github/` conserva el despliegue de GitHub Pages; `.git/` contiene el historial. Los cambios locales requieren publicarse para que aparezcan en el sitio remoto.

## Catálogo y carrito

Edita `data/productos.json` para cambiar productos. Cada objeto requiere `id` entero único, `name`, `category`, `price` numérico no negativo, `size`, `description`, `occasions` (regalo, cena, cocteles o compartir) e `image` con ruta local `assets/products/`. La aplicación valida el formato, rechaza IDs repetidos y ofrece recargar si la petición o el parseo fallan. El texto se escapa antes de insertarlo en HTML; los mensajes de consulta conservan el texto original.

El catálogo contiene 284 productos en 11 categorías y permite búsqueda, filtros por presupuesto y ocasión, ordenación, vista rápida y mostrar más. El carrito añade productos, modifica cantidades entre 1 y 99, elimina, vacía y deshace la última eliminación. Los totales se calculan sumando centavos enteros. El total permanece accesible desde una barra en móvil y el carrito se sincroniza entre pestañas.

## Formularios y validaciones

La consulta por WhatsApp no requiere introducir datos personales en el sitio. Los campos opcionales se validan cuando se completan:

| Campo | Regla |
| --- | --- |
| Cantidad | Regex de enteros entre 1 y 99; rechaza decimales, cero y negativos. |
| Nombre | De 2 a 60 caracteres; letras Unicode, espacios, apóstrofos, puntos y guiones. |
| Celular | Formato ecuatoriano `0991234567`, `593991234567` o `+593991234567`; permite separadores habituales. |
| Correo | Una dirección sin espacios, con usuario, dominio y extensión. |
| Dirección | De 8 a 160 caracteres; se utiliza únicamente al seleccionar domicilio. |
| Indicaciones | Hasta 300 caracteres; rechaza etiquetas HTML y caracteres de control. |

Los errores son dinámicos, asociados mediante `aria-describedby`, anunciados con `aria-live` y marcados con `aria-invalid`. La consulta no se abre si hay errores; se abre la sección correspondiente y se enfoca el primer campo inválido. Los datos de contacto permanecen en memoria durante la visita; no se guardan en las copias persistentes del carrito. La dirección es una referencia para consultar, no una confirmación de cobertura.

## Las cuatro estrategias de almacenamiento

| Estrategia | Uso y duración |
| --- | --- |
| localStorage | Copia persistente y eventos de sincronización entre pestañas del mismo origen. |
| sessionStorage | Copia de recuperación durante la sesión de la pestaña. |
| IndexedDB | Copia persistente asíncrona en la base `michoks`, almacén `state`. |
| Cookies | Solo con consentimiento: copia compacta de IDs y cantidades durante 30 días, con `SameSite=Lax` y `Secure` al usar HTTPS. |

Cada copia incluye `version`, `updatedAt` y `cart`. Al iniciar se leen las cuatro, se descartan copias corruptas o con cantidades/IDs inválidos y se recupera la válida más reciente. Se conserva compatibilidad con el carrito antiguo de localStorage. Una selección vacía también tiene versión, evitando recuperar compras que se hayan eliminado. Las escrituras a IndexedDB se serializan. Si un mecanismo está bloqueado, se usan los disponibles y la aplicación sigue operativa en memoria. Si el navegador elimina todas las copias, no existe un servidor que pueda restaurarlas.

Para comprobar cada mecanismo, añade un producto, espera a que se complete la escritura y elimina las otras tres copias desde las herramientas de desarrollo antes de recargar. Para sessionStorage, recarga la misma pestaña. Vaciar el carrito desde la interfaz actualiza las cuatro copias.

## Evidencias para la rúbrica

| Criterio | Implementación comprobable |
| --- | --- |
| HTML5 semántico | `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, `form`, `fieldset` y `dialog`; un H1 y encabezados de sección identificados. |
| CSS3 adaptable | Grid/Flex, tamaños fluidos, cuadrícula mobile-first con puntos principales de 480, 768 y 1024 px; carrito adaptado a móvil y escritorio. |
| Componentes y ARIA | Tarjetas y presentación compartida; menú con `aria-controls`/`aria-expanded`; filtros con `aria-pressed`; diálogos nativos con nombre accesible, Tab, Escape y retorno de foco. |
| Regex | Reglas en `validation.js`, errores asociados a campos y bloqueo de consultas inválidas. |
| JSON | Catálogo local, validación de esquema, lectura asíncrona y recuperación de errores. |
| Carrito | Añadir, actualizar, eliminar, deshacer, vaciar y totales dinámicos. |
| Persistencia | Cuatro estrategias, copias versionadas y recuperación. |
| POUR | Texto alternativo y contraste; teclado y foco; etiquetas y errores comprensibles; HTML nativo y ARIA compatibles con tecnologías de asistencia. |
| Modularidad | Módulos ES6 con separación de datos, modelo, controlador, componentes, validación y persistencia. |
| Presentación | Recursos locales, identidad visual coherente y este README. |

La evaluación automática ayuda a encontrar fallos; la calificación y la accesibilidad integral requieren también revisión humana con teclado, zoom y lector de pantalla.

## Comprobación manual

1. Usa Tab desde el enlace “Saltar al catálogo”. En móvil abre el menú, recorre sus enlaces y ciérralo con Escape.
2. Abre un detalle y el carrito; verifica Tab/Shift+Tab, Escape y retorno al botón que los abrió.
3. Añade dos productos, cambia cantidades, revisa subtotales, elimina, deshaz y vacía.
4. Introduce `1.5` como cantidad y datos de contacto inválidos. Confirma mensajes, `aria-invalid` y foco; corrige los valores y prepara la consulta.
5. Revisa el texto de WhatsApp, entrega y datos opcionales. El mensaje requiere que el usuario lo envíe en WhatsApp.
6. Recarga y abre otra pestaña para comprobar recuperación y sincronización. Repite las pruebas de recuperación de las cuatro estrategias.
7. Revisa 320, 390, 480, 768, 1024 y 1440 px, zoom al 200 %, movimiento reducido y lector de pantalla. Confirma que no haya desbordamiento horizontal ni pérdida de controles.

Referencia para el marcado de errores: [MDN — aria-invalid](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-invalid).

## Pruebas automatizadas

Se verificaron **31 comprobaciones**, incluyendo recuperación independiente desde los cuatro almacenamientos, formulario válido e inválido, operaciones del carrito, sincronización entre pestañas y axe en 320, 390, 480, 768, 1024 y 1440 px. El HTML se validó sin errores. Las pruebas de axe se ejecutan con el catálogo y el carrito abiertos; la navegación por Tab permanece dentro del diálogo.

Para repetirlas en macOS/Linux con Node.js instalado, las dependencias de pruebas se instalan fuera del proyecto:

```sh
mkdir -p /tmp/michoks-qa
npm install --prefix /tmp/michoks-qa @playwright/test @axe-core/playwright html-validate
cp js/tests/rubrica.mjs /tmp/michoks-qa/rubrica.mjs
/tmp/michoks-qa/node_modules/.bin/playwright install chromium
/tmp/michoks-qa/node_modules/.bin/html-validate index.html
node /tmp/michoks-qa/rubrica.mjs "$PWD"
```

El servidor temporal de pruebas usa el puerto 4173; debe estar libre. Las herramientas de prueba no son necesarias para ejecutar el sitio. La revisión manual con lector de pantalla y zoom sigue siendo parte de la evaluación de POUR.

## Identidad visual y navegación al catálogo

El logotipo propio de MICHOKS está en `assets/michoks-logo.svg`: un monograma M con una copa integrada y una estrella. Es vectorial, escalable y se usa como símbolo en la cabecera y como favicon. El nombre de la marca permanece como texto para conservar legibilidad y accesibilidad.

“Descubrir el catálogo”, “Seguir explorando” y los enlaces al catálogo cierran los diálogos abiertos, restablecen búsqueda/categoría/ordenación y llevan el foco al encabezado del catálogo. La navegación se inicializa antes de cargar los productos. Las pruebas verifican el recorrido desde un carrito vacío con filtros activos, además de la carga del logo.

La interfaz incluye tarjetas con bordes suaves, búsqueda destacada, filtros activos con limpieza directa, botones redondeados y cabecera adaptada a móvil. Conserva los formularios accesibles, las cuatro copias de almacenamiento y la validación de la rúbrica.

## Auditoría para estudiar

Consulta [AUDITORIA-ESTUDIO.md](AUDITORIA-ESTUDIO.md) para el análisis criterio por criterio, las limitaciones de la evidencia y ejemplos de ARIA, CSS/colores, JSON, arquitectura, cookies y las cuatro estrategias de almacenamiento. Incluye preguntas para preparar la exposición.

## Auditoría de la página actualizada

Consulta [AUDITORIA-PAGINA-WEB.md](AUDITORIA-PAGINA-WEB.md) para revisar navegación, contenido, diseño y experiencia de compra. Las opciones nuevas tienen precios propuestos en USD sujetos a confirmación. La misión y visión son textos propuestos de marca.

## Aplicación web progresiva (PWA)

MICHOKS incorpora `manifest.webmanifest`, iconos PNG y un service worker (`sw.js`) con caché versionada de HTML, estilos, fuentes, módulos, catálogo y fotografías locales. Tras una primera visita con conexión y la activación del worker, permite cargar el catálogo y modificar el carrito sin internet. WhatsApp requiere conexión y los precios siguen sujetos a confirmación.

En navegadores compatibles se puede instalar desde el menú del navegador; el pie muestra “Instalar MICHOKS” cuando el navegador ofrece la instalación. En iOS se utiliza Compartir → Añadir a pantalla de inicio. La instalación depende del navegador y requiere HTTPS o localhost. No funciona como PWA al abrir el HTML mediante `file://`.

Después de cambiar recursos ejecuta `node js/tests/build-pwa.mjs` y guarda el nuevo `sw.js`. La nueva versión del worker se activa al cerrar las pestañas de la versión anterior y volver a abrir MICHOKS; así no se mezclan archivos de distintas versiones. El catálogo sin conexión corresponde a la versión descargada.

GitHub Actions valida el HTML, comprueba que la caché esté actualizada, ejecuta las 31 comprobaciones de interfaz y las pruebas de instalación/offline antes de desplegar. Publica `index.html` y una copia compatible en `michoks.html`, conservando el enlace antiguo. Las pruebas PWA se ejecutan bajo la subcarpeta real de GitHub Pages.

Referencia: [MDN: instalación de aplicaciones web progresivas](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## Confirmación de edad al entrar

La primera visita muestra una pregunta de mayoría de edad. El contenido y la carga del catálogo permanecen bloqueados hasta pulsar “Sí, tengo 18 años o más”. La confirmación se conserva en localStorage (`michoks-age-confirmed`); si está restringido, se intenta sessionStorage. Si ambos están bloqueados se solicita nuevamente en la siguiente visita. “No” lleva a [Vita Ecuador](https://www.vita.com.ec/) y no guarda aprobación. Es una declaración del visitante, no una verificación documental de identidad. Al borrar los datos del navegador se vuelve a preguntar. Las pruebas comprueban ambos recorridos, persistencia, teclado y accesibilidad en seis tamaños.

## Catálogo ampliado y movimiento elegante

La versión actual incluye **284 opciones** y **9 packs**. La distribución comprobada es:

| Categoría | Opciones |
| --- | --- |
| Whisky | 30 |
| Vinos | 30 |
| Cervezas | 30 |
| Cócteles | 7 |
| Zhumir | 17 |
| Tequilas | 30 |
| Vodkas | 30 |
| Rones | 30 |
| Gins | 30 |
| Licores | 30 |
| Aperitivos | 20 |

Ocho categorías alcanzan 30 opciones. Aperitivos, Zhumir y cócteles se amplían con las referencias y fotografías disponibles, sin duplicar artículos para alcanzar una cifra. Las presentaciones provienen del catálogo de referencia; los precios nuevos son propuestas en USD y requieren confirmación comercial. Los packs tienen su cantidad explícita y una insignia. El catálogo muestra 12 productos por bloque para mantener la página manejable.

Los encabezados y las tarjetas aparecen con una animación breve cuando entran en pantalla, tanto al bajar como al subir. Al pasar el ratón sobre una tarjeta, la botella se eleva e inclina ligeramente; las tarjetas de Descubre también tienen un movimiento discreto. El contenido nunca depende de una animación para ser visible. La preferencia `prefers-reduced-motion` desactiva el movimiento, y la entrada de foco detiene las animaciones de las tarjetas para facilitar el teclado. No se capturan ni bloquean los eventos de desplazamiento.

El módulo `js/motion.js` usa IntersectionObserver y Web Animations; `assets/styles.css` define las microinteracciones. La PWA precarga el catálogo ampliado y sus fotografías después de la primera visita conectada. Esto requiere descargar más imágenes que la versión anterior; las nuevas fotos se limitan a 480 píxeles.

## Preferencias de cookies

Después de confirmar la edad, la primera visita permite aceptar o denegar la cookie funcional `michoks_cart` (30 días). No se lee ni escribe esta copia sin aprobación; la denegación elimina una copia anterior. El carrito continúa usando localStorage, sessionStorage e IndexedDB, tal como explica el aviso. La elección se recuerda con `michoks-cookie-consent`; el botón “Preferencias de cookies” del pie permite cambiarla. Aceptar activa la copia del carrito y revocar la elimina inmediatamente. Escape deniega. El aviso utiliza un diálogo nativo accesible, foco contenido, botones equivalentes y colores de MICHOKS. Las pruebas verifican rechazo, persistencia, aceptación posterior, revocación y accesibilidad en seis tamaños.

## Modo oscuro

El botón de sol/luna de la cabecera alterna entre modo claro y oscuro. La primera visita utiliza la preferencia del sistema; una elección manual se recuerda con `michoks-theme` en localStorage, con sessionStorage como alternativa. La elección se aplica antes de cargar el CSS para evitar destellos y se sincroniza entre pestañas. Las superficies del catálogo, Descubre, vista rápida, carrito, campos y errores se adaptan; las fotos mantienen fondos claros para conservar legibilidad. Los avisos de edad y cookies conservan su identidad oscura en ambos modos. Las pruebas comprueban persistencia, sincronización y contraste en seis tamaños.
