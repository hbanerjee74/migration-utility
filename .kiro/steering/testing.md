---
inclusion: always
---

# Testing Strategy

## Test Levels

<!-- Define your test pyramid. Example:

1. **Unit tests** — individual functions and modules
2. **Integration tests** — component interactions
3. **E2E tests** — full user workflows
-->

## When to Write Tests

- New logic → unit tests
- Bug fix → regression test
- New UI interaction → component/integration test
- New workflow → E2E test (happy path)

## Test Discipline

- Update broken tests before adding new ones
- Remove redundant tests
- Every test must catch a real regression
