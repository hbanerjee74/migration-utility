/**
 * dev.mjs — starts Tauri dev mode on a randomly chosen free port.
 *
 * Usage: npm run dev:instance
 *
 * Finds a free TCP port, then runs `tauri dev` with:
 *   - VITE_PORT env var (read by vite.config.ts)
 *   - --config override for devUrl (so Tauri polls the right port)
 *
 * Run multiple terminals with `npm run dev:instance` to get independent
 * instances on different ports simultaneously.
 *
 * Note: spawns the Tauri CLI binary directly from node_modules to avoid
 * npm passing the JSON --config value through a shell (which mangles it).
 */
import { createServer } from "net";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function findFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
    server.on("error", reject);
  });
}

const port = await findFreePort();
console.log(`dev:instance — port ${port}`);

// Invoke the Tauri CLI binary directly so Node passes --config as a single
// argument without any shell quoting or interpretation.
const tauriBin = resolve(__dirname, "..", "node_modules", ".bin", "tauri");

const child = spawn(
  tauriBin,
  ["dev", "--config", JSON.stringify({ build: { devUrl: `http://localhost:${port}` } })],
  {
    stdio: "inherit",
    env: { ...process.env, VITE_PORT: String(port) },
  },
);

child.on("exit", (code) => process.exit(code ?? 0));
