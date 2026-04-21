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
**Requirement:** A user can permanently delete a pantry item via the danger zone in the edit sheet (two-tap confirmation required).  
**Test:** `playwright/pantry.spec.ts` — "PANT-005: delete a pantry item permanently via danger zone"

## PANT-006
**Requirement:** The pantry list can be filtered by a text search on item name.  
**Test:** `playwright/pantry.spec.ts` — "PANT-006: pantry list filtered by text search on item name"

## PANT-007
**Requirement:** The pantry list can be filtered by status chips (Expiring soon, Running low) and by category via the filter dropdown.  
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

## PANT-011
**Requirement:** Sorting the pantry by name groups items under letter headers (A, B, C…).  
**Test:** `playwright/pantry.spec.ts` — "PANT-011: sorting by name groups items by first letter"

## PANT-012
**Requirement:** Sorting the pantry by category groups items under their category name as a header.  
**Test:** `playwright/pantry.spec.ts` — "PANT-012: sorting by category groups items by category name"

## PANT-013
**Requirement:** Sorting the pantry by expiry groups items into time-bucket headers: Expired, Next 7 days, Next 14 days, More than 14 days.  
**Test:** `playwright/pantry.spec.ts` — "PANT-013: sorting by expiry groups items into time buckets"

## PANT-014
**Requirement:** Setting a pantry item's quantity to 0 (count stepper or estimate picker set to empty) automatically marks it as consumed; it disappears from the default (active) list and appears under "Out of Stock".  
**Test:** `playwright/pantry.spec.ts` — "PANT-014 + PANT-015: qty=0 auto-consumes; qty>0 restores to active"

## PANT-015
**Requirement:** Setting a consumed pantry item's quantity to a value greater than 0 restores it to active status.  
**Test:** `playwright/pantry.spec.ts` — "PANT-014 + PANT-015: qty=0 auto-consumes; qty>0 restores to active"

## PANT-016
**Requirement:** The "Out of Stock" filter chip shows only consumed and discarded items, each with a status badge.  
**Test:** `playwright/pantry.spec.ts` — "PANT-016: Out of Stock filter chip shows consumed and discarded items with badge"

## PANT-017
**Requirement:** The Trash button in the edit sheet discards an active pantry item (soft delete; preserved for history).  
**Test:** `playwright/pantry.spec.ts` — "PANT-017: Trash button discards an active item"

## PANT-018
**Requirement:** The "Delete permanently" action requires two taps: a first tap reveals a confirmation row; a second tap on "Yes, delete" performs the deletion. Cancelling after the first tap reverts to the normal state.  
**Test:** `playwright/pantry.spec.ts` — "PANT-018: Delete permanently requires two-tap confirmation"

## PANT-019
**Requirement:** Navigating to `/pantry?edit=<id>` opens the edit sheet for that pantry item directly.  
**Test:** `playwright/pantry.spec.ts` — "PANT-019: ?edit=<id> deep-link opens pantry item edit sheet"
