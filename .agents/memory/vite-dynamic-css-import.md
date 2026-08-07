---
name: Vite dynamic CSS import from node_modules
description: Vite cannot resolve CSS files inside dynamic import() from node_modules — must use static top-level import instead.
---

# Vite cannot dynamically import CSS from node_modules

## The rule
Never put `import("some-package/dist/style.css")` inside a `Promise.all([...])` or any dynamic `import()` call. Vite's dependency scanner fails at build time with "Does the file exist?" even when it does.

**Why:** Vite statically analyses CSS imports to bundle them. A CSS path inside a dynamic `import()` expression is invisible to the static analyser, causing the bundler to reject it.

**How to apply:** When lazy-loading a map or other library that ships CSS, import the CSS statically at the top of the component file and only lazy-load the JS:

```ts
// ✅ CORRECT
import "maplibre-gl/dist/maplibre-gl.css";   // static — always safe
import "mapbox-gl/dist/mapbox-gl.css";        // static — always safe

// In component body:
const [lib, setLib] = useState(null);
useEffect(() => {
  import("react-map-gl/maplibre").then(setLib);   // JS only — no CSS
}, []);

// ❌ WRONG — fails Vite scan
Promise.all([
  import("react-map-gl/maplibre"),
  import("maplibre-gl/dist/maplibre-gl.css"),  // 💥
])
```
