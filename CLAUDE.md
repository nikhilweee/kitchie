# Kitchie — Project Instructions

## Engineering
- Commit messages: single line, imperative, under 72 chars.
  - Good: `Add expiry override to pantry edit`
  - Bad: `Updated the pantry editing flow to support expiry date overrides`
- Correct solutions over workarounds — if the architecture is wrong, fix it.
- Write code that minimises redundancy and encourages reuse.
- Cleanup is part of done: after every change, remove dead code, unused imports, and duplicate logic — in the same change, not as a follow-up.

## Specs & Tests
- `specs/` is the living source of truth. A spec entry only exists if a passing Playwright test references it by ID (e.g. `PANT-008`). No test = no spec.
- `PRD.md` is forward-looking only — features move PRD → specs when they ship with a passing test.
- Tests are part of done: when building or changing a feature, add, update, or remove the relevant Playwright tests in the same commit.
- When implementing a requirement, ship all three together:
  ```
  Add qty=0 auto-consume on pantry update
  - specs/pantry.md   ← new PANT-020 entry
  - src/routes/...    ← implementation
  - playwright/...    ← passing test for PANT-020
  ```
- When given new requirements: check `specs/` for conflicts first, then add entry, implement, test, commit all three.
- Format: see `specs/README.md`.

## Database Migrations
- Always use `npx drizzle-kit generate` — never write SQL files or edit `drizzle/meta/_journal.json` by hand (hand-written files are silently skipped at runtime because they're absent from the journal).
