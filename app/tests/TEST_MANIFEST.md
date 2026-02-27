# Test Manifest

Maps source files to tests. Update when adding new Rust commands or E2E specs.

## Rust → E2E Tag Mappings

| Rust module | cargo test filter | E2E tag |
|---|---|---|
| `commands::workspace` | `commands::workspace` | `@workspace` |
| `commands::fabric` | `commands::fabric` | `@fabric` |
| `commands::migration` | `commands::migration` | `@candidacy` |
| `commands::plan` | `commands::plan` | `@launch` |
| `commands::seed` | `commands::seed` | `@workspace` |

## E2E Spec Files

| File | Tag | What it covers |
|---|---|---|
| `e2e/workspace/workspace.spec.ts` | `@workspace` | Workspace setup form, submit, resume, mock data |

## Shared Infrastructure

Changes to these files require running `npm run test:all`:

- `src/test/setup.ts`
- `src/test/mocks/tauri.ts`
- `src/test/mocks/tauri-e2e.ts`
- `src/lib/tauri.ts` (when created)
