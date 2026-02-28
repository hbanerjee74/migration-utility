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

## Frontend Unit/Integration Tests

| Test file | What it covers |
|---|---|
| `src/__tests__/stores/workflow-store.test.ts` | Store actions, surface/scope step/migration status state |
| `src/__tests__/components/icon-nav.test.tsx` | 60px icon sidebar navigation, active state, click routing |
| `src/__tests__/components/scope-step-nav.test.tsx` | Scope sub-wizard step nav, locked state |
| `src/__tests__/pages/settings-workspace-tab.test.tsx` | Workspace source form switching, validation, connection test, apply, locked state |
| `src/__tests__/pages/home.test.tsx` | Home surface setup/ready/active states, CTAs |
| `src/__tests__/pages/monitor.test.tsx` | Monitor surface ready/running states, launch button |

## E2E Spec Files

| File | Tag | What it covers |
|---|---|---|
| `e2e/home/home.spec.ts` | `@home` | Setup/dashboard/running states, nav CTAs, root redirect |
| `e2e/settings/settings.spec.ts` | `@settings` | Settings layout, cards, locked-state behavior |
| `e2e/monitor/monitor.spec.ts` | `@monitor` | Monitor launch flow, invoke wiring, log stream output |

## Shared Infrastructure

Changes to these files require running `npm run test:all`:

- `src/test/setup.ts`
- `src/test/mocks/tauri.ts`
- `src/test/mocks/tauri-e2e.ts`
- `src/lib/tauri.ts` (when created)
