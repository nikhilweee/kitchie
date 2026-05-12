# Meal specs

## MEAL-001
**Requirement:** A user can log a meal with a name, datetime, and meal type.  
**Test:** `playwright/meals.spec.ts` — "MEAL-001: log a meal and verify it appears in the list"

## MEAL-002
**Requirement:** When no meal type is selected, it is auto-inferred from the time of day.  
**Test:** `playwright/meals.spec.ts` — "MEAL-002: meal type is shown after logging with default (inferred) type"

## MEAL-003
**Requirement:** The meal name input shows autocomplete suggestions from past meals and saved recipes.  
**Test:** `playwright/meals.spec.ts` — "MEAL-003: meal name autocomplete suggests previously logged meals"

## MEAL-004
**Requirement:** When "Update pantry" is toggled on, logging a meal redirects to the pantry update step.  
**Test:** `playwright/meals.spec.ts` — "MEAL-004: \"Update pantry\" toggle redirects to /?update= after logging"

## MEAL-005
**Requirement:** A user can edit a logged meal's name, datetime, and meal type.  
**Test:** `playwright/meals.spec.ts` — "MEAL-005: edit a logged meal name"

## MEAL-006
**Requirement:** A user can delete a logged meal.  
**Test:** `playwright/meals.spec.ts` — "MEAL-006: delete a logged meal"

## MEAL-007
**Requirement:** The meal log is displayed grouped by day, ordered most recent first.  
**Test:** `playwright/meals.spec.ts` — "MEAL-007: meals are displayed grouped by day"

## MEAL-008
**Requirement:** Navigating to `/meals?edit=<id>` opens the edit sheet for that meal directly.  
**Test:** `playwright/meals.spec.ts` — "MEAL-008: ?edit=<id> deep-link opens meal edit sheet"

## MEAL-009
**Requirement:** When a meal has an associated recipe, the meal edit sheet displays a tappable recipe link that navigates to `/recipes?edit=<recipeId>`.  
**Test:** `playwright/meals.spec.ts` — "MEAL-009: meal edit sheet shows recipe link when recipeId is set"

## MEAL-010
**Requirement:** When the meals list overflows the viewport, every meal is reachable by scrolling — the last meal is fully visible at maximum scroll (not occluded by the fixed bottom navigation or the Add-Meal FAB).  
**Test:** `playwright/meals.spec.ts` — "MEAL-010: meals list last item is reachable at max scroll"
