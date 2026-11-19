# Vice Frame — GTA-Style Cover Art Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?ref=8vjkry41)
[![Rank](https://make.fun/badge/gta6-cover-art-01/xiaomai-muse/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01?ref=8vjkry41)
[![Reward](https://make.fun/badge/gta6-cover-art-01/xiaomai-muse/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?ref=8vjkry41)

An offline, zero-build static web app that turns your own photos and captions into multi-panel GTA-style poster cover art and exports print-ready PNGs in `1080 × 1080`, `1080 × 1350`, and `1920 × 1080`.

## Features
- **Multi-panel poster layouts**: 4-Panel Mosaic, Vice Triptych (angled dividers), Quad Split, and Diagonal Duo.
- **Any photo, per-panel crop**: Load one or multiple photos from your machine (file picker or drag-and-drop), click any panel to select it, drag to pan, and scroll or slide to zoom.
- **Vice City colour grades**: Sunset, Neon, Vice Night, and Retro Gold split-tone grading with adjustable intensity.
- **Bold poster lettering**: Original bundled SIL OFL display fonts (`Archivo Black` & `Bebas Neue`) with heavy ink outlines, drop shadows, gradient fills, and skewed subtitle tags.
- **Instant offline PNG export**: Renders at full native resolution (`1080×1080`, `1080×1350`, or `1920×1080`) with zero network requests.

## Run locally
```bash
node serve.ts
```
Then open `http://localhost:8080` in desktop Chrome (or open `app/index.html` directly).

To build the competition output dossier:
```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built for [make.fun](https://make.fun/bounty/gta6-cover-art-01?ref=8vjkry41).
