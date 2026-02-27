---
name: tauri
description: Tauri framework for building cross-platform desktop and mobile apps. Use for desktop app development, native integrations, Rust backend, and web-based UIs.
---

# Tauri Skill

Comprehensive assistance with Tauri development, generated from official documentation.

## When to Use This Skill

This skill should be triggered when:
- Building cross-platform desktop applications with Rust + WebView
- Implementing native system integrations (file system, notifications, system tray)
- Setting up Tauri project structure and configuration
- Debugging Tauri applications in VS Code or Neovim
- Configuring Windows/macOS/Linux code signing for distribution
- Developing mobile apps with Tauri (Android/iOS)
- Creating Tauri plugins for custom native functionality
- Implementing IPC (Inter-Process Communication) between frontend and backend
- Optimizing Tauri app security and permissions
- Setting up CI/CD pipelines for Tauri app releases

## Key Concepts

### Multi-Process Architecture
Tauri uses a **Core Process** (Rust) and **WebView Process** (HTML/CSS/JS) architecture:
- **Core Process**: Manages windows, system tray, IPC routing, and has full OS access
- **WebView Process**: Renders UI using system WebViews (no bundled browser!)
- **Principle of Least Privilege**: Each process has minimal required permissions

### Inter-Process Communication (IPC)
Two IPC primitives:
- **Events**: Fire-and-forget, one-way messages (both Core -> WebView and WebView -> Core)
- **Commands**: Request-response pattern using `invoke()` API (WebView -> Core only)

### Why Tauri?
- **Small binaries**: Uses OS WebViews (Microsoft Edge WebView2/WKWebView/webkitgtk)
- **Security-first**: Message passing architecture prevents direct function access
- **Multi-platform**: Desktop (Windows/macOS/Linux) + Mobile (Android/iOS)

## Quick Reference

### 1. Project Setup - Cargo.toml

```toml
[build-dependencies]
tauri-build = "2.0.0"

[dependencies]
tauri = { version = "2.0.0" }
```

### 2. Creating a Tauri Command
```rust
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// In main.rs
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3. Calling Commands from Frontend
```javascript
import { invoke } from '@tauri-apps/api/core';

const greeting = await invoke('greet', { name: 'World' });
console.log(greeting); // "Hello, World!"
```

### 4. Emitting Events
```rust
// From Rust
app.emit_all("event-name", Payload { message: "Hello".into() }).unwrap();

// Listening in JavaScript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen('event-name', (event) => {
    console.log(event.payload.message);
});
```

### 5. Rust State Management
```rust
let data = app.state::<AppData>();
```

### 6. VS Code Debugging - launch.json
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Tauri Development Debug",
      "cargo": {
        "args": [
          "build",
          "--manifest-path=./src-tauri/Cargo.toml",
          "--no-default-features"
        ]
      },
      "preLaunchTask": "ui:dev"
    }
  ]
}
```

### 7. Windows Code Signing Configuration
```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": "A1B1A2B2A3B3A4B4A5B5A6B6A7B7A8B8A9B9A0B0",
        "digestAlgorithm": "sha256",
        "timestampUrl": "http://timestamp.comodoca.com"
      }
    }
  }
}
```

### 8. Opening DevTools Programmatically
```rust
use tauri::Manager;

#[tauri::command]
fn open_devtools(window: tauri::Window) {
    window.open_devtools();
}
```

### 9. GitHub Actions - Publish Workflow
```yaml
name: 'publish'
on:
  push:
    tags:
      - 'app-v*'
```

## Reference Files

This skill includes comprehensive documentation organized into categories:

- **core-concepts.md** - Process model, IPC, debugging, architecture
- **getting-started.md** - Project setup and first app tutorials
- **plugins.md** - Plugin development and integration
- **reference.md** - API references and configuration schemas
- **security.md** - CSP, secure IPC, permissions, WebView security
- **distribution.md** - Code signing, CI/CD, platform packaging

## Debugging Quick Tips

### Enable Rust Backtraces
```bash
RUST_BACKTRACE=1 tauri dev
```

### Create Debug Build
```bash
npm run tauri build -- --debug
```

### Open DevTools
```rust
use tauri::Manager;
window.open_devtools();
window.close_devtools();
```

## Platform-Specific Notes

### Windows
- Uses **Microsoft Edge WebView2** (automatically installed on Windows 11)
- Code signing required for SmartScreen reputation

### macOS
- Uses **WKWebView** (native to macOS)
- Code signing with Apple Developer certificate

### Linux
- Uses **webkitgtk** (must be installed separately)
- Package formats: .deb, .rpm, .AppImage

## Resources

- Official docs: https://tauri.app/
