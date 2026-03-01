# Fast Path — Small Issues

## When to Use

Use when ALL are true:

- Estimate is XS or S (1-2 points)
- Changes are isolated to one area of the codebase
- User can override in either direction

## How It Works

Skip team orchestration and implement directly. Use a single sub-agent only if it is clearly faster for isolated execution.

The implementation must read existing tests before writing any. Update broken tests, remove redundant ones, and only add tests for genuinely new behavior.

Only the **code reviewed** and **final validation** gates are optional to run as separate steps. Tests, logging, and PR creation are still required.

**Always run `npx tsc --noEmit`** (from `app/`) before committing — catches type errors in untouched files that reference changed interfaces.

Linear updates still apply — write what was done, tests, and PR link.
