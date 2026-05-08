# PWA Icons

The following icon files are required for the PWA to install correctly:

- `pwa-192x192.png` — 192x192 PNG icon
- `pwa-512x512.png` — 512x512 PNG icon
- `apple-touch-icon.png` — 180x180 PNG (for iOS home screen)

## Generating icons

You can generate these from the favicon SVG using any of:

1. **Vite PWA plugin**: Run `pnpm add -D @vite-pwa/assets-generator` then create the icons automatically
2. **Online tool**: https://realfavicongenerator.net/
3. **ImageMagick**: `convert favicon.svg -resize 512x512 pwa-512x512.png`

For now, a placeholder icon is included. Replace these with your actual app icon before deploying.
