# Agent Instructions Governance

This document defines how agent instructions are organized and maintained in this repository.

## Source of Truth

Instruction precedence:

1. `AGENTS.md` is the canonical cross-agent policy.
2. `.claude/rules/*.md` contains shared detailed rules.
3. `.claude/skills/*/SKILL.md` contains reusable workflow playbooks.
4. Agent-specific adapters (for example `CLAUDE.md`) reference canonical policy and add only agent-specific routing.

## Maintenance Rules

- Update canonical behavior in `AGENTS.md` first.
- Put reusable detail in `.claude/rules/` instead of duplicating it across skills.
- Skills should reference shared rules where possible.
- Adapter files should remain thin and should not restate large policy blocks.
- Avoid conflicting guidance across files; if conflict exists, resolve by updating canonical docs.

## Change Process

When modifying agent guidance:

1. Update `AGENTS.md` if the change is global.
2. Update relevant `.claude/rules/` files for implementation detail.
3. Update affected skills to reference shared rules instead of duplicating text.
4. Keep adapter files (for example `CLAUDE.md`) concise.
5. Run `markdownlint` on changed Markdown files before committing.
