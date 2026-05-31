/**
 * Vite dev server launcher — uses the programmatic API so the process
 * is never killed by stdin events (which is what Vite 7's CLI does when
 * running in non-TTY workflow environments).
 *
 * Also includes comprehensive exit diagnostics so we can find the root cause
 * if something still kills the process.
 */
import { createServer } from "vite";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIAG_FILE = "/tmp/vite-dev-exit.log";

function diag(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stderr.write(line);
  fs.appendFileSync(DIAG_FILE, line);
}

// Catch every way a node process can exit
process.on("exit", (code) => {
  diag(`process.on('exit') code=${code} — normal exit`);
});
process.on("beforeExit", (code) => {
  diag(`process.on('beforeExit') code=${code} — event loop drained`);
});
process.on("uncaughtException", (err) => {
  diag(`process.on('uncaughtException') ${err?.stack ?? err}`);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  diag(`process.on('unhandledRejection') ${reason?.stack ?? reason}`);
  process.exit(1);
});
process.on("SIGTERM", () => {
  diag("received SIGTERM — someone killed us");
  process.exit(143);
});
process.on("SIGINT", () => {
  diag("received SIGINT");
  process.exit(130);
});
process.on("SIGHUP", () => {
  diag("received SIGHUP");
  process.exit(129);
});

diag("dev.mjs starting");

const port = parseInt(process.env.PORT ?? "5173", 10);
diag(`PORT=${port}`);

// Prevent the event loop from exiting while the server is alive
const keepAlive = setInterval(() => {
  diag("keepAlive tick — process still alive");
}, 10_000);
keepAlive.unref(); // don't prevent exit ourselves, just keep the loop alive via HTTP server

diag("creating Vite server...");

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
  diag(`createServer() FAILED: ${err?.stack ?? err}`);
  process.exit(1);
}

diag("createServer() succeeded — calling listen()...");

try {
  await server.listen();
} catch (err) {
  diag(`server.listen() FAILED: ${err?.stack ?? err}`);
  process.exit(1);
}

diag(`server listening on port ${port}`);
server.printUrls();

diag("startup complete — waiting for SIGTERM/SIGINT to shut down");

// Log proof-of-life every 5 seconds
const aliveInterval = setInterval(() => {
  diag(`still alive on port ${port}`);
}, 5_000);

// Clean shutdown on SIGTERM / SIGINT
async function shutdown(signal) {
  diag(`shutdown(${signal}) called — closing server`);
  clearInterval(aliveInterval);
  clearInterval(keepAlive);
  try {
    await server.close();
  } catch (e) {
    diag(`server.close() error: ${e}`);
  }
  diag(`shutdown complete`);
  process.exit(0);
}
process.removeAllListeners("SIGTERM");
process.removeAllListeners("SIGINT");
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
