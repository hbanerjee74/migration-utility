# Project Name

<!-- Replace with your project description. -->

A Claude Code project bootstrapped from the [vibedata-utility-project-template](https://github.com/hbanerjee74/vibedata-utility-project-template).

## Quick Start

```bash
# Add your setup instructions here
```

## Project Structure

```text
your-project/
├── .claude/
│   ├── skills/              # Claude Code skills (slash commands)
│   │   └── example-skill/
│   │       ├── SKILL.md     # Skill definition
│   │       └── references/  # Supporting reference docs
│   └── rules/               # Auto-loaded rules for subdirectories
├── agents/                  # Agent prompt definitions (YAML frontmatter + markdown)
├── agent-sources/
│   └── workspace/
│       ├── CLAUDE.md        # Shared agent instructions
│       └── skills/          # Skills deployed to workspace
├── skills/                  # Standalone skill packages
├── .github/workflows/       # CI + Claude Code automation
├── .kiro/steering/          # Kiro steering docs
├── docs/                    # Design docs and user guides
├── scripts/                 # Build, validation, and utility scripts
├── CLAUDE.md                # Primary dev guide (Claude Code)
├── CLAUDE-APP.md            # App-specific conventions (optional companion)
├── AGENTS.md                # Onramp for non-Claude agents (Codex, etc.)
└── README.md
```

### What goes where

| File | Answers | Content | Auto-loaded? |
|---|---|---|---|
| `CLAUDE.md` | "How do we work?" | Dev commands, testing strategy, delegation policy, skill registration | Yes — always |
| `CLAUDE-APP.md` | "What is this app?" | Architecture, tech stack, key directories | Yes — via `@import` from CLAUDE.md |
| `.claude/rules/*.md` | "How do we write code?" | Logging, naming, error handling, frontend design, styling | Yes — when working in matching dirs |
| `.claude/skills/*/SKILL.md` | "What does this skill do?" | Step-by-step agent instructions with references | On demand (slash commands) |
| `AGENTS.md` | "How do non-Claude agents start?" | Minimal onramp for Codex, etc. | By agent convention |

## Skills

<!-- List your skills and how to invoke them -->

## Testing

```bash
# Add your test commands here
```

## Contributing

This project supports AI-assisted development. Start with:

- [`CLAUDE.md`](CLAUDE.md) for Claude Code sessions
- [`AGENTS.md`](AGENTS.md) for Codex and other agents

## License

See [LICENSE](LICENSE) for details.
