import React from "react";
import ReactDOM from "react-dom/client";
import { attachConsole } from "@tauri-apps/plugin-log";
import App from "./App";
import "@fontsource-variable/jetbrains-mono";
import "./styles/globals.css";

// Route all console.* calls through the Tauri log plugin so they appear in
// the app log file alongside Rust backend messages.
attachConsole().catch((err) => {
  console.error("Failed to attach console logger:", err);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
