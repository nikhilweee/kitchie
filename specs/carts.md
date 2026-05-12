# Carts specs

## CART-001
**Requirement:** A user can rename an existing cart via a bottom sheet pre-filled with the current name.  
**Test:** `playwright/carts.spec.ts` — "CART-001: rename a cart"

## CART-002
**Requirement:** A user can add a pantry item to a cart via the inline search bar on the list page; typing a name not in the pantry shows a free-text "Add X" option.  
**Test:** `playwright/carts.spec.ts` — "CART-002: add items to a cart via inline search"

## CART-003
**Requirement:** Creating a new cart redirects to the cart detail page and shows an empty state.  
**Test:** `playwright/carts.spec.ts` — "CART-003: create cart redirects to detail and shows empty state"

## CART-004
**Requirement:** A user can delete a cart from the rename sheet; it is removed from the cart list.  
**Test:** `playwright/carts.spec.ts` — "CART-004: delete a cart"

## CART-005
**Requirement:** A user can remove an individual item from a cart using the X button.  
**Test:** `playwright/carts.spec.ts` — "CART-005: remove an item from a cart"

## CART-006
**Requirement:** Marking an item as picked up moves it to the "Picked Up" section and reveals the Checkout button.  
**Test:** `playwright/carts.spec.ts` — "CART-006: toggling item as shopped moves it to Picked Up and shows Checkout"

## CART-007
**Requirement:** Checking out writes all picked-up items to the pantry, removes them from the cart, and shows a confirmation toast.  
**Test:** `playwright/carts.spec.ts` — "CART-007: checkout writes item to pantry and clears cart"

## CART-008
**Requirement:** The cart list page shows a "shopped/total" progress counter per cart that updates as items are checked off.  
**Test:** `playwright/carts.spec.ts` — "CART-008: progress counter on list page reflects shopped vs total"

## CART-009
**Requirement:** The free-text "Add X" option is suppressed when the item name already exists in the cart, preventing duplicates.  
**Test:** `playwright/carts.spec.ts` — "CART-009: duplicate item not added when already in cart"

## CART-011
**Requirement:** The "New cart" FAB opens the create cart modal; dismissing it without submitting leaves no cart created.  
**Test:** `playwright/carts.spec.ts` — "CART-011: FAB opens the new cart modal"

## CART-010
**Requirement:** Clicking a cart row on the list page navigates to that cart's detail page.  
**Test:** `playwright/carts.spec.ts` — "CART-010: clicking a cart row on the list page navigates to the cart detail page"

## CART-012
**Requirement:** Tapping the Carts bottom-nav tab from another tab returns to the last-viewed cart detail page; tapping the active Carts tab returns to the cart list.  
**Test:** `playwright/carts.spec.ts` — "CART-012: tapping Carts tab returns to last-viewed cart from another tab"

## CART-013
**Requirement:** When the carts list overflows the viewport, every cart is reachable by scrolling — the last cart is fully visible at maximum scroll (not occluded by the fixed bottom navigation or the New-cart FAB).  
**Test:** `playwright/carts.spec.ts` — "CART-013: carts list last item is reachable at max scroll"

## CART-014
**Requirement:** When a cart's item list overflows the viewport, every item is reachable by scrolling — the last item is fully visible at maximum scroll (not occluded by the fixed bottom navigation or the Checkout FAB when items are picked up).  
**Test:** `playwright/carts.spec.ts` — "CART-014: cart detail last item is reachable at max scroll"
