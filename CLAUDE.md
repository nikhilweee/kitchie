# Kitchie — Project Instructions

## Engineering

- Commit messages: single line, imperative, under 72 chars.
  - Good: `Add expiry override to pantry edit`
  - Bad: `Updated the pantry editing flow to support expiry date overrides`
- Correct solutions over workarounds — if the architecture is wrong, fix it.
- Write code that minimises redundancy and encourages reuse.
- Cleanup is part of done — in the same change, not as a follow-up:
  - Remove dead code, unused imports, and duplicate logic.
- UI completeness is part of done — check all related surfaces:
  - New keyboard shortcut → add it to the shortcuts modal.
  - New sidebar link → verify it works from all pages with a sidebar.

## Specs & Tests

- `specs/` is the living source of truth — a spec entry only exists if a passing Playwright test references it by ID. No test = no spec.
- `PRD.md` is a feature inventory: shipped features are checked, planned ones unchecked. Update both PRD and specs when shipping a new feature.
- Tests are part of done — ship all three together in the same commit:
  ```
  Add qty=0 auto-consume on pantry update
  - specs/pantry.md   ← new PANT-020 entry
  - src/routes/...    ← implementation
  - playwright/...    ← passing test for PANT-020
  ```
- When given new requirements: check `specs/` for conflicts first, then add entry → implement → test → commit.
- Format: see `specs/README.md`.

## Database Migrations

- Always use `pnpm exec drizzle-kit generate` — never write SQL files or edit `drizzle/meta/_journal.json` by hand.
  - Hand-written files are silently skipped at runtime because they're absent from the journal.
