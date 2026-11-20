# Neon Coast Cover Studio

A make.fun entry for **gta6-cover-art-01 — "Make GTA 6 Cover Art"** ($250).

An offline web app that turns your photo + a caption into GTA-poster-style
cover art and exports it as a PNG to share. Your photos never leave your
machine — everything runs locally in the browser, with no network requests.

## How to use

1. Serve `app/` with any static server, e.g. `node serve.ts`, then open
   http://localhost:8080 — or just open `app/index.html` in a desktop browser.
2. Load 1–3 photos (or click **Use the 2 sample photos**).
3. Type a title + subtitle, pick a layout and a grade, then crop/position
   each panel with the zoom and position sliders.
4. Pick an export size and click **Export PNG**.

## Features

- **4 layouts**: Hero + 3, Four Panel Grid, Full Bleed + Strip, Tilted Snapshots
- **5 colour grades**: Vice Sunset, Neon Night, Palm Teal, Golden Hour, Midnight Noir
- **Per-panel control**: choose which photo fills each panel, zoom and X/Y position
- **3 export sizes**: 1080 × 1080, 1080 × 1350, 1920 × 1080 PNG
- **Live preview** on canvas, with a retro slit sun, halftone title band,
  grain and vignette — all drawn in code
- **Fully offline**: no CDN, no remote script, no font download, no upload

## Originality

All art is original and drawn in code (gradient skies, sun, palms, halftone
dots). Lettering uses system fonts only. No Rockstar Games logo, wordmark,
official artwork, character or font is used anywhere. The two sample photos
under `app/samples/` were made with an image model for make.fun and are free
to use.

## Files

- `main.ts` — Node 22 entrypoint: copies `app/` + `screenshots/` to `/output`
  and writes `dossier.json` (run with `MAKEFUN_OUTPUT_DIR=out node main.ts`)
- `app/index.html`, `app/style.css` — the editor page
- `app/src/cover.js` — the cover renderer (layouts, grades, sun, title)
- `app/src/main.js` — page wiring (upload, controls, export)
- `app/src/shots.js` — fixed `?shot=` scenes used for the screenshots
- `screenshots/` — 3 screenshots: exported covers + the editor with a photo loaded
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged

## License

MIT — see `LICENSE`. Copyright (c) 2026 Unge32.
