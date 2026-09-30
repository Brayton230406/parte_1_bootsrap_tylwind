# MICHOKS · Rediseño con Tailwind CSS

## Abrir la página

Abre `michoks.html` directamente, o ejecuta `npm start` y visita http://127.0.0.1:4173/michoks.html. En PowerShell puedes utilizar `npm.cmd start` si la política bloquea npm.ps1.

## Diseño y funciones

Paleta negro, crema y verde lima, fotografía local de portada, catálogo de 11 productos, navegación móvil, filtros por categoría, búsqueda que ignora tildes, ordenación y carrito persistente. Los diálogos funcionan con teclado y Escape. Los recursos de MICHOKS cargan localmente; WhatsApp requiere conexión.

El botón del carrito abre una consulta al **+593 95 986 2988**, número proporcionado por el propietario. Incluye productos, cantidades y total referencial. El cliente debe enviar el mensaje desde WhatsApp. Abrir la conversación no confirma, cobra ni registra un pedido; el carrito se conserva. Hay un enlace alternativo si el navegador bloquea la ventana.

Para cambiar el número, actualiza `WHATSAPP_NUMBER` en `michoks.js` y los enlaces `wa.me` de `michoks.html`.

Los precios proceden del inventario demostrativo previo: el negocio debe confirmarlos. Se incorporaron fotografías reales de referencia para 11 productos, almacenadas localmente y verificadas visualmente. El detalle ofrece la botella completa y un acercamiento a su etiqueta; no simula fotografías adicionales. Los vinos se muestran en su variante Cabernet Sauvignon, Smirnoff en No. 21 y José Cuervo en Especial Reposado/Gold. La botella Zhumir Seco Suave del fabricante indica 700 ml, por lo que se corrigió la presentación anterior de 750 ml. Confirma que estas variantes coincidan con el inventario físico.

Se incorporó Switch Bongo Bongo de 1500 ml como cóctel, con fotografía real de AKÍ. Se retiró Cutas Tradicional al no poder identificarlo, siguiendo la indicación del usuario. El precio anterior de Switch se conserva como referencia pendiente de confirmación para la nueva presentación.

La interfaz utiliza **Barlow Condensed** en títulos y precios y **Manrope** para la lectura. Ambas fuentes y sus licencias SIL OFL se sirven localmente. Se ajustaron los márgenes de las secciones, la altura y alineación de tarjetas, la separación de títulos y precios y el tamaño de los botones.

## Archivos y compilación

- `michoks.html`: contenido y utilidades Tailwind.
- `michoks.js`: inventario, filtros, carrito, diálogos y consulta WhatsApp.
- `michoks-source.css`: componentes y directivas Tailwind.
- `tailwind.config.cjs`: entradas que Tailwind analiza y colores.
- `michoks-tailwind.css`: CSS compilado incluido en el proyecto.
- `assets/products/`: fotografías reales descargadas. `sources.json` registra producto, página de origen y URL del archivo; no constituye una declaración de licencia de las fotografías.
- `assets/fonts/`: fuentes WOFF2 locales, CSS y licencias.
- `assets/catalog/`: ilustraciones antiguas conservadas como referencia; ya no se usan en la interfaz.
- `assets/michoks-bar.jpg`: fotografía editorial descargada de https://images.unsplash.com/photo-1470337458703-46ad1756a187; no representa un producto concreto del inventario.

```bash
npm ci
npm run build:css
npm start
```

Utiliza `npm run watch:css` al editar. La página carga `michoks-tailwind.css` y `assets/fonts/fonts.css`; las hojas anteriores se conservan como referencia.

## Verificación

```bash
npx playwright install chromium
npm test
npm run preview:screenshots
```

Para usar Chrome instalado en Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd test
npm.cmd run preview:screenshots
```

El 25 de septiembre de 2026 la validación HTML y las **24 pruebas Playwright** pasaron usando Chrome. Incluyen las páginas anteriores, carga de las 11 fotografías y las fuentes locales sin red externa, ampliación de etiqueta, filtros, búsqueda, ordenación, cantidades, persistencia, almacenamiento corrupto, URL y contenido de WhatsApp sin enviar mensajes, teclado, axe y tamaños de 320, 390, 768 y 1440 px. Se revisaron capturas de escritorio, móvil y carrito sin errores de JavaScript ni imágenes rotas. Esto no sustituye una prueba manual con lector de pantalla ni confirma la recepción de pedidos en WhatsApp.

Las capturas se generan en `test-results/michoks-preview/`. El workflow compila Tailwind, valida y empaqueta los recursos locales, incluidas las fotografías y las ilustraciones. No se realizó publicación remota.

Actualización final del catálogo: 11 productos con fotografía real, incluido Switch Bongo Bongo 1500 ml; Cutas retirado. Tras este cambio: HTML válido y 13 pruebas específicas de MICHOKS aprobadas con Chrome. Vista previa sin imágenes rotas ni errores JavaScript.

