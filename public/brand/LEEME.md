# MedalIQ · paquete de ícono (símbolo 1b)

Sube la carpeta `brand/` a la raíz de tu sitio y pega `web/head-snippet.html` en el <head>.

## Web
- `favicon.ico` — 16/32/48 en un solo archivo, para navegadores viejos y Google.
- `svg/medaliq-favicon.svg` — favicon vectorial, con el trazo engrosado para tamaños chicos.
- `png/favicon-16|32|48|64.png`
- `png/apple-touch-icon-180.png` — pantalla de inicio en iOS.
- `web/manifest.webmanifest` — PWA. Ajusta `start_url` si el sitio no vive en la raíz.

## App
- iOS: `png/apple-touch-icon-1024.png` para App Store; 120/152/167/180 para el bundle. Sin esquinas redondeadas — iOS aplica su propia máscara.
- Android: `png/icon-192|512.png` más `png/icon-maskable-192|512.png` (el maskable trae el símbolo al 66% para sobrevivir el recorte circular).
- Play Store: `png/play-store-512.png`.

## Figma
Arrastra `figma/medaliq-figma-sheet.svg` al canvas: entra como grupo editable con todas las variantes y la paleta. Los SVG de `svg/` también se arrastran uno por uno.
Los lockups con texto usan Archivo (Google Fonts). Instálala antes de abrirlos, o convierte el texto a curvas antes de la entrega final.

## Reglas
- Área de respeto: la altura del galón por cada lado.
- Mínimo: 18 px en pantalla, 10 mm impreso.
- Nunca: rotar, degradados, sombras, ni invertir el orden de los colores — el galón naranja siempre arriba.
