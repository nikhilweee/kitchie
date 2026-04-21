# Kitchie — Project Instructions

## Git
- Use short, single-line commit messages (imperative, under 72 chars).

## Engineering
- Look for correct solutions, not workarounds — if the architecture is wrong, fix the architecture.
- Write code that minimizes redundancy and encourages reuse.

## Database migrations
- **Always use `npx drizzle-kit generate`** to create migrations — never write SQL files or edit `drizzle/meta/_journal.json` by hand.
- `drizzle-kit generate` diffs the schema and produces both the SQL file and the journal entry atomically. Hand-written SQL files will be silently skipped at runtime because they are absent from the journal.

## Specs
- `specs/` is the living source of truth for what the app currently does.
- **A requirement may only exist in `specs/` if a passing Playwright test references it by ID** (e.g. `PANT-008`). No test = no spec.
- `PRD.md` is forward-looking only — features move from PRD → specs when they ship with a passing test.
- When implementing a requirement: ship spec entry + code + test in one commit.
- When given new requirements: check `specs/` for conflicts or duplicates first, then add the entry, plan the code changes, implement, add the test, and commit all three together.
- Format for each spec entry — see `specs/README.md`.
