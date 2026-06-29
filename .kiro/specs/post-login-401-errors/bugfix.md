# Bugfix Requirements Document

## Introduction

After the multi-league-support feature was implemented, all authenticated admin pages return 401 Unauthorized errors immediately after a successful login. The root cause is that the frontend admin pages make API calls to `/api/admin/*` routes using plain `fetch()` without including the `Authorization: Bearer <token>` header. The `withAdmin` middleware extracts the token from `request.headers.get("authorization")` and returns 401 when it's null. Additionally, several routes protected by the new `withLeagueAuth` middleware also require a `leagueId` parameter which is not being sent by the admin pages.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an authenticated user navigates to any admin page (Awards, Races, People, Competitions, etc.) THEN the system returns 401 Unauthorized on all `/api/admin/*` fetch calls because the frontend does not include the `Authorization: Bearer <token>` header in requests

1.2 WHEN the frontend admin pages call `fetch("/api/admin/...")` THEN the request is sent without any Authorization header, causing `withAdmin` middleware to fail token extraction and return 401

1.3 WHEN an authenticated user navigates to admin pages that call routes protected by `withLeagueAuth` (enrollments, league branding) THEN the system returns 401 because both the Authorization header and leagueId parameter are missing from the request

### Expected Behavior (Correct)

2.1 WHEN an authenticated user navigates to any admin page THEN the system SHALL include the JWT access token (stored in `localStorage` under "accessToken") as an `Authorization: Bearer <token>` header in all `/api/admin/*` fetch calls, and the API SHALL return the requested data successfully

2.2 WHEN the frontend admin pages make API calls to `/api/admin/*` routes THEN the requests SHALL automatically include the `Authorization: Bearer <token>` header sourced from the stored access token in localStorage

2.3 WHEN an authenticated user navigates to admin pages that call routes protected by `withLeagueAuth` THEN the requests SHALL include both the Authorization header AND the `leagueId` query parameter (from the active league context in `useLeagueStore`)

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user is not authenticated (no accessToken in localStorage) THEN the system SHALL CONTINUE TO redirect to the login page without making API calls

3.2 WHEN a user's JWT token expires THEN the system SHALL CONTINUE TO return 401 from the API and the frontend SHALL CONTINUE TO handle the expired token appropriately

3.3 WHEN the `/api/user/leagues` endpoint is called from `useLeagueInit` THEN it SHALL CONTINUE TO include the Authorization header as it currently does (this call already works correctly)

3.4 WHEN a non-admin user attempts to access admin routes THEN the system SHALL CONTINUE TO return 403 Forbidden after successful authentication

3.5 WHEN the `withLeagueAuth` middleware receives a request without a leagueId THEN it SHALL CONTINUE TO return 400 LEAGUE_REQUIRED

---

### Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AdminPageFetchRequest
  OUTPUT: boolean
  
  // Returns true when an admin page makes an API call without the Authorization header
  RETURN X.headers.get("authorization") = null
    AND X.url.startsWith("/api/admin/")
    AND localStorage.getItem("accessToken") != null
END FUNCTION
```

### Property Specification

```pascal
// Property: Fix Checking - Admin API calls include Authorization header
FOR ALL X WHERE isBugCondition(X) DO
  result ← fetchWithFix(X)
  ASSERT result.request.headers.get("authorization") = "Bearer " + localStorage.getItem("accessToken")
  ASSERT result.response.status != 401 OR token_is_expired(localStorage.getItem("accessToken"))
END FOR
```

### Preservation Goal

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

This ensures that for all requests that are either non-admin routes, unauthenticated requests (no token in localStorage), or already properly formed requests, the fixed code behaves identically to the original.
