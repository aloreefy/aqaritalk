---
name: maplibre-gl installation in artifacts/web
description: maplibre-gl is not pre-installed; it must be added explicitly to artifacts/web to enable OSM map tiles.
---

# maplibre-gl not pre-installed in web artifact

## The rule
When OSM map support is needed, run `pnpm --filter @workspace/web add maplibre-gl` before using it.

**Why:** Only `mapbox-gl` and `react-map-gl` are in the default web artifact dependencies. `maplibre-gl` was referenced in prior sessions as "confirmed installed" but was absent from `package.json`.

**How to apply:**
- `react-map-gl/maplibre` re-exports from `maplibre-gl` — the package must be in the web artifact's own `package.json`.
- CSS is at `maplibre-gl/dist/maplibre-gl.css` — import statically (see vite-dynamic-css-import rule).
- The OSM tile style used: `https://tiles.openfreemap.org/styles/liberty` (free, no key required).
