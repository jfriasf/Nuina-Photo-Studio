# Nuna Photo Studio

Sitio web de Nuna Photo Studio: fotografía de retratos, eventos y alquiler de estudio en Santo Domingo. Publicado en https://nunaphotostudio.com con GitHub Pages.

## Páginas

| Dirección | Archivo generado | Contenido en |
|---|---|---|
| `/` | `index.html` | `_src/pages/inicio.html` |
| `/servicios/` | `servicios/index.html` | `_src/pages/servicios.html` |
| `/portafolio/` | `portafolio/index.html` | `_src/pages/portafolio.html` |
| `/planes/` | `planes/index.html` | `_src/pages/planes.html` |
| `/nosotros/` | `nosotros/index.html` | `_src/pages/nosotros.html` |
| `/contacto/` | `contacto/index.html` | `_src/pages/contacto.html` |
| `/terminos/` | `terminos/index.html` | `_src/pages/terminos.html` |

Las páginas `index.html` de cada carpeta y `sitemap.xml` se generan. **No se editan a mano**: cambia los archivos de `_src/` y vuelve a armar el sitio:

```
python _src/build.py
```

## Estructura

- `_src/layout.html`: diseño común (cabecera, menú, pie y etiquetas para Google).
- `_src/partials/`: piezas compartidas (iconos, barra de redes, franja "¿Listo para tu sesión?", pie).
- `_src/pages/`: contenido de cada página, con su título y descripción para Google arriba.
- `_src/ld-*.json`: datos estructurados para Google (ficha del negocio y preguntas frecuentes).
- `assets/site.css` y `assets/site.js`: estilos y comportamiento de todas las páginas.
- `assets/`: logos, íconos e imagen para compartir.
- `fotos/`: fotos optimizadas para web (máx. 1600 px). Para agregar una, ponla aquí como `.jpg` y vuelve a armar.
- `fotos/webp/`: versiones WebP de cada foto en 480, 800, 1200 y 1600 px. Las genera `_src/build.py` (necesita Pillow) y las páginas las usan con `srcset`, para que cada pantalla descargue el tamaño que necesita.

GitHub Pages no publica `_src/`, porque las carpetas que empiezan con `_` se ignoran.

## Editar

- **Planes y precios:** `var PLANS` en `assets/site.js`. Si cambian, actualiza también `_src/ld-negocio.json`.
- **Portafolio:** `var WORKS` en `assets/site.js`. Cada trabajo tiene categoría, título, foto (`src`) y tamaño (`""`, `"w"`, `"t"` o `"xl"`). Las categorías están en `var CATS`.
- **Redes sociales:** `var SOCIAL` en `assets/site.js`.
- **Preguntas frecuentes:** en `_src/pages/planes.html` y en `_src/ld-preguntas.json`.
- **Contador de visitas:** pega el Website ID de Umami en `UMAMI_WEBSITE_ID` dentro de `_src/build.py` y vuelve a armar. Los clics en WhatsApp se registran como eventos.

## Ver en local

```
python -m http.server 8765
```

y abre http://localhost:8765. Las rutas empiezan con `/`, así que abrir los archivos con doble clic no funciona.
