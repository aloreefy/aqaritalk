import { createServer } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function log(msg) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`);
}

process.on("uncaughtException", (err) => {
  log(`uncaughtException: ${err?.stack ?? err}`);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  log(`unhandledRejection: ${reason?.stack ?? reason}`);
  process.exit(1);
});

const port = parseInt(process.env.PORT ?? "5173", 10);
log(`Starting Vite dev server on port ${port}`);

let server;
try {
  server = await createServer({
    configFile: path.join(__dirname, "vite.config.ts"),
    root: __dirname,
    server: {
      port,
      host: "0.0.0.0",
      strictPort: true,
    },
  });
} catch (err) {
  log(`createServer() failed: ${err?.stack ?? err}`);
  process.exit(1);
}

try {
  await server.listen();
} catch (err) {
  log(`server.listen() failed: ${err?.stack ?? err}`);
  process.exit(1);
}

log(`Server listening on port ${port}`);
server.printUrls();

// Keep-alive so the process doesn't exit when stdin closes (Vite 7 / non-TTY envs)
const keepAlive = setInterval(() => {}, 60_000);
keepAlive.unref();

async function shutdown(signal) {
  log(`Received ${signal} — shutting down`);
  clearInterval(keepAlive);
  try { await server.close(); } catch {}
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
