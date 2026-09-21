# Auditoría de la página web Mar de Fondo

**Fecha:** 21 de septiembre de 2026
**Repositorio:** [parte_1_bootsrap_tylwind](https://github.com/Brayton230406/parte_1_bootsrap_tylwind)
**Commit auditado:** `7c9b0a8`
**Alcance:** página original, variante online, variante offline, accesibilidad, responsive, pruebas automatizadas y pipeline CI/CD.

## 1. Resumen ejecutivo

La implementación contiene tres entradas HTML:

- `index.html`: versión original de la página.
- `online.html`: versión con Bootstrap 5.3.3 y Tailwind cargados desde CDN.
- `offline.html`: versión con copias locales de Bootstrap y Tailwind, sin depender de CDN ni de imágenes remotas para sus fondos visuales.

Las variantes nuevas comparten contenido, estilos propios, navegación, formulario y comportamiento JavaScript. La validación HTML, las pruebas responsive, la auditoría automatizada WCAG 2.2 AA y las pruebas funcionales de ambas variantes finalizaron correctamente.

**Resultado general:** aprobado para revisión funcional y despliegue estático, con pendientes de producción relacionados principalmente con la conexión real del formulario, datos de negocio e imágenes definitivas.

## 2. Arquitectura auditada

| Componente | Responsabilidad |
| --- | --- |
| `online.html` | Entrada online con Bootstrap y Tailwind desde CDN |
| `offline.html` | Entrada offline con dependencias locales |
| `index.html` | Entrada original conservada |
| `styles.css` | Diseño visual, layout, responsive y animaciones |
| `a11y.css` | Contraste corregido, foco visible y objetivos táctiles |
| `offline-assets.css` | Fondos locales de respaldo para la variante offline |
| `script.js` | Menú móvil, foco, Escape y confirmación visual del formulario |
| `vendor/` | Copias locales de Bootstrap y Tailwind |
| `tests/` | Validación HTML, accesibilidad, responsive y variantes |
| `.github/workflows/ci-cd.yml` | Integración continua y despliegue a GitHub Pages |

## 3. Criterios y entorno de prueba

- HTML5 mediante `html-validate`.
- Accesibilidad automatizada con `@axe-core/playwright`.
- Playwright con Chromium.
- Viewports responsive: 320, 390, 768 y 1440 px.
- Pruebas funcionales del menú móvil con teclado y `Escape`.
- Verificación de nombres accesibles para imágenes y controles.
- Verificación de enlaces externos mediante HTTPS.
- Verificación de carga de dependencias CDN en online y locales en offline.
- Verificación del formulario de reserva en ambas variantes.

## 4. Resultado de pruebas

Comando ejecutado:

```bash
npm test
```

Resultado:

```text
11 passed
```

La ejecución incluye:

- Validación HTML de `index.html`, `online.html` y `offline.html`.
- Una prueba de estructura semántica y jerarquía de encabezados.
- Una auditoría WCAG 2.2 AA con axe-core.
- Cuatro pruebas de ausencia de overflow horizontal.
- Una prueba de navegación móvil con teclado y `Escape`.
- Una prueba de nombres accesibles.
- Una prueba de seguridad de enlaces externos.
- Dos pruebas específicas de las variantes online y offline.

## 5. Accesibilidad y UX

### Cumplimientos verificados

- Documento con `lang="es"`, `charset` y `viewport`.
- Un único `h1` y jerarquía coherente de encabezados.
- Uso de `header`, `nav`, `main`, `section`, `article` y `footer`.
- Enlace para saltar directamente al contenido principal.
- Navegación principal con nombre accesible.
- Botón de menú con `aria-expanded` y `aria-controls`.
- Cierre del menú móvil mediante `Escape` y restauración del foco.
- Imágenes visuales con `role="img"` y `aria-label` descriptivo.
- Campos del formulario asociados a etiquetas visibles.
- Mensaje de estado del formulario mediante `role="status"`.
- Foco visible mediante `:focus-visible`.
- Objetivos táctiles principales con altura mínima de 44 px.
- Animaciones respetuosas de `prefers-reduced-motion`.
- Auditoría automatizada axe sin violaciones WCAG 2.2 AA en la entrada probada.

### Riesgos y pendientes

#### A-01: El formulario todavía no registra una reserva real

**Severidad:** alta para producción.
**Archivo:** `script.js`.

El formulario intercepta el envío, muestra un mensaje de confirmación y limpia los campos, pero no envía información a WhatsApp, correo, API ni base de datos. La confirmación actual es únicamente visual.

**Acción recomendada:** conectar el formulario a un backend o generar un enlace de WhatsApp con datos validados. Mostrar el mensaje de éxito solo después de confirmar la recepción.

#### M-01: La variante offline usa fondos visuales de respaldo

**Severidad:** media.
**Archivo:** `offline-assets.css`.

La variante offline funciona sin red, pero utiliza gradientes locales como sustitutos visuales de las fotografías. Esto evita fallos de carga, aunque no ofrece el mismo contenido fotográfico que la versión online.

**Acción recomendada:** incorporar fotografías optimizadas dentro del repositorio si la versión offline debe conservar imágenes reales.

#### M-02: Los datos de negocio son demostrativos

**Severidad:** media.
**Archivos:** `online.html`, `offline.html`, `index.html`.

Precios, teléfonos, direcciones, horarios y enlace de Instagram deben reemplazarse por datos oficiales antes de producción.

#### M-03: Falta prueba manual con lector de pantalla

**Severidad:** media.

La auditoría automatizada pasó, pero todavía conviene verificar el flujo completo con NVDA, JAWS o VoiceOver, especialmente el menú móvil, el estado del formulario y las imágenes con nombre accesible.

#### M-04: No se ha comprobado el despliegue real en GitHub Pages

**Severidad:** media.

El workflow contiene los permisos necesarios y publica ambas variantes, pero el resultado final depende de que GitHub Pages esté configurado para usar GitHub Actions en el repositorio.

## 6. Seguridad y permisos CI/CD

El workflow usa permisos mínimos por job:

```yaml
permissions:
  contents: read
```

El job de despliegue añade únicamente:

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

El despliegue solo se ejecuta después de que finalice correctamente el job de calidad y únicamente en `push` a `main`. El artefacto publicado incluye:

- `index.html`.
- `online.html`.
- `offline.html`.
- Hojas de estilo y JavaScript.
- `offline-assets.css`.
- `vendor/bootstrap.min.css`.
- `vendor/tailwind.css`.

No se detectaron secretos, tokens ni credenciales almacenados en los archivos auditados.

## 7. Recomendaciones antes de producción

1. Conectar el formulario a un canal real y probar respuestas exitosas y fallidas.
2. Sustituir teléfonos, direcciones, horarios, precios y redes sociales por datos oficiales.
3. Añadir fotografías locales optimizadas para que offline sea visualmente equivalente.
4. Ejecutar una prueba manual con lector de pantalla y teclado completo.
5. Comprobar la publicación real de GitHub Pages después del primer `push` a `main`.
6. Añadir política de privacidad, términos y consentimiento si se recopilan datos personales.
7. Considerar `npm ci` en CI para instalaciones reproducibles usando `package-lock.json`.

## 8. Conclusión

La página cumple la validación automatizada disponible y cuenta con dos variantes funcionales: online y offline. La configuración CI/CD está preparada para validar antes de desplegar y utiliza permisos limitados para GitHub Pages. El principal bloqueo para una operación real es que el formulario aún no está conectado a un sistema de reservas.
