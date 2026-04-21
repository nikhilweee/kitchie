# Settings specs

## SETT-001
**Requirement:** A hamburger button on the main tab pages (Meals, Pantry, Recipes) opens a sidebar with links to the Categories and Cuisines settings pages.  
**Test:** `playwright/settings.spec.ts` — "SETT-001: hamburger opens sidebar with settings links"

## SETT-002
**Requirement:** A user can add a custom pantry category with a name and shelf life (TTL in days); it appears in the category list and in the pantry item category dropdown.  
**Test:** `playwright/settings.spec.ts` — "SETT-002: add a custom category"

## SETT-003
**Requirement:** A user can edit an existing category's name and shelf life.  
**Test:** `playwright/settings.spec.ts` — "SETT-003: edit a category name and TTL"

## SETT-004
**Requirement:** A user can delete a category that has no pantry items using it.  
**Test:** `playwright/settings.spec.ts` — "SETT-004: delete an unused category"

## SETT-005
**Requirement:** A category that has one or more pantry items cannot be deleted; its delete button is disabled.  
**Test:** `playwright/settings.spec.ts` — "SETT-005: cannot delete a category in use"

## SETT-006
**Requirement:** A user can add a custom cuisine; it appears in the cuisine list and in the recipe cuisine dropdown.  
**Test:** `playwright/settings.spec.ts` — "SETT-006: add a custom cuisine"

## SETT-007
**Requirement:** A user can edit an existing cuisine's name.  
**Test:** `playwright/settings.spec.ts` — "SETT-007: edit a cuisine name"

## SETT-008
**Requirement:** A cuisine that has one or more recipes cannot be deleted; its delete button is disabled.  
**Test:** `playwright/settings.spec.ts` — "SETT-008: cannot delete a cuisine in use"
