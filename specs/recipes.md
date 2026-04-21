# Recipe specs

## RECP-001
**Requirement:** After finalising the pantry update step, a user can save the selected ingredients as a new recipe named after the meal.  
**Test:** `playwright/recipes.spec.ts` — "RECP-001: save ingredients as recipe after meal log + pantry update"

## RECP-002
**Requirement:** If a recipe with the same name already exists, the auto-save is skipped (no duplicate created).  
**Test:** `playwright/recipes.spec.ts` — "RECP-002: duplicate recipe name is skipped; no second recipe created"

## RECP-003
**Requirement:** When a meal is logged using an existing recipe and the ingredients differ, the user is offered the option to update the recipe.  
**Test:** `playwright/recipes.spec.ts` — "RECP-003: update recipe from flow when ingredients changed"

## RECP-004
**Requirement:** The recipe list can be filtered by a text search on recipe name.  
**Test:** `playwright/recipes.spec.ts` — "RECP-004: recipe list filtered by name search"

## RECP-005
**Requirement:** The recipe list can be filtered by meal type (breakfast, lunch, dinner, snack).  
**Test:** `playwright/recipes.spec.ts` — "RECP-005: recipe list filtered by meal type chip"

## RECP-006
**Requirement:** A user can manually edit a recipe's name, meal type, and ingredient list.  
**Test:** `playwright/recipes.spec.ts` — "RECP-006: edit a recipe manually"

## RECP-007
**Requirement:** A user can delete a recipe.  
**Test:** `playwright/recipes.spec.ts` — "RECP-007: delete a recipe"

## RECP-008
**Requirement:** Selecting a recipe suggestion when logging a meal pre-populates the pantry update step with that recipe's ingredients.  
**Test:** `playwright/recipes.spec.ts` — "RECP-008: recipe suggestion pre-populates pantry update with recipe ingredients"

## RECP-009
**Requirement:** Each recipe has an optional cuisine field. The recipe list can be filtered by cuisine.  
**Test:** `playwright/recipes.spec.ts` — "RECP-009: recipe cuisine saved and filtered"
