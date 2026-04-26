# Kitchie — Specs

`specs/` is the **living source of truth** for what Kitchie currently does and has verified.

## The rule

> A requirement may only exist in `specs/` if a passing Playwright test references it by ID.  
> **No test = no spec.**

`PRD.md` is forward-looking — features move from PRD → specs only when they ship with a passing test.

---

## File structure

```
specs/
  README.md       ← this file
  auth.md         ← AUTH-NNN: login, sessions, profile
  meals.md        ← MEAL-NNN: meal logging and history
  pantry.md       ← PANT-NNN: pantry management and update flow
  recipes.md      ← RECP-NNN: recipe save, edit, filter
  settings.md     ← SETT-NNN: categories, cuisines, display
  carts.md        ← CART-NNN: carts
```

---

## Entry format

```markdown
## AREA-NNN
**Requirement:** One sentence — what the system must do.  
**Test:** `playwright/file.spec.ts` — "exact test name"
```

If a requirement is documented but not yet covered by a test, mark it:

```markdown
**Test:** not yet covered
```

These entries are tracked but do not count as verified. Add a test before relying on them.

---

## Workflow for new requirements

1. **Check for conflicts** — read the relevant `specs/*.md` file; confirm no existing requirement contradicts or duplicates the new one.
2. **Add the spec entry** — assign the next sequential ID in the appropriate file.
3. **Plan** — draft the code changes needed (use plan mode if non-trivial).
4. **Implement** — make the code changes.
5. **Add the test** — write a Playwright test that references the requirement ID in a comment.
6. **Commit** — spec entry + code + test ship in one commit.

---

## ID prefixes

| Prefix | Domain |
|--------|--------|
| `AUTH` | Authentication, sessions, profile |
| `MEAL` | Meal logging and history |
| `PANT` | Pantry management and update flow |
| `RECP` | Recipes |
| `SETT` | Settings: categories and cuisines |
| `CART` | Carts |
