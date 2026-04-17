# Kitchie: Product Requirements Document

**Version:** 1.1  
**Date:** 2026-04-17  
**Status:** Draft

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
| P2 | Meal suggestions based on history and pantry contents |

---

## 4. Features

### 4.1 Meal Logging

The meal logging flow has two sequential steps.

**Step 1 — Log the meal:**
- **Log view** is the default home screen. A prominent "Add Meal" CTA is always visible.
- Tapping opens a **single-line text input** for the meal name.
- As the user types, the app shows suggestions for matching past meals (by name, frequency, time of day). Suggestions also appear proactively before the user starts typing.
- User selects a suggestion or finishes typing a new meal name and saves.
- Meal entry is created: meal name + timestamp.

**Step 2 — Update pantry (automatic, cancellable):**
- Immediately after saving, the app shows the pantry update UI — no separate prompt.
- App pre-fills a list of pantry items likely consumed (fuzzy match on meal name + past co-occurrence).
- User confirms or adjusts the list, then saves. Or cancels to skip entirely.
- Confirmed items are decremented from pantry inventory.

Each meal entry stores: meal name, logged timestamp, and (if step 2 completed) which pantry items were consumed.

### 4.2 Pantry Management

- **Single item entry:** name, quantity, optional category.
- **Bulk entry mode:** enter multiple items in one session with shared metadata — a shopping date picker (defaults to today) and an optional category. All items in the batch inherit the selected date. Optimized for post-shopping use on desktop.
- **Quantity tracking:** item-type-aware.
  - Countable items (eggs, bananas, cans) → integer count.
  - Bulk/liquid items (milk, flour, olive oil) → fuzzy estimate (full / ~half / low).
  - Detection is heuristic on item name; user can override the quantity mode per item.
  - Quantity is decremented when step 2 of meal logging is completed.
- **Smart expiry:** app estimates expiry from item category and purchase date. Default TTLs by category: fresh produce 5–7 days, fresh meat/fish 2–3 days, dairy 7–14 days, cooked leftovers 3–5 days, bread/bakery 5–7 days, frozen 90 days, dry goods 365 days, canned goods 730 days, condiments 180 days, packaged snacks 90 days. User can override the estimate per item.
- **Pantry view surfaces:** items low in quantity, items expiring within 3 days, recently added items.

### 4.3 Meal Suggestions

- Suggestions appear proactively on the log screen before the user starts typing, based on time of day and recent history. They refine as the user types.
- Suggestion signals:
  - Past meal frequency and recency
  - Time of day (breakfast vs. dinner patterns)
  - Current pantry contents (prioritize meals using available items)
- v1 is rule-based. Architecture must allow plugging in an external LLM/ML service later (e.g., via a suggestion service interface).

### 4.4 Authentication

- Simple custom session auth: cookie-based sessions, username + bcrypt-hashed password.
- No third-party auth library required.
- No public registration — accounts are pre-created by the admin (owner).
- All routes require authentication. Unauthenticated requests redirect to login.

---

## 5. Technical Requirements

| Requirement | Spec |
|-------------|------|
| Deployment | Docker Compose on a VPS |
| Frontend | Responsive web app (PWA optional but preferred); mobile-first |
| Backend | Any — must be containerized |
| Database | Containerized (Postgres or SQLite); included in compose file |
| Auth | Custom session auth + bcrypt; no open registration |
| TLS | Caddy reverse proxy in Compose; handles Let's Encrypt automatically |
| Suggestion interface | Abstracted behind a service boundary for future AI swap-in |

### 5.1 Docker Compose

Compose file must define at minimum:
- `app` service (web + API, not publicly exposed)
- `db` service (persistent volume)
- `caddy` service (reverse proxy on 80/443; TLS via Let's Encrypt)

### 5.2 Responsive / Mobile-First

- Meal logging flow (both steps) must be fully usable one-handed on a phone.
- Bulk pantry entry may rely on a keyboard and is a desktop-secondary flow.
- No native app; browser only.

---

## 6. Data Model (Conceptual)

**User** — id, username, hashed_password  
**MealEntry** — id, user_id, name, logged_at  
**MealIngredient** — meal_entry_id, pantry_item_id, quantity_used *(created in step 2 of meal logging; absent if user cancels)*  
**PantryItem** — id, user_id, name, category, quantity_type (count|estimate), quantity, purchase_date, expiry_date, expiry_overridden (bool)

---

## 7. Out of Scope (v1)

The following are explicitly deferred. They are natural v2 candidates.

- Barcode scanning
- Receipt / image OCR
- Shared household pantries (multi-user pantry access)
- Nutritional tracking (calories, macros)
- Shopping list generation
- Full recipe storage with step-by-step instructions

