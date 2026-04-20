# Recipe specs

## RECP-001
**Requirement:** After finalising the pantry update step, a user can save the selected ingredients as a new recipe named after the meal.  
**Test:** `playwright/flow.spec.ts` — "add meal + update pantry + save recipe"

## RECP-002
**Requirement:** If a recipe with the same name already exists, the auto-save is skipped (no duplicate created).  
**Test:** not yet covered

## RECP-003
**Requirement:** When a meal is logged using an existing recipe and the ingredients differ, the user is offered the option to update the recipe.  
**Test:** not yet covered

## RECP-004
**Requirement:** The recipe list can be filtered by a text search on recipe name.  
**Test:** not yet covered

## RECP-005
**Requirement:** The recipe list can be filtered by meal type (breakfast, lunch, dinner, snack).  
**Test:** not yet covered

## RECP-006
**Requirement:** A user can manually edit a recipe's name, meal type, and ingredient list.  
**Test:** not yet covered

## RECP-007
**Requirement:** A user can delete a recipe.  
**Test:** not yet covered

## RECP-008
**Requirement:** Selecting a recipe suggestion when logging a meal pre-populates the pantry update step with that recipe's ingredients.  
**Test:** not yet covered
