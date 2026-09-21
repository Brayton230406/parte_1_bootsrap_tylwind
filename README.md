# Mar de Fondo

Landing page responsive para una cevichería ecuatoriana. La implementación es HTML, CSS y JavaScript nativo, por lo que puede abrirse sin instalar dependencias.

## Buenas prácticas aplicadas

- **HTML semántico:** `header`, `nav`, `main`, `section`, `article` y `footer` describen la estructura real del contenido.
- **Accesibilidad:** idioma del documento, enlace para saltar al contenido, etiquetas de formulario y mensajes con `role="status"`.
- **Responsive design:** viewport correcto, layout con Grid/Flexbox, unidades relativas y breakpoint para navegación móvil.
- **CSS mantenible:** variables en `:root`, nombres de clases orientados a componentes, estados de interacción y `prefers-reduced-motion`.
- **Rendimiento:** JavaScript con `defer`, fuentes con `preconnect`, imágenes comprimidas y sin librerías innecesarias.
- **SEO básico:** `title`, `description`, jerarquía de encabezados y textos alternativos descriptivos.
- **Formularios claros:** campos obligatorios, tipos de entrada apropiados, autocompletado y confirmación visible.
- **Conversión:** botones de carta, reserva, ubicación y contacto ubicados según la intención del visitante.

## Estructura

```text
index.html   Estructura y contenido de la página
online.html  Variante con Bootstrap y Tailwind cargados desde CDN
offline.html Variante autocontenida con Bootstrap y Tailwind locales
michoks.html Catálogo visual de licorería con carrito de compra
styles.css   Diseño visual, responsive y accesibilidad
script.js    Menú móvil y confirmación de reserva
michoks.css  Identidad visual y responsive del catálogo Michoks
michoks.js   Catálogo, galería, filtros y carrito de compra
vendor/      Copias locales de Bootstrap y Tailwind para uso sin red
offline-assets.css Fondos locales de respaldo para la variante offline
```

## Catálogo Michoks

`michoks.html` es una página independiente para la licorería Michoks. Incluye catálogo de 12 productos, filtros por categoría, búsqueda, galería de hasta cinco imágenes por producto, carrito persistente en el navegador, cálculo de cantidades y total estimado. Las fotografías actuales se cargan desde Unsplash; para producción conviene reemplazarlas por imágenes propias o por un CDN controlado.

## Variantes online y offline

- `online.html` usa Bootstrap 5.3.3 y Tailwind desde CDN. Requiere conexión para cargar esos frameworks y las fuentes.
- `offline.html` usa los archivos de `vendor/` y fondos locales de respaldo, por lo que no depende de CDN ni de imágenes remotas.

Ambas variantes comparten contenido, estilos propios, navegación accesible y el formulario de reserva.

## Uso local

Abre `index.html` directamente o ejecuta:

```bash
python -m http.server 8000
```

Después visita `http://localhost:8000`.

## CI/CD y GitHub Pages

El workflow `.github/workflows/ci-cd.yml` ejecuta en cada pull request y push a `main`:

- Validación HTML5 con `html-validate`.
- Pruebas semánticas y responsive con Playwright en 320, 390, 768 y 1440 px.
- Auditoría automatizada WCAG 2.2 AA con axe-core.
- Pruebas de teclado, foco, nombres accesibles, overflow y enlaces externos HTTPS.

El despliegue a GitHub Pages depende del job de calidad. Si una prueba falla, la publicación no se ejecuta.

El workflow declara `contents: read` para CI y, únicamente en el job de publicación, `pages: write` e `id-token: write`, que son los permisos mínimos necesarios para GitHub Pages. El artefacto publicado contiene las dos variantes en `/online.html` y `/offline.html`.

## Próximos pasos de producción

- Reemplazar textos, precios, teléfonos y direcciones por datos reales.
- Servir imágenes optimizadas desde el propio proyecto o un CDN controlado.
- Conectar el formulario a WhatsApp, correo o un backend real.
- Añadir política de privacidad, términos y analítica antes de publicar.