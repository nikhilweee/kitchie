# Pantry specs

## PANT-001
**Requirement:** A user can add a pantry item with a name, category, quantity type (estimate or count), quantity, unit, purchase date, and expiry date.  
**Test:** `playwright/flow.spec.ts` — "add meal + update pantry + save recipe"

## PANT-002
**Requirement:** When adding an item, category and quantity type are inferred from the item name; the user can override both.  
**Test:** not yet covered

## PANT-003
**Requirement:** When adding an item, the expiry date is auto-calculated based on category; the user can override it.  
**Test:** not yet covered

## PANT-004
**Requirement:** A user can edit an existing pantry item's name, category, quantity, unit, purchase date, and expiry date.  
**Test:** not yet covered

## PANT-005
**Requirement:** A user can delete a pantry item.  
**Test:** not yet covered

## PANT-006
**Requirement:** The pantry list can be filtered by a text search on item name.  
**Test:** not yet covered

## PANT-007
**Requirement:** The pantry list can be filtered by status (expiring soon, low stock) and by category.  
**Test:** not yet covered

## PANT-008
**Requirement:** In the pantry update step, selecting an existing pantry item initialises its quantity picker to the item's current stock value.  
**Test:** `playwright/pantry-update.spec.ts` — "count item shows correct quantity in update-pantry step", "estimate item shows correct zone in update-pantry step"

## PANT-009
**Requirement:** Finalising the pantry update step writes updated quantities to all selected pantry items and logs them as meal ingredients in a single action.  
**Test:** `playwright/flow.spec.ts` — "add meal + update pantry + save recipe"

## PANT-010
**Requirement:** A free-text ingredient typed in the pantry update step creates a new pantry item if no existing item with that name is found.  
**Test:** not yet covered
