# Kitchie: Product Requirements Document

**Version:** 1.2  
**Date:** 2026-04-17  
**Status:** Active

---

## 1. Purpose

Kitchie is a self-hosted personal meal logging and pantry management web app. The core loop: log what you ate → update pantry → app learns your patterns → suggests what to make next.

---

## 2. Users

Single user or small number of known users (family/household). Not a public SaaS. Authentication is required because the app is exposed to the internet.

---

## 3. Goals

| Priority | Goal |
|----------|------|
| P0 | Log meals quickly from a phone |
| P0 | Track pantry inventory with cancellable depletion after meal log |
| P1 | Bulk pantry entry after a shopping trip |
| P1 | Smart expiry estimation per item type |
| P2 | Recipes: saved ingredient lists per meal, used to pre-fill pantry update |
| P2 | Meal suggestions based on history and pantry contents |

---

## 4. Features

### 4.1 Meal Logging

The meal logging flow has two sequential steps.

**Step 1 — Log the meal:**
- **Log view** is the default home screen. A prominent "Add Meal" CTA is always visible at the bottom.
- Tapping opens a **bottom sheet** with a single-line text input for the meal name.
- As the user types, the app shows suggestions for matching past meals (by name). Suggestions also appear proactively before the user starts typing. The dropdown is absolutely positioned so it does not shift the form layout.
- The sheet also includes a **datetime-local field** (date + time) and a **meal type selector** (breakfast / lunch / dinner / snack). Meal type is auto-inferred from the time of day but can be overridden.
- User selects a suggestion or types a new name, sets the datetime and meal type, and saves.
- Meal entry is created: name, meal type, logged timestamp.
- Tap any logged entry to edit name, datetime, or meal type. Delete via the edit sheet or the ✕ button on the list row.

**Step 2 — Update pantry (automatic, cancellable):**
- Immediately after saving, the app shows the pantry update sheet — no separate prompt.
- **Ingredient selection is search-based:** the sheet shows a list of already-selected ingredients (pre-populated from keyword matches and, in the future, the meal's saved recipe) and a search input to find more pantry items by name.
- Each selected ingredient has a quantity-used field. The user can remove any pre-selected item or add more from the search.
- User confirms by tapping "Update pantry" or skips entirely. Confirmed items are decremented from pantry inventory.

Each meal entry stores: name, meal type, logged timestamp, and (if step 2 completed) which pantry items were consumed with quantity.

### 4.2 Pantry Management

- **Item entry:** name, category, quantity, purchase date, expiry date — all accessible from a bottom sheet. Tapping an item in the list opens the edit sheet.
- **Name-first UX:** category, quantity type, and expiry are auto-inferred from the item name as the user types. The user can override any inferred value; manual edits are locked so inference does not overwrite them mid-typing.
- **Quantity tracking:** item-type-aware.
  - Countable items (eggs, bananas, cans) → numeric count.
  - Bulk/liquid items (milk, flour, olive oil) → fuzzy estimate (full / ~half / low).
  - Detection is heuristic on item name; user can override the quantity mode per item.
  - Quantity is decremented when step 2 of meal logging is completed.
- **Smart expiry:** app estimates expiry from item category and purchase date. Default TTLs by category: fresh produce 5–7 days, fresh meat/fish 2–3 days, dairy 7–14 days, cooked leftovers 3–5 days, bread/bakery 5–7 days, frozen 90 days, dry goods 365 days, canned goods 730 days, condiments 180 days, packaged snacks 90 days. User can override per item.
- **Pantry view surfaces:** items expiring within 3 days, items running low, and the rest of the inventory.

### 4.3 Recipes *(planned — not yet built)*

- A **recipe** is a saved collection of pantry items (with quantities) associated with a meal name.
- When a user logs a meal in step 1, step 2 pre-populates the ingredient list from the saved recipe for that meal name, in addition to any keyword matches.
- A dedicated **Recipes tab** will let the user view and edit recipes.
- Schema: `recipes` table (id, userId, name) + `recipe_items` table (recipeId, pantryItemId, itemName, defaultQuantity). The per-log `mealIngredients` table remains separate.

### 4.4 Meal Suggestions

- Suggestions appear proactively on the log screen before the user starts typing, based on time of day and recent history. They refine as the user types.
- Suggestion signals:
  - Past meal frequency and recency
  - Time of day (breakfast vs. dinner patterns)
  - Current pantry contents (prioritize meals using available items)
- v1 is rule-based. Architecture must allow plugging in an external LLM/ML service later.

### 4.5 Authentication

- Simple custom session auth: cookie-based sessions, username + bcrypt-hashed password.
- No third-party auth library required.
- No public registration — accounts are pre-created by the admin.
- All routes require authentication. Unauthenticated requests redirect to login.

---

## 5. Technical Requirements

| Requirement | Spec |
|-------------|------|
| Deployment | Docker Compose on a VPS |
| Frontend | Responsive web app; mobile-first; SvelteKit 2.x + Svelte 5 (runes) |
| Backend | SvelteKit server routes + form actions |
| Database | SQLite via Drizzle ORM; single file on a Docker volume |
| Auth | Custom session auth + bcrypt; no open registration |
| TLS | Nginx Proxy Manager on the VPS handles TLS (not managed inside Compose) |
| Suggestion interface | Abstracted behind a service boundary for future AI swap-in |

### 5.1 Docker Compose

Compose file defines:
- `app` service (SvelteKit app, not publicly exposed on standard ports)
- SQLite database file on a named Docker volume

TLS and public-facing ingress are handled by Nginx Proxy Manager running separately on the VPS.

### 5.2 Responsive / Mobile-First

- Meal logging flow (both steps) must be fully usable one-handed on a phone.
- Bottom sheet pattern used for all add/edit forms.
- Absolute-positioned suggestion dropdowns so form layout does not shift as results appear.
- No native app; browser only.

---

## 6. Data Model

**User** — id, username, password_hash, created_at  
**Session** — id, user_id, expires_at, created_at  
**MealEntry** — id, user_id, name, meal_type (breakfast|lunch|dinner|snack), logged_at  
**MealIngredient** — id, meal_entry_id, pantry_item_id, item_name (snapshot), quantity_used *(created in step 2; absent if skipped)*  
**PantryItem** — id, user_id, name, category, quantity_type (count|estimate), quantity, purchase_date, expiry_date, expiry_overridden  
**Recipe** *(planned)* — id, user_id, name  
**RecipeItem** *(planned)* — id, recipe_id, pantry_item_id, item_name, default_quantity

---

## 7. Out of Scope (v1)

- Barcode scanning
- Receipt / image OCR
- Shared household pantries (multi-user pantry access)
- Nutritional tracking (calories, macros)
- Shopping list generation
- Full recipe storage with step-by-step instructions
