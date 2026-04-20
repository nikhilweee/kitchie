# Auth specs

## AUTH-001
**Requirement:** Submitting valid credentials creates a session and redirects to `/`.  
**Test:** not yet covered

## AUTH-002
**Requirement:** Submitting invalid credentials shows an error message and does not redirect.  
**Test:** not yet covered

## AUTH-003
**Requirement:** Any request to a protected route without a valid session redirects to `/login`.  
**Test:** not yet covered

## AUTH-004
**Requirement:** Logging out deletes the session cookie and redirects to `/login`.  
**Test:** not yet covered

## AUTH-005
**Requirement:** A user can update their display name from the profile page.  
**Test:** not yet covered

## AUTH-006
**Requirement:** A user can update their username; the new username must not already be taken.  
**Test:** not yet covered

## AUTH-007
**Requirement:** Changing password requires the current password, a new password (min 8 chars), and matching confirmation.  
**Test:** not yet covered
