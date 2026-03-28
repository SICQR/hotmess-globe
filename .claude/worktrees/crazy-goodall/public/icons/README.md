# PWA Icons

This directory contains Progressive Web App icons in various sizes.

## Icon Sizes

### Standard Icons
- icon-72x72.png - 72x72 pixels
- icon-96x96.png - 96x96 pixels
- icon-128x128.png - 128x128 pixels
- icon-144x144.png - 144x144 pixels
- icon-152x152.png - 152x152 pixels
- icon-192x192.png - 192x192 pixels
- icon-384x384.png - 384x384 pixels
- icon-512x512.png - 512x512 pixels

### Maskable Icons
- icon-maskable-192x192.png - 192x192 pixels with 20% safe zone
- icon-maskable-512x512.png - 512x512 pixels with 20% safe zone

## Generation

Icons can be generated from the SVG favicon using:

### Using ImageMagick
```bash
convert -background none -resize 192x192 public/favicon.svg public/icons/icon-192x192.png
convert -background none -resize 512x512 public/favicon.svg public/icons/icon-512x512.png
```

### Using Inkscape
```bash
inkscape -w 192 -h 192 public/favicon.svg -o public/icons/icon-192x192.png
inkscape -w 512 -h 512 public/favicon.svg -o public/icons/icon-512x512.png
```

### Online Tools
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

## Maskable Icons

Maskable icons require a safe zone (20% padding) to ensure the icon displays correctly
on all devices. The icon content should be within the center 80% of the canvas.
