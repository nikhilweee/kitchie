# Pantry specs

## PANT-001
**Requirement:** A user can add a pantry item with a name, category, quantity type (estimate or count), quantity, unit, purchase date, and expiry date.  
**Test:** `playwright/pantry.spec.ts` — "PANT-001: add a pantry item and verify it appears in the list"

## PANT-002
**Requirement:** When adding an item, category and quantity type are inferred from the item name; the user can override both.  
**Test:** `playwright/pantry.spec.ts` — "PANT-002: category and quantity type inferred from name; user can override"

## PANT-003
**Requirement:** When adding an item, the expiry date is auto-calculated based on category; the user can override it.  
**Test:** `playwright/pantry.spec.ts` — "PANT-003: expiry date auto-calculated from category; user can override"

## PANT-004
**Requirement:** A user can edit an existing pantry item's name, category, quantity, unit, purchase date, and expiry date.  
**Test:** `playwright/pantry.spec.ts` — "PANT-004: edit an existing pantry item"

## PANT-005
**Requirement:** A user can delete a pantry item.  
**Test:** `playwright/pantry.spec.ts` — "PANT-005: delete a pantry item"

## PANT-006
**Requirement:** The pantry list can be filtered by a text search on item name.  
**Test:** `playwright/pantry.spec.ts` — "PANT-006: pantry list filtered by text search on item name"

## PANT-007
**Requirement:** The pantry list can be filtered by status (expiring soon, low stock) and by category.  
**Test:** `playwright/pantry.spec.ts` — "PANT-007: pantry list filtered by category"

## PANT-008
**Requirement:** In the pantry update step, selecting an existing pantry item initialises its quantity picker to the item's current stock value.  
**Test:** `playwright/pantry.spec.ts` — "PANT-008: count item shows correct quantity in update-pantry step", "PANT-008: estimate item shows correct zone in update-pantry step"

## PANT-009
**Requirement:** Finalising the pantry update step writes updated quantities to all selected pantry items and logs them as meal ingredients in a single action.  
**Test:** `playwright/pantry.spec.ts` — "PANT-009: finalizing pantry update step writes updated quantities"

## PANT-010
**Requirement:** A free-text ingredient typed in the pantry update step creates a new pantry item if no existing item with that name is found.  
**Test:** `playwright/pantry.spec.ts` — "PANT-010: free-text ingredient in pantry update step creates a new pantry item"
