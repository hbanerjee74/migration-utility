# Initial Bootstrap Status and Plan

This document is the bootstrap baseline for the desktop app.

It records:
- what is already shipped on `main`
- what remains to finish post-bootstrap foundation work
- the execution order for the next tranche

---

## Current Baseline (Shipped)

### 1. App scaffold and frontend shell

Status: done

Implemented:
- Tauri v2 app scaffold with React + TypeScript + Vite
- Tailwind + shadcn/ui base integration
- AD brand variables and shared UI shell patterns
- Surface routing for Home, Scope, Monitor, and Settings

Primary delivery: PR #2, PR #4

### 2. SQLite schema and migration runner

Status: done

Implemented:
- SQLite bootstrap on app startup
- migration runner with version tracking
- core tables for workspace, Fabric entities, migration state, and config

Primary delivery: PR #3

### 3. Sidecar integration and agent launch path

Status: done

Implemented:
- Node sidecar process managed from Tauri backend
- JSONL protocol for request/response/event streaming
- `sidecar_ready` startup handshake used by monitor launch path
- monitor stream emission to frontend and transcript logging

Primary delivery: PR #4, PR #19

### 4. Workspace setup and source configuration

Status: done

Implemented:
- workspace apply flow in Settings
- SQL Server/Fabric Warehouse source config fields
- source connection test and database discovery commands
- repo clone + lock-after-apply + reset flow

Primary delivery: PR #15

### 5. Usage and telemetry visibility

Status: done

Implemented:
- Settings Usage tab backed by run log parsing
- run summary, recent runs, run detail events
- live monitor telemetry stream during agent execution

Primary delivery: PR #19

---

## Pending Work

### A. Bootstrap doc drift cleanup

Status: pending

This file previously described:
- TanStack Router + 5-step wizard routes
- older command/module split assumptions

Current app is 4-surface routing (`/home`, `/scope`, `/monitor`, `/settings`) with a
scope sub-nav.

Action:
- keep this file aligned to the actual shipped architecture only
- do not reintroduce historical/obsolete route plans

### B. Scope/Candidacy/Config productization

Status: pending

Current state:
- scope sub-routes exist
- major screens still placeholder-level

Action:
- implement real data-backed UIs for scope selection, candidacy review, and table config
- wire existing backend commands into these views
- define save/apply UX and navigation state transitions

### C. Sidecar health verification coverage

Status: pending

Current state:
- startup waits for `sidecar_ready`
- protocol supports ping/pong

Action:
- add explicit test coverage for sidecar readiness + ping/pong behavior on the Rust path

### D. Regression coverage for current critical paths

Status: pending

Add tests for:
- monitor stream non-duplication behavior
- usage run-detail out-of-order request handling
- usage run-id validation and path safety
- workspace source port bounds validation

---

## Execution Plan (Next 3 Milestones)

### Milestone 1: Stabilize foundation

1. Add missing tests for monitor/usage/workspace safety paths.
2. Add sidecar health verification tests (ready + ping/pong).

Exit criteria:
- critical regression suite exists and passes in CI

### Milestone 2: Implement Scope flow

1. Replace scope placeholders with real table/procedure selection UX.
2. Persist selected tables and artifact/candidacy decisions through existing commands.
3. Wire step completion state to actual saves.

Exit criteria:
- user can configure scope end-to-end from UI with persisted state

### Milestone 3: Implement Candidacy + Config flow

1. Build candidacy review UI with override actions.
2. Build table config UI (load strategy, grain, incremental/date fields, snapshot/PII).
3. Connect plan serialization trigger from configured state.

Exit criteria:
- candidacy + table config editable from UI and persisted
- plan generation can be triggered from configured workspace state

---

## Notes

- This is a status-and-plan document, not a historical changelog.
- Keep this file synchronized with `main` behavior and open milestone scope.
