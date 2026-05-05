# Contributing

This file is the canonical onboarding path for developing `migration-utility` itself. It covers contributor setup, local development, and PR conventions.

This is not the customer or migration-project setup flow and does not replace `/init-ad-migration`.

See `AGENTS.md` for repository architecture, conventions, and agent guidance.

---

## For coding agents

This section gives a coding agent a complete protocol for bootstrapping the local clone and identifying what it cannot do without human help.

### Setup protocol

Run the bootstrap script in fix mode and capture both stdout and stderr:

```bash
./scripts/contributor-setup.sh 2>&1
```

The script prints human-readable lines followed by a single JSON object as its **last line of stdout**. Parse that line. The schema is:

```json
{
  "mode": "fix",
  "status": "ready | partially_ready | blocked",
  "summary": {
    "message": "...",
    "working_backends": ["sql_server", "oracle"],
    "manual_actions": ["..."]
  },
  "checks": {
    "platform":        { "status": "ok | blocked",                          "message": "...", "next_action": "..." },
    "required_tools":  { "status": "ok | blocked",                          "message": "...", "next_action": "..." },
    "optional_tools":  { "status": "ok | manual_action",                    "message": "...", "next_action": "..." },
    "repo_bootstrap":  { "status": "ok | fixed | manual_action | skipped",  "message": "...", "next_action": "..." },
    "docker":          { "status": "ok | blocked | skipped",                "message": "...", "next_action": "..." },
    "sql_server":      { "status": "ok | manual_action | skipped",          "message": "...", "next_action": "..." },
    "oracle":          { "status": "ok | manual_action | skipped",          "message": "...", "next_action": "..." }
  }
}
```

**Interpretation:**

- `ready` — environment is fully configured; proceed with development work.
- `partially_ready` — usable but at least one check needs manual follow-up.
- `blocked` — a prerequisite is missing; development work cannot proceed.

A `next_action` field is present on any check whose `status` is `blocked` or `manual_action`. Collect every such `next_action` and present them to the contributor before re-running.

### What the agent can do automatically

The script's fix mode handles these without human interaction:

- sync `lib/` Python environment (`uv sync --extra dev`)
- sync `mcp/ddl/` Python environment (`uv sync`)
- install eval harness dependencies (`tests/evals/` npm install)
- start a stopped contributor Docker container (if the image already exists locally)

### What requires human action

The agent must surface these as explicit steps for the contributor — they cannot be automated:

| Step | Why it needs a human |
|------|----------------------|
| Install missing machine-level tools (git, python3, uv, node, npm, direnv, docker, markdownlint, toolbox, SQLcl, Java 11+) | Requires system-level package management or manual download |
| Fill in `.env` with credentials, then run `direnv allow` | Credentials are secrets the agent must not generate or store |
| Docker image pull, registry login, and initial container setup | Requires authenticated registry access; see [docs/reference/setup-docker/README.md](docs/reference/setup-docker/README.md) |
| Host-level permission or toolchain repairs | Agent cannot escalate privileges or alter system paths |

### Iteration loop

1. Run `./scripts/contributor-setup.sh` (fix mode).
2. Parse the trailing JSON line.
3. If `status == "ready"`, stop — the environment is configured.
4. Collect `next_action` from every check where `status` is `blocked` or `manual_action`.
5. Present those as a numbered list of manual steps to the contributor.
6. After the contributor confirms completion, return to step 1.

---

## Supported platforms

- macOS
- Linux/Unix-like

Windows is not supported by the contributor bootstrap flow.

---

## Maintainer-ready target

`maintainer ready` means:

- the repo can be edited, linted, and unit-tested
- repo-local environments for `lib/`, `mcp/ddl/`, and `tests/evals/` are bootstrapped
- Docker is installed and the daemon is reachable
- contributor containers can be started
- at least one live maintainer backend path works end to end: SQL Server or Oracle

---

## Contributor setup

Use the contributor bootstrap script from the repo root:

```bash
./scripts/contributor-setup.sh
```

This is the default `fix` mode. It runs repo-local bootstrap, verifies maintainer readiness, and ends with a human-readable summary plus trailing JSON for coding agents.

For a non-mutating report:

```bash
./scripts/contributor-setup.sh show
```

### What the script checks

- supported OS
- required vs optional machine-level tools
- repo-local bootstrap inputs
- `lib/` and `mcp/ddl/` Python environments
- `tests/evals/` dependencies
- Docker binary and daemon readiness
- SQL Server contributor path
- Oracle contributor path

### What the script can do automatically

- sync the repo-local Python environments in `lib/` and `mcp/ddl/`
- install repo-local eval harness dependencies in `tests/evals/`
- verify Docker and contributor container readiness

### What still requires user action

- installing machine-level tools
- Docker login/image pull/setup when containers are missing
- fixing host-level toolchain or permission issues

### Status meanings

- `ready`: Docker works, repo-local bootstrap succeeded, and at least one backend path works
- `partially_ready`: the repo is close but still needs manual follow-up
- `blocked`: the environment cannot satisfy maintainer readiness yet

---

## Machine tools

### Required

| Tool | Purpose |
|------|---------|
| `git` | Version control and worktree support |
| Python 3.11+ | Runtime for `lib/` and `mcp/` |
| [uv](https://docs.astral.sh/uv/) | Python package manager |
| Node.js + npm | Promptfoo eval harness for migration-only evals (`tests/evals/`) |
| [direnv](https://direnv.net/) | Auto-loads `.env` credentials |
| Docker | Contributor container and integration readiness |
| [markdownlint-cli](https://github.com/igorshubovych/markdownlint-cli) | All `.md` files must pass before commit |
| [`toolbox`](https://github.com/googleapis/genai-toolbox/releases) | SQL Server maintainer path |

### Optional

| Tool | Purpose |
|------|---------|
| [gh CLI](https://cli.github.com/) | GitHub API interactions |

### Environment variables

Fill in `.env` (commented examples are included), then:

```bash
direnv allow
```

See [docs/wiki/Installation-and-Prerequisites.md](docs/wiki/Installation-and-Prerequisites.md) for the full environment-variable reference.

---

## Fresh-laptop flow

1. Clone the repo.
2. Run `./scripts/contributor-setup.sh`.
3. Follow any manual actions it reports.
4. Re-run `./scripts/contributor-setup.sh` until it reports `ready`.
5. Use `./scripts/contributor-setup.sh show` later for a non-mutating status check.

```bash
git clone https://github.com/accelerate-data/migration-utility
cd migration-utility
./scripts/contributor-setup.sh
```

### Manual Docker setup

The script verifies Docker and contributor containers but does not pull images or log in to registries. See [docs/reference/setup-docker/README.md](docs/reference/setup-docker/README.md) for the one-time Docker image and container setup.

### Local plugin execution

```bash
claude --plugin-dir .
```

This assumes the relevant MCP prerequisites are already installed and on `PATH`.

Codex marketplace installation reads `.codex-plugin/plugin.json`. Codex supports the root `skills/` surface and the root `.mcp.json` DDL MCP server; root `commands/` remain Claude-only. See [docs/reference/codex-plugin-surface/README.md](docs/reference/codex-plugin-surface/README.md).

---

## Repository structure

```text
.claude/              Agent rules, skills, and memory
.codex-plugin/        Codex plugin manifest
agents/               Claude agent definitions
commands/             Claude-only slash command specs
lib/                  Python library (uv project)
  shared/             DDL analysis modules and JSON schemas
mcp/
  ddl/                DDL file MCP server (structured AST access)
  mssql/              genai-toolbox config for live SQL Server queries
docs/
  design/             Architecture and design decision records
  functional/         Functional specifications
  plans/              Implementation plans
  reference/          Setup guides and reference docs
  wiki/               End-user documentation synced to the GitHub wiki
```

See `repo-map.json` for the full structure, entrypoints, and command reference.

---

## Development

### Tests

```bash
cd lib && uv run pytest                            # shared library
cd mcp/ddl && uv run pytest                        # DDL MCP server
cd lib && uv run pytest -m integration             # requires Docker SQL Server
```

Integration tests require local database infrastructure. Document any skipped infrastructure-dependent checks in the PR.

### Lint

```bash
uvx ruff check lib/shared packages/ad-migration-cli/src packages/ad-migration-internal/src mcp/ddl scripts tests --select F401,F841
markdownlint <file>    # all .md files must pass before committing
```

### Design docs

Add a subdirectory under `docs/design/` with a `README.md`, then update `docs/design/README.md`.

---

## Workflow

1. Create or reference a Linear issue.
2. Create a branch or worktree: `feature/vu-<id>-short-description` — see `.claude/rules/git-workflow.md`.
3. Keep commits focused on one concern; run the relevant tests before each commit.
4. Open a PR titled `VU-XXX: short description` with `Fixes VU-XXX` in the body.
