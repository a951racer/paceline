# Post-Login 401 Errors Bugfix Design

## Overview

After the multi-league-support feature was implemented, all authenticated admin pages return 401 Unauthorized errors immediately after a successful login. The root cause is that admin page components use plain `fetch()` without including the `Authorization: Bearer <token>` header. The fix introduces an `adminFetch` utility function that automatically attaches the JWT token from `localStorage` and the `leagueId` from the Zustand store to all admin API calls.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when an admin page makes a `fetch()` call to `/api/admin/*` without including the Authorization header, despite having a valid token in localStorage
- **Property (P)**: The desired behavior — all admin fetch calls automatically include `Authorization: Bearer <token>` and receive successful responses (assuming a valid token)
- **Preservation**: Existing behavior that must remain unchanged — unauthenticated redirects, token expiry handling, the working `/api/user/leagues` call in `useLeagueInit`, and non-admin API calls
- **`withAdmin`**: The server-side middleware in `src/middleware/auth.ts` that extracts the Bearer token from `request.headers.get("authorization")` and returns 401 when absent or invalid
- **`useLeagueStore`**: The Zustand store in `src/hooks/use-league-store.ts` that persists the `activeLeagueId` to localStorage
- **`appendLeagueId`**: Existing helper in `src/hooks/use-league-query.ts` that appends `leagueId` as a query parameter to a URL

## Bug Details

### Bug Condition

The bug manifests when any admin page component calls `fetch("/api/admin/...")` without an Authorization header. The `withAdmin` middleware calls `request.headers.get("authorization")`, gets `null`, and returns a 401 response. Additionally, routes protected by `withLeagueAuth` middleware also fail because the `leagueId` parameter is missing.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { url: string, headers: Headers, localStorage: Storage, leagueStore: LeagueState }
  OUTPUT: boolean
  
  RETURN input.url.startsWith("/api/admin/")
         AND input.localStorage.getItem("accessToken") != null
         AND input.headers.get("authorization") = null
END FUNCTION
```

### Examples

- User logs in successfully → navigates to Admin Awards → `fetch("/api/admin/awards")` sent without Authorization header → 401 returned → page shows error
- User logs in → navigates to Admin Seasons → `fetch("/api/admin/seasons?leagueId=abc")` sent without Authorization header → 401 returned (leagueId present but token missing)
- User logs in → navigates to Admin Enrollments → `fetch("/api/admin/enrollments?leagueId=abc")` sent without Authorization header → 401 returned from `withLeagueAuth`
- User logs in → `useLeagueInit` calls `fetch("/api/user/leagues", { headers: { Authorization: "Bearer ..." } })` → 200 returned (this already works correctly)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The `useLeagueInit` hook's fetch to `/api/user/leagues` must continue to work exactly as before (it already includes the Authorization header manually)
- Unauthenticated users (no accessToken in localStorage) must continue to be redirected to the login page without making API calls
- Expired JWT tokens must continue to receive 401 responses from the API
- Non-admin users accessing admin routes must continue to receive 403 Forbidden
- The `withLeagueAuth` middleware must continue to return 400 when `leagueId` is missing
- Public API routes (e.g., `/api/standings`, `/api/branding`) must continue to work without authentication headers
- The `appendLeagueId` helper function behavior must remain unchanged

**Scope:**
All inputs that do NOT involve admin page fetch calls should be completely unaffected by this fix. This includes:
- Public page API calls
- Server-side API route logic
- Login/registration flows
- The existing `useLeagueInit` authenticated fetch pattern
- Direct browser navigation and Next.js routing

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Missing Authorization Header in Admin Pages**: All admin page components (Awards, Races, People, Competitions, Seasons, etc.) use bare `fetch()` calls like `fetch("/api/admin/awards")` without setting any Authorization header. The `withAdmin` middleware reads `request.headers.get("authorization")` and returns 401 when it's null.

2. **No Shared Authenticated Fetch Utility**: The `useLeagueInit` hook correctly includes the token (`headers: { Authorization: \`Bearer ${token}\` }`), but this pattern was never extracted into a reusable utility. Each admin page would need to manually add headers, which none of them do.

3. **Missing leagueId on League-Scoped Routes**: Some pages use `appendLeagueId` to add the `leagueId` query parameter, but still don't include the auth header. Routes protected by both `withAdmin` and `withLeagueAuth` fail at the first middleware (auth) before reaching the league check.

4. **Oversight During Multi-League Implementation**: The multi-league feature added new middleware (`withLeagueAuth`) and the Zustand store, but the existing admin pages were not updated to pass credentials in their fetch calls.

## Correctness Properties

Property 1: Bug Condition - Admin API Calls Include Authorization Header

_For any_ admin page fetch call where the bug condition holds (a request to `/api/admin/*` with a valid token in localStorage but no Authorization header), the fixed `adminFetch` utility SHALL automatically include the `Authorization: Bearer <token>` header in the request, resulting in successful authentication by the `withAdmin` middleware.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Non-Admin Fetch Behavior Unchanged

_For any_ input where the bug condition does NOT hold (public API calls, unauthenticated requests, the existing `useLeagueInit` fetch, or any non-admin route call), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for non-admin-page interactions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `src/lib/admin-fetch.ts` (NEW)

**Purpose**: Create an authenticated fetch utility for admin API calls

**Specific Changes**:
1. **Create `adminFetch` function**: A wrapper around `fetch()` that automatically reads the JWT token from `localStorage.getItem("accessToken")` and includes it as `Authorization: Bearer <token>` in the request headers.

2. **Include leagueId automatically**: Read `activeLeagueId` from `useLeagueStore.getState()` and append it as a `leagueId` query parameter to the URL (using the existing `appendLeagueId` pattern).

3. **Preserve existing headers**: If the caller passes `Content-Type` or other headers, merge them with the Authorization header rather than replacing them.

4. **Handle missing token gracefully**: If no token is found in localStorage, either throw an error or proceed without the header (the middleware will return 401 and the authenticated layout will redirect).

---

**Files**: All admin page components (multiple files)

**Specific Changes**:
5. **Replace `fetch()` with `adminFetch()`**: Update all `fetch("/api/admin/...")` calls in admin page components to use the new `adminFetch` utility. Remove manual `appendLeagueId` wrapping where `adminFetch` handles it automatically.

   Affected files:
   - `src/app/(authenticated)/admin/awards/page.tsx`
   - `src/app/(authenticated)/admin/races/page.tsx`
   - `src/app/(authenticated)/admin/races/[raceId]/results/page.tsx`
   - `src/app/(authenticated)/admin/people/page.tsx`
   - `src/app/(authenticated)/admin/seasons/page.tsx`
   - `src/app/(authenticated)/admin/competitions/page.tsx`
   - `src/app/(authenticated)/admin/organizations/page.tsx`
   - `src/app/(authenticated)/admin/enrollments/page.tsx`
   - `src/app/(authenticated)/admin/leagues/page.tsx`
   - `src/app/(authenticated)/admin/branding/page.tsx`
   - `src/app/(authenticated)/admin/results/page.tsx`
   - `src/app/(authenticated)/admin/achievements/page.tsx`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the root cause is the missing Authorization header.

**Test Plan**: Write unit tests that invoke the admin page fetch logic and assert that the Authorization header is present in outgoing requests. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Awards Page Fetch Test**: Call `fetch("/api/admin/awards")` as the awards page does — assert Authorization header is present (will fail on unfixed code)
2. **Seasons Page Fetch Test**: Call `fetch("/api/admin/seasons?leagueId=...")` as the seasons page does — assert Authorization header is present (will fail on unfixed code)
3. **Enrollments Page Fetch Test**: Call `fetch("/api/admin/enrollments?leagueId=...")` — assert both Authorization header and leagueId param are present (will fail on unfixed code)
4. **POST Request Test**: Call `fetch("/api/admin/awards", { method: "POST", headers: {"Content-Type": "application/json"} })` — assert Authorization header is present alongside Content-Type (will fail on unfixed code)

**Expected Counterexamples**:
- All admin fetch calls are missing the Authorization header
- The `withAdmin` middleware returns 401 because `request.headers.get("authorization")` is null

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed `adminFetch` function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := adminFetch(input.url, input.options)
  ASSERT result.request.headers.get("authorization") = "Bearer " + localStorage.getItem("accessToken")
  ASSERT result.request.url.includes("leagueId") OR route_does_not_require_leagueId(input.url)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various URL patterns, header combinations, token states)
- It catches edge cases that manual unit tests might miss (e.g., URLs with existing query params, unusual header combinations)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-admin calls and the existing `useLeagueInit` pattern, then write property-based tests capturing that behavior.

**Test Cases**:
1. **useLeagueInit Preservation**: Verify that `/api/user/leagues` calls continue to work with their manually-set Authorization header
2. **Public Route Preservation**: Verify that public API calls (e.g., `/api/standings`, `/api/branding`) continue to work without any auth headers
3. **Unauthenticated Redirect Preservation**: Verify that when no token exists in localStorage, the authenticated layout redirects to login
4. **Token Expiry Preservation**: Verify that expired tokens continue to receive 401 from the API

### Unit Tests

- Test `adminFetch` includes Authorization header from localStorage
- Test `adminFetch` includes leagueId from useLeagueStore when present
- Test `adminFetch` handles missing token (no accessToken in localStorage)
- Test `adminFetch` merges caller-provided headers with Authorization header
- Test `adminFetch` handles URLs with existing query parameters correctly
- Test `adminFetch` does not add leagueId when store has no active league

### Property-Based Tests

- Generate random admin URLs and verify `adminFetch` always includes the Authorization header when a token exists in localStorage
- Generate random RequestInit options (various methods, headers, body) and verify `adminFetch` preserves all caller-provided options while adding auth
- Generate random combinations of token presence/absence and leagueId presence/absence to verify correct header and param behavior across all states

### Integration Tests

- Test full admin page load flow: login → navigate to admin page → verify API calls succeed with 200
- Test league-scoped admin page: login → select league → navigate to seasons → verify both auth header and leagueId are present
- Test that switching leagues updates the leagueId in subsequent admin fetch calls
- Test that logging out and navigating to admin pages results in redirect (not 401 errors displayed on page)
