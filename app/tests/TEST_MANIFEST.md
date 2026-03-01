# Test Manifest

Maps source files to tests. Update when adding new Rust commands or E2E specs.
<!-- markdownlint-disable MD013 -->

## Rust → E2E Tag Mappings

| Rust module | cargo test filter | E2E tag |
| --- | --- | --- |
| `commands::workspace` | `commands::workspace` | `@workspace` |
| `commands::fabric` | `commands::fabric` | `@fabric` |
| `commands::migration` | `commands::migration` | `@candidacy` |
| `commands::plan` | `commands::plan` | `@launch` |

## Frontend Unit/Integration Tests

| Test file | What it covers |
| --- | --- |
| `src/__tests__/stores/workflow-store.test.ts` | Store actions and migration state updates |
| `src/__tests__/lib/logger.test.ts` | Frontend log-level persistence and level-based console filtering |
| `src/__tests__/components/icon-nav.test.tsx` | Icon nav routing and active-state behavior |
| `src/__tests__/components/scope-step-nav.test.tsx` | Scope step nav and locked-state behavior |
| `src/__tests__/pages/settings-workspace-tab.test.tsx` | Workspace form validation and apply/reset flow |
| `src/__tests__/pages/settings-usage-tab.test.tsx` | Usage run details and out-of-order safety |
| `src/__tests__/pages/home.test.tsx` | Home setup/dashboard states and CTAs |
| `src/__tests__/pages/monitor.test.tsx` | Monitor launch state and non-duplicated stream output |

## E2E Spec Files

| File | Tag | What it covers |
| --- | --- | --- |
| `e2e/home/home.spec.ts` | `@home` | Home states, navigation CTAs, root redirect |
| `e2e/settings/settings.spec.ts` | `@settings` | Settings layout and locked-state behavior |
| `e2e/monitor/monitor.spec.ts` | `@monitor` | Monitor launch flow and log stream output |

## Shared Infrastructure

Changes to these files require running `npm run test:all`:

- `src/test/setup.ts`
- `src/test/mocks/tauri.ts`
- `src/test/mocks/tauri-e2e.ts`
- `src/lib/tauri.ts` (when created)
<!-- markdownlint-enable MD013 -->
