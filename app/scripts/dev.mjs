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
 */
import { createServer } from "net";
import { spawn } from "child_process";

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

const port = await findFreePort();
console.log(`dev:instance — port ${port}`);

const child = spawn(
  "npm",
  [
    "run",
    "tauri",
    "dev",
    "--",
    "--config",
    JSON.stringify({ build: { devUrl: `http://localhost:${port}` } }),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, VITE_PORT: String(port) },
  },
);

child.on("exit", (code) => process.exit(code ?? 0));
