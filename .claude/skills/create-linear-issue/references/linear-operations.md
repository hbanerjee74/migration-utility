# Linear Operations

All Linear operations are performed by sub-agents to keep API payloads out of the coordinator's context. Always use the `linear-server:` prefix for MCP tool names.

## Required MCP Tools

`linear-server:list_projects`, `linear-server:list_issue_labels`, `linear-server:create_issue_label`, `linear-server:create_issue`, `linear-server:get_user`

## Estimate Mapping

| Label | Value | Agent effort |
|---|---|---|
| XS | 1 | < 10 min |
| S | 2 | ~30 min |
| M | 3 | 1-2 hours |
| L | 5 | Half day (max single issue) |
