# Kitchie

Self-hosted personal meal logging and pantry management. Mobile-first, single-user or small household. Log what you ate → update pantry → app learns your patterns → suggests what to make next.

## Features

- **Meal logging** — fast two-step flow: log the meal, then optionally decrement pantry items used.
- **Pantry inventory** — bottom-sheet entry with name-first UX; category, quantity type, and expiry are inferred from the item name.
- **Bulk entry** — add a shopping trip's worth of items via Carts.
- **Smart expiry** — per-item-type estimates that you can override.
- **Recipes** — saved ingredient lists per meal name, used to pre-fill pantry updates.
- **Suggestions** — meal ideas based on history, time of day, and what's currently in the pantry.

See [FEATURES.md](FEATURES.md) for the full product spec and [specs/](specs/) for the verified, test-backed feature set.

## Tech stack

- SvelteKit 2 + Svelte 5 (runes)
- Tailwind CSS v4
- Drizzle ORM + better-sqlite3
- bcrypt session auth (custom, no third-party)
- Playwright for end-to-end tests
- Ships as a Docker image (Node 22 Alpine)

## Getting started

```sh
npm install
cp .env.example .env          # DATABASE_URL=local.db
npm run db:push               # apply Drizzle migrations
npx tsx scripts/create-user.ts <username> <password>
npm run dev                   # http://localhost:5173
```

There is no public registration — accounts are created with the `create-user.ts` script.

## Scripts

| Command                   | What it does                              |
| ------------------------- | ----------------------------------------- |
| `npm run dev`             | Start the SvelteKit dev server.           |
| `npm run build`           | Production build via Vite.                |
| `npm run check`           | Type-check Svelte and TypeScript.         |
| `npm run lint`            | Prettier check + ESLint.                  |
| `npm run format`          | Prettier write.                           |
| `npm run db:push`         | Apply pending Drizzle migrations.         |
| `npm run db:generate`     | Generate a migration from schema changes. |
| `npm run db:studio`       | Open Drizzle Studio.                      |
| `npm run test:playwright` | Build, then run the Playwright suite.     |

## Project layout

```
src/
  routes/        SvelteKit pages and server endpoints
  lib/
    server/      DB schema, auth, pantry/suggestion logic
    components/  Svelte components (sheets, lists, modals)
scripts/         CLI utilities (create-user, migrate-status)
drizzle/         Generated migrations + journal
playwright/      End-to-end tests, tagged with spec IDs
specs/           Living, test-backed feature specs
```

## Testing

Tests live in [playwright/](playwright/) and reference spec IDs from [specs/](specs/). `npm run test:playwright` builds the app first and then runs the full suite. A spec entry only exists if a passing Playwright test references it by ID — see [specs/README.md](specs/README.md) for the format and workflow.

## Deployment

Deployed as a Docker image — see [Dockerfile](Dockerfile) and [docker-compose.yml](docker-compose.yml).

## Documentation

- [FEATURES.md](FEATURES.md) — product vision, forward-looking
- [specs/](specs/) — verified shipped features (test-backed)
- [CLAUDE.md](CLAUDE.md) — engineering and contribution conventions
