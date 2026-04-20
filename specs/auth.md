# Auth specs

## AUTH-001
**Requirement:** Submitting valid credentials creates a session and redirects to `/meals`.  
**Test:** `playwright/auth.spec.ts` — "AUTH-001: valid credentials create session and redirect to /"

## AUTH-002
**Requirement:** Submitting invalid credentials shows an error message and does not redirect.  
**Test:** `playwright/auth.spec.ts` — "AUTH-002: invalid credentials show error and do not redirect"

## AUTH-003
**Requirement:** Any request to a protected route without a valid session redirects to `/login`.  
**Test:** `playwright/auth.spec.ts` — "AUTH-003: unauthenticated request to / redirects to /login"

## AUTH-004
**Requirement:** Logging out deletes the session cookie and redirects to `/login`.  
**Test:** `playwright/auth.spec.ts` — "AUTH-004: logout deletes session and redirects to /login"

## AUTH-005
**Requirement:** A user can update their display name from the profile page.  
**Test:** `playwright/auth.spec.ts` — "AUTH-005: user can update display name"

## AUTH-006
**Requirement:** A user can update their username; the new username must not already be taken.  
**Test:** `playwright/auth.spec.ts` — "AUTH-006: username change succeeds; username must be unique"

## AUTH-007
**Requirement:** Changing password requires the current password, a new password (min 8 chars), and matching confirmation.  
**Test:** `playwright/auth.spec.ts` — "AUTH-007: password change requires current password, match, and min 8 chars"
