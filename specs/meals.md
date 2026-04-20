# Meal specs

## MEAL-001
**Requirement:** A user can log a meal with a name, datetime, and meal type.  
**Test:** `playwright/flow.spec.ts` — "add meal + update pantry + save recipe"

## MEAL-002
**Requirement:** When no meal type is selected, it is auto-inferred from the time of day.  
**Test:** not yet covered

## MEAL-003
**Requirement:** The meal name input shows autocomplete suggestions from past meals and saved recipes.  
**Test:** not yet covered

## MEAL-004
**Requirement:** When "Update pantry" is toggled on, logging a meal redirects to the pantry update step.  
**Test:** `playwright/flow.spec.ts` — "add meal + update pantry + save recipe"

## MEAL-005
**Requirement:** A user can edit a logged meal's name, datetime, and meal type.  
**Test:** not yet covered

## MEAL-006
**Requirement:** A user can delete a logged meal.  
**Test:** not yet covered

## MEAL-007
**Requirement:** The meal log is displayed grouped by day, ordered most recent first.  
**Test:** not yet covered
