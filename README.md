# Kitchie

A self-hosted pantry organizer and meal tracker, with built-in shopping carts and a recipe library.

## Features

- **Pantry.** Type an item name and Kitchie infers the category, quantity type, and expiry. Filter by what's expiring soon, running low, or out of stock. Long-press to bulk-consume, add to a cart, or trash.
- **Meals.** Add a meal in two taps. Meal type is inferred from the time of day, and the name field autocompletes from your history and saved recipes. An optional second step decrements the pantry items you used.
- **Carts.** Build a shopping list, mark items as you pick them up, then check out. Everything lands in your pantry at once.
- **Recipes.** Recipes save themselves the first time you log a meal with ingredients. The next time you log the same meal, the ingredient list is pre-filled.
- **Installable.** Adds to your home screen as a Progressive Web App — Chrome on Android, Safari on iOS.

See [FEATURES.md](FEATURES.md) for the complete feature list (shipped + planned), or [specs/](specs/) for verified, test-backed behavior.

## Tech stack

- SvelteKit 2 + Svelte 5 (runes), mobile-first
- Tailwind CSS v4
- Drizzle ORM + better-sqlite3
- bcrypt session auth (custom, no third-party)
- Playwright for end-to-end tests
- Ships as a Docker image (Node 24 slim); TLS handled outside the Compose stack

## Getting started

```sh
pnpm install
cp .env.example .env          # DATABASE_URL=local.db
pnpm db:push                  # apply Drizzle migrations
pnpm exec tsx scripts/create-user.ts <username> <password>
pnpm dev                      # http://localhost:5173
```

There is no public registration — accounts are created with the `create-user.ts` script.

## Scripts

| Command                | What it does                              |
| ---------------------- | ----------------------------------------- |
| `pnpm dev`             | Start the SvelteKit dev server.           |
| `pnpm build`           | Production build via Vite.                |
| `pnpm check`           | Type-check Svelte and TypeScript.         |
| `pnpm lint`            | Prettier check + ESLint.                  |
| `pnpm format`          | Prettier write.                           |
| `pnpm db:push`         | Apply pending Drizzle migrations.         |
| `pnpm db:generate`     | Generate a migration from schema changes. |
| `pnpm db:studio`       | Open Drizzle Studio.                      |
| `pnpm test:playwright` | Build, then run the Playwright suite.     |

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

Tests live in [playwright/](playwright/) and reference spec IDs from [specs/](specs/). `pnpm test:playwright` builds the app first and then runs the full suite. A spec entry only exists if a passing Playwright test references it by ID — see [specs/README.md](specs/README.md) for the format and workflow.

## Deployment

Deployed as a Docker image — see [Dockerfile](Dockerfile) and [docker-compose.yml](docker-compose.yml). TLS is expected to be terminated by a reverse proxy (e.g. Nginx Proxy Manager) outside the Compose stack.

## Documentation

- [FEATURES.md](FEATURES.md) — feature inventory (shipped + planned)
- [specs/](specs/) — verified shipped features (test-backed)
- [CLAUDE.md](CLAUDE.md) — engineering and contribution conventions
