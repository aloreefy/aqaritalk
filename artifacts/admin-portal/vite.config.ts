import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// Vite 7 exits when stdin closes — patch before any other setup
if (!process.stdin.isTTY) {
  const stdin = process.stdin as any;
  const BLOCKED = new Set(['close', 'end']);
  for (const method of ['on', 'once', 'addListener'] as const) {
    const original = stdin[method].bind(stdin);
    stdin[method] = (event: string, ...args: unknown[]) =>
      BLOCKED.has(event) ? stdin : original(event, ...args);
  }
  process.stdin.removeAllListeners('close');
  process.stdin.removeAllListeners('end');
}

process.on('unhandledRejection', (reason) => {
  console.error('[vite-config] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[vite-config] uncaughtException:', err);
});

const rawPort = process.env.PORT;
if (!rawPort) throw new Error('PORT environment variable is required but was not provided.');
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const basePath = process.env.BASE_PATH;
if (!basePath) throw new Error('BASE_PATH environment variable is required but was not provided.');

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' && process.env.REPL_ID !== undefined
      ? await (async () => {
          try {
            const [{ cartographer }, { devBanner }] = await Promise.all([
              import('@replit/vite-plugin-cartographer'),
              import('@replit/vite-plugin-dev-banner'),
            ]);
            return [
              cartographer({ root: path.resolve(import.meta.dirname, '../..') }),
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
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(import.meta.dirname, '..', '..', 'attached_assets'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: { strict: true },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
