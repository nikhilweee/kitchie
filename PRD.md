# Kitchie: Product Requirements Document

**Version:** 2.0
**Date:** 2026-05-06
**Status:** Active

This document is a living feature inventory. Checked items have shipped and are verified by a Playwright test in [specs/](specs/) (referenced spec IDs in parentheses). Unchecked items are planned or aspirational.

---

## 1. Purpose

Kitchie is a self-hosted personal meal logging and pantry management web app. Core loop: log what you ate → update pantry → app learns your patterns → suggests what to make next.

## 2. Users

Single user or small household. Not a public SaaS. All routes require authentication; accounts are pre-created by an admin.

## 3. Stack

- SvelteKit 2 + Svelte 5 (runes), mobile-first responsive web
- Tailwind CSS v4
- SQLite via Drizzle ORM, single file on a Docker volume
- Custom session auth + bcrypt; no public registration
- Playwright end-to-end tests
- Ships as a Docker image; TLS handled by Nginx Proxy Manager outside the Compose stack

---

## 4. Features

### 4.1 Auth

- [x] Login with username + password creates a session and redirects to the app (AUTH-001)
- [x] Invalid credentials show an inline error (AUTH-002)
- [x] Unauthenticated requests redirect to `/login` (AUTH-003)
- [x] Logout clears the session and returns to login (AUTH-004)
- [x] Profile: update display name, username (must be unique), and password (min 8 chars, current password required) (AUTH-005, AUTH-006, AUTH-007)
- [x] Change-password page does not create a back-history loop (AUTH-008)

### 4.2 Meals

- [x] Log a meal with name, datetime, and meal type (MEAL-001)
- [x] Meal type auto-inferred from time of day; user can override (MEAL-002)
- [x] Name input autocompletes from past meals and saved recipes (MEAL-003)
- [x] "Update pantry" toggle redirects to the pantry update step after logging (MEAL-004)
- [x] Confirming the pantry update step writes updated quantities and logs `meal_ingredients` in a single action (PANT-009)
- [x] Edit name / datetime / meal type, or delete a logged meal (MEAL-005, MEAL-006)
- [x] Log view groups entries by day, most recent first (MEAL-007)
- [x] `/meals?edit=<id>` deep-links straight to the edit sheet (MEAL-008)
- [x] Edit sheet shows a tappable recipe link when a recipe is associated (MEAL-009)

### 4.3 Pantry

- [x] Add items with name, category, quantity type (count or estimate), quantity, unit, purchase date, expiry date (PANT-001)
- [x] Name-first inference: category, quantity type, and expiry are auto-filled from the item name; user can override any field (PANT-002, PANT-003)
- [x] Edit / soft-delete (Trash) / permanently delete with two-tap confirmation (PANT-004, PANT-005, PANT-017, PANT-018)
- [x] Filter by text search, status chips (Expiring soon, Running low, Out of Stock), and category (PANT-006, PANT-007, PANT-016)
- [x] Sort by name (letter headers), category, or expiry (time-bucket headers) (PANT-011, PANT-012, PANT-013)
- [x] qty=0 auto-finishes an item (it moves to Out of Stock); qty>0 restores it (PANT-014, PANT-015, PANT-020, PANT-021)
- [x] Edit sheet "Consumed" button finishes the item directly (PANT-025, PANT-026)
- [x] Bulk select via long-press → consume / add to cart / permanently delete (PANT-022, PANT-023, PANT-024)
- [x] In the meal pantry update step, each picker initialises to the item's current stock value; free-text entries with no match create a new item (finished if qty=0) (PANT-008, PANT-010, PANT-021)
- [x] Filter selection persists across navigation; tapping the active Pantry tab resets it (PANT-027, PANT-028)
- [x] `/pantry?edit=<id>` deep-links straight to the edit sheet (PANT-019)

### 4.4 Recipes

- [x] After the pantry update step, ingredients are auto-saved as a recipe named after the meal (RECP-001)
- [x] Duplicate-name auto-save is skipped (RECP-002)
- [x] If logging an existing recipe with different ingredients, user is offered an "update recipe" prompt (RECP-003)
- [x] Manual edit of name, course, and ingredient list; delete (RECP-006, RECP-007)
- [x] Optional cuisine and prep time (Quick / Easy / Medium / Long) (RECP-009, RECP-011)
- [x] Filter by name, course, or cuisine; sort by prep time or name (RECP-004, RECP-005, RECP-009, RECP-011)
- [x] Default view groups by course (Breakfast, Main Course, Snack, Dessert) (RECP-012)
- [x] Selecting a recipe suggestion when logging pre-populates the pantry update step with the recipe's ingredients (RECP-008)
- [x] `/recipes?edit=<id>` deep-links straight to the edit sheet (RECP-010)

### 4.5 Carts

- [x] Create / rename / delete carts (CART-001, CART-003, CART-004, CART-011)
- [x] Inline search adds existing pantry items; free-text "Add X" creates a new item (CART-002, CART-009)
- [x] Mark items picked up; checkout writes them to the pantry and clears the cart (CART-006, CART-007)
- [x] Per-cart shopped/total progress counter on the list page (CART-008)
- [x] Tapping a cart row navigates to its detail page (CART-010)
- [x] Carts tab remembers the last-viewed cart; tapping the active tab returns to the list (CART-012)
- [x] Bulk add selected pantry items to a chosen cart (PANT-023)
- [x] Remove an individual item from a cart with the X button (CART-005)

### 4.6 Settings

- [x] Hamburger menu on Meals / Pantry / Recipes opens a sidebar with Categories, Cuisines, Display links (SETT-001)
- [x] Custom pantry categories with editable shelf life (TTL); appear in the category dropdown (SETT-002, SETT-003)
- [x] Categories in use cannot be deleted; unused ones can (SETT-004, SETT-005)
- [x] Custom cuisines; appear in the recipe cuisine dropdown (SETT-006, SETT-007)
- [x] Cuisines in use cannot be deleted; unused ones can (SETT-008, SETT-010)
- [x] Display: Comfortable / Slim density toggle, persisted via localStorage (SETT-009)
- [x] Display: Light / Dark theme toggle, persisted via localStorage (SETT-011)

### 4.7 Suggestions

- [x] Meal-name autocomplete from past meals and saved recipes (MEAL-003)
- [ ] Pantry-aware suggestions: prioritise meals whose ingredients are currently in stock
- [ ] Time-of-day weighting beyond meal-type inference (e.g. learn breakfast vs. dinner patterns)
- [ ] LLM/ML-backed suggestion service behind the existing service boundary

### 4.8 Future

- [ ] Recipe step-by-step instructions (currently only an ingredient list is stored)
- [ ] Recipe import from URL or text paste
- [ ] Push notifications for items expiring soon

---

## 5. Schema

Current Drizzle schema lives in [src/lib/server/db/schema.ts](src/lib/server/db/schema.ts):

| Table                 | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `users`               | Account: id, username, password_hash, name                      |
| `sessions`            | Session cookie store                                            |
| `pantry_items`        | Inventory; status is `active` / `finished` / `trashed`          |
| `user_categories`     | Per-user pantry categories with TTL                             |
| `meal_entries`        | Logged meals; optional `recipe_id` link                         |
| `meal_ingredients`    | Snapshot of ingredients consumed for a meal entry               |
| `recipes`             | Saved meal → ingredient list, with course / cuisine / prep time |
| `recipe_items`        | Ingredients per recipe                                          |
| `user_cuisines`       | Per-user cuisine list                                           |
| `shopping_lists`      | Carts                                                           |
| `shopping_list_items` | Items in a cart, with `shopped` flag                            |

---

## 6. Deferred

- Barcode scanning
- Receipt / image OCR
- Shared household pantries (multi-user pantry access)
- Nutritional tracking (calories, macros)
- Native mobile apps (browser only)
