# Auditoría de la página web MICHOKS

Esta auditoría evalúa la versión local actualizada de `index.html`: contenido, navegación, experiencia de compra, diseño y accesibilidad. No equivale a una certificación WCAG ni a una calificación oficial de la rúbrica. La versión pública de GitHub Pages requiere publicar estos cambios.

## Objetivo y público

La página presenta una licorería para personas adultas y permite explorar productos, preparar una selección y consultarla por WhatsApp. El recorrido termina en una consulta: no procesa pagos, no reserva inventario y no confirma automáticamente un pedido.

## Organización de la página

| Apartado | Función para el visitante | Comprobación |
| --- | --- | --- |
| Cabecera | Identifica MICHOKS y da acceso a catálogo, Descubre, Acerca de nosotros y carrito. | Marca local, enlaces y menú móvil. |
| Inicio | Presenta la propuesta y permite entrar al catálogo. | El botón mueve el foco al encabezado del catálogo. |
| Catálogo | Permite comparar nombre, presentación y precio y añadir productos. | Datos cargados desde JSON, búsqueda y filtros. |
| Descubre | Orienta la elección según la ocasión. | Cuatro botones filtran productos etiquetados para regalo, cena, cócteles o compartir. |
| Acerca de nosotros | Explica el propósito y la aspiración de la marca. | Navegación hacia misión y visión, con foco en su encabezado. |
| Pie | Repite los accesos y muestra el mensaje de consumo responsable. | Enlaces al catálogo, Descubre y Acerca de nosotros. |
| Carrito | Resume cantidades, precios y total antes de consultar. | Añadir, editar, eliminar, vaciar, deshacer y persistir. |

## Catálogo ampliado

La página contiene **284 productos en 11 categorías**. Entre las opciones del catálogo se encuentran: Black Label, Jack Daniel’s Old No. 7, Bacardí Oakheart, Havana Club Añejo Reserva, Absolut, Tanqueray London Dry, Bombay Sapphire, Baileys Original, Jägermeister Original, Don Julio Blanco, Martini Rosso, Trapiche Malbec y Havana Club Añejo Blanco.

Cada opción tiene una fotografía local distinta, nombre, presentación, categoría y precio. Las referencias de las fotografías están registradas en [sources.json](assets/products/sources.json); los datos de venta se editan en [productos.json](data/productos.json). El registro de procedencia documenta el origen de la imagen y no acredita por sí mismo una licencia de uso.

Los precios de las nuevas opciones son **propuestas en USD**, no precios oficiales verificados de MICHOKS. La página lo declara junto al catálogo y pide confirmar presentación y disponibilidad en la vista rápida. Antes de operar comercialmente, el responsable debe confirmar precios, inventario y presentaciones.

Para facilitar la elección hay búsqueda por nombre o categoría, ordenación por precio o nombre, categorías con contadores y presupuestos hasta $20, $40 y $70. Los criterios pueden combinarse. La selección por ocasión se muestra como filtro activo; “Limpiar filtros” recupera la selección general. La página muestra inicialmente 12 productos y “Mostrar más” permite ver los restantes sin cambiar de página. El contador indica cuántos se muestran y cuántos coinciden.

## Descubre y Acerca de nosotros

Descubre contiene cuatro tarjetas con fotografías, títulos, explicaciones y acciones concretas. No se limita a desplazar la página: cada acción aplica un criterio al catálogo y mueve el foco a su encabezado. También hay accesos rápidos a rones, gins y licores.

La misión propuesta consiste en acercar una selección diversa a personas adultas mediante información clara, atención cercana y una compra sencilla que promueva el consumo responsable. La visión propuesta es convertirse en una licorería de referencia por confianza, variedad y cuidado de cada experiencia. Son textos de marca redactados para este proyecto a petición del usuario; no describen certificaciones ni una historia empresarial comprobada.

## Diseño y experiencia

La identidad combina el logo local de MICHOKS, fondos claros, superficies oscuras y acentos verdes. Las tarjetas de Descubre usan variaciones de fondo para diferenciar las ocasiones; misión y visión utilizan tarjetas oscuras con jerarquía visual compartida. Los componentes conservan una presentación consistente de títulos, imágenes, precios y acciones.

El CSS utiliza Grid y Flex y adapta las nuevas tarjetas de una a dos y cuatro columnas. La misión y visión pasan de una a dos columnas. Los filtros se reorganizan según el espacio disponible. Las imágenes declaran dimensiones y las nuevas fotografías se descargaron a tamaño limitado para evitar depender de servidores externos durante la visita. El catálogo usa carga diferida de imágenes.

El carrito mantiene el total visible en móvil. Las vistas modales se pueden cerrar con Escape y conservan el foco dentro del panel. Las cantidades se validan y los errores explican cómo corregirlas. La selección se recupera desde almacenamiento web y puede sincronizarse entre pestañas.

## Accesibilidad observada

Hay regiones HTML semánticas, un único h1, encabezados de sección, controles con nombres accesibles, etiquetas de formularios, anuncios de resultados, estados de filtros y errores asociados mediante ARIA. Las imágenes decorativas de Descubre usan alt vacío porque el texto de la tarjeta comunica su propósito. El logo y las fotografías del catálogo tienen nombres accesibles.

La navegación al catálogo y a Acerca de nosotros coloca el foco en el encabezado correspondiente. Se respeta la preferencia de movimiento reducido. La revisión automática detecta problemas comunes; no garantiza que todas las interacciones sean comprensibles con un lector de pantalla o que el sitio cumpla íntegramente WCAG.

## Verificación y límites

La suite [rubrica.mjs](js/tests/rubrica.mjs) comprueba catálogo, imágenes, filtros, ocasiones, misión/visión, navegación, carrito, formulario, persistencia y recuperación independiente desde los cuatro almacenamientos. También revisa ausencia de desbordamiento horizontal, axe y foco modal en 320, 390, 480, 768, 1024 y 1440 px. El HTML se revisa con html-validate.

Resultado de la ejecución final: **27 comprobaciones aprobadas**, HTML sin errores y ninguna infracción detectada por axe en los seis tamaños evaluados. Los resultados también se registran en el README. Las pruebas usan un servidor local y Chromium. No incluyen una compra real, un envío real a WhatsApp, auditoría manual completa con lectores de pantalla, medición de Core Web Vitals en producción ni pruebas exhaustivas de Safari y Firefox.

## Guía de revisión manual de la página

1. Desde la cabecera, abre Acerca de nosotros y confirma que se muestran misión y visión. Repite en móvil con el menú abierto.
2. Prueba cada tarjeta de Descubre y observa el nombre del filtro activo y los resultados.
3. Combina una categoría, un presupuesto y una búsqueda. Limpia los filtros y muestra los 284 productos.
4. Abre una vista rápida y compara imagen, nombre, presentación y precio con el catálogo.
5. Añade varios productos, modifica cantidades, elimina, deshaz y recarga. Comprueba el total.
6. Usa únicamente Tab, Shift+Tab, Enter y Escape. Revisa foco visible y cierre de los paneles.
7. Revisa zoom al 200 %, lector de pantalla y pantallas pequeñas. Comprueba que los controles y mensajes se comprendan.
8. Antes de publicar, confirma número de WhatsApp, precios, inventario, imágenes y las condiciones de entrega con el responsable.

## Dictamen

La versión local amplía las opciones de compra y ofrece recorridos claros desde el descubrimiento hasta la consulta. El catálogo, la navegación institucional y el carrito tienen comprobaciones automatizadas. Para una evaluación académica, estas evidencias ayudan a demostrar funcionamiento; la máxima puntuación depende de la revisión del docente y de completar las verificaciones manuales. Para uso comercial todavía deben confirmarse los datos del negocio y comprobarse la versión publicada.

## Actualización PWA y publicación

Se añadieron manifiesto instalable, iconos estándar y maskable, service worker con caché versionada y aviso accesible de desconexión. Se comprueban los criterios de instalación de Chromium, el catálogo con sus 284 fotografías sin conexión, el carrito persistente, la reconexión y el enlace antiguo `michoks.html`. La caché se precarga durante la primera visita conectada; antes de completarse no hay garantía de uso offline. Las actualizaciones se activan al cerrar las pestañas anteriores. La consulta a WhatsApp requiere internet.

El workflow de GitHub Actions ejecuta las verificaciones antes del despliegue. El archivo `michoks.html` se genera al publicar para conservar la dirección original sin duplicar el código fuente del proyecto.

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
