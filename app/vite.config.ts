import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const port = process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 1420;
// @ts-expect-error process is a nodejs global
const isE2E = process.env.TAURI_E2E === "true";

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // In E2E mode, replace Tauri invoke with mock responses
      ...(isE2E && {
        "@tauri-apps/api/core": path.resolve(__dirname, "./src/test/mocks/tauri-e2e.ts"),
        "@tauri-apps/plugin-dialog": path.resolve(__dirname, "./src/test/mocks/tauri-e2e-dialog.ts"),
        "@tauri-apps/plugin-log": path.resolve(__dirname, "./src/test/mocks/tauri-e2e-log.ts"),
      }),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. use VITE_PORT env var when set (enables multi-instance via `npm run dev:instance`),
  //    otherwise fall back to 1420
  server: {
    port,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: port + 1,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
