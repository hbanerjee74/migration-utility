#!/usr/bin/env bash
set -euo pipefail

# Structural validation script
# Add checks for your project structure here.

echo "Running structural validation..."

# Example: verify required files exist
required_files=(
  "CLAUDE.md"
  "AGENTS.md"
  "README.md"
)

errors=0
for f in "${required_files[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "MISSING: $f"
    errors=$((errors + 1))
  fi
done

# Example: verify agents have YAML frontmatter
for agent in agents/*.md; do
  [[ -f "$agent" ]] || continue
  if ! head -1 "$agent" | grep -q '^---$'; then
    echo "MISSING FRONTMATTER: $agent"
    errors=$((errors + 1))
  fi
done

if [[ $errors -gt 0 ]]; then
  echo "Validation failed with $errors error(s)"
  exit 1
fi

echo "Validation passed"
