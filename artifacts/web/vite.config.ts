import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Vite 7 exits when stdin closes — it registers a 'close'/'end' listener via
// process.stdin.on/once/addListener. In workflow environments stdin is not a TTY
// and is immediately closed, which fires the handler and kills the server.
// Solution: patch all three event-registration methods to silently drop 'close'
// and 'end' listeners when running in a non-TTY context (i.e. the workflow runner).
if (!process.stdin.isTTY) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stdin = process.stdin as any;
  const BLOCKED = new Set(["close", "end"]);
  for (const method of ["on", "once", "addListener"] as const) {
    const original = stdin[method].bind(stdin);
    stdin[method] = (event: string, ...args: unknown[]) =>
      BLOCKED.has(event) ? stdin : original(event, ...args);
  }
  // Also remove any existing listeners that were added before this patch
  process.stdin.removeAllListeners("close");
  process.stdin.removeAllListeners("end");
}

// Surface any unhandled errors so they appear in the workflow log
process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[vite-config] unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("[vite-config] uncaughtException:", err);
});

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? await (async () => {
          try {
            const [{ cartographer }, { devBanner }] = await Promise.all([
              import("@replit/vite-plugin-cartographer"),
              import("@replit/vite-plugin-dev-banner"),
            ]);
            return [
              cartographer({ root: path.resolve(import.meta.dirname, "../..") }),
              devBanner(),
            ];
          } catch {
            return [];
          }
        })()
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    // In Docker (no REPL_ID), proxy /api to the API container so relative
    // fetch calls work without the Replit shared reverse proxy.
    ...(!process.env.REPL_ID && {
      proxy: {
        "/api": {
          target: process.env.API_URL ?? "http://api:8080",
          changeOrigin: true,
        },
      },
    }),
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
