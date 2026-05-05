# Migration Utility

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that migrates warehouse stored procedures to dbt models. Targets silver and gold transformations from SQL-based sources; non-SQL runtimes are out of scope.

## How it works

You work inside Claude Code, an AI-powered terminal CLI. The plugin adds migration-specific `/` commands that read your catalog, analyze SQL, write dbt model files, run proof-backed tests, and commit results to git automatically.

Deterministic setup tasks — DDL extraction, target scaffolding, sandbox management — are handled by the `ad-migration` terminal CLI, which you run directly in your shell outside the Claude Code session.

## Pipeline

| Phase | Entry points | What it does |
|---|---|---|
| Project setup | `/init-ad-migration`, `ad-migration setup-source / setup-target / setup-sandbox` | Scaffold project files, extract DDL, scaffold dbt, create sandbox |
| Whole-mart migration | `/migrate-mart-plan` → `/migrate-mart` | Plan and execute a full mart end to end |
| Per-object migration | `/scope-tables` → `/profile-tables` → `/generate-tests` → `/refactor-query` → `/generate-model` | Controlled per-stage processing with git automation |

## Documentation

- [Quickstart](docs/wiki/Quickstart.md)
- [Installation and Prerequisites](docs/wiki/Installation-and-Prerequisites.md)
- [Command Reference](docs/wiki/Command-Reference.md)
- [Troubleshooting and Error Codes](docs/wiki/Troubleshooting-and-Error-Codes.md)
- [Full wiki](docs/wiki/)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contributor setup, development workflow, and PR conventions.

## License

[Elastic License 2.0](LICENSE) — free to use, not available as a managed service.
