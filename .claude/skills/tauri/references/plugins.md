# Tauri Plugins

## When to Use a Plugin

Use plugins when a stable capability already exists (filesystem, shell, notifications, etc.).

## Guidance

- Prefer official Tauri plugins.
- Keep permission scopes minimal.
- Document why each plugin is needed.
- Avoid broad permissions when command-level logic can scope access.

## Repo Notes

- Align plugin usage with app capabilities configuration.
- Ensure frontend calls remain typed and failure-aware.
