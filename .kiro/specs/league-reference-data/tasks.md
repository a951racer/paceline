# Implementation Plan: League Reference Data

## Overview

Replace hardcoded TypeScript enums for categories, race types, organization types, and person types with league-scoped reference data stored in MongoDB. This involves creating a new ReferenceData model and service, API routes, admin UI, migration script, Person model restructuring, and updating existing forms/validation to use dynamic reference data.

## Tasks

- [x] 1. Create the ReferenceData model and types
  - [x] 1.1 Define ReferenceData TypeScript interfaces and types
    - Add `ReferenceDataType` union type (`"category" | "race_type" | "organization_type" | "person_type"`) to `src/types/index.ts`
    - Add `ReferenceDataItem` interface with fields: `_id`, `key`, `label`, `description?`, `sortOrder`, `type`, `leagueId`, `isActive`, `createdAt`, `updatedAt`
    - Add `SecurityRole` type for the hardcoded roles: `"administrator" | "super_administrator" | "league_administrator"`
    - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.4_

  - [x] 1.2 Create the Mongoose ReferenceData model
    - Create `src/models/reference-data.model.ts` with `ReferenceDataDocument` interface and `ReferenceDataSchema`
    - Define compound unique index on `{ leagueId: 1, type: 1, key: 1 }`
    - Define query index on `{ leagueId: 1, type: 1, isActive: 1, sortOrder: 1 }`
    - Enable `timestamps: true`
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [x] 1.3 Create validation schemas for reference data
    - Create `src/lib/validations/reference-data.ts` with Zod schemas: `createReferenceDataSchema`, `updateReferenceDataSchema`
    - Create schema: key (lowercase alphanumeric + underscore, 1-30 chars), label (1-100 chars), description (optional), sortOrder (optional number), type (enum of four types)
    - Update schema: label (optional), description (optional), sortOrder (optional), isActive (optional boolean); key must NOT be updatable
    - _Requirements: 1.5, 3.2, 4.2, 5.2, 6.2_

- [x] 2. Implement ReferenceDataService
  - [x] 2.1 Create the core ReferenceDataService class
    - Create `src/services/reference-data.service.ts`
    - Implement `create()`: enforce unique key per league+type, auto-assign sortOrder if not provided
    - Implement `update()`: persist label/description/sortOrder/isActive; reject key changes
    - Implement `deactivate()`: set isActive=false
    - Implement `reactivate()`: set isActive=true
    - Implement `listActive()`: filter by leagueId, type, isActive=true, sort by sortOrder ascending
    - Implement `listAll()`: filter by leagueId, type, sort by sortOrder ascending
    - Implement `getByKey()`: find by leagueId, type, key
    - Implement `getNextSortOrder()`: find max sortOrder for league+type and return +1
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

  - [x] 2.2 Implement delete with referential integrity checks
    - Implement `delete()`: check for references in races (categories, raceType), people (category, personTypes), organizations (type), race_results (category)
    - If references exist, throw `REFERENCE_DATA_IN_USE` error with count
    - If no references, hard-delete the document
    - _Requirements: 8.4, 8.5_

  - [x] 2.3 Implement key resolution and validation helpers
    - Implement `resolveKeys()`: given a list of keys, return a Map<key, label> for all matching items (active or inactive); unmatched keys map to the raw key string
    - Implement `validateKeys()`: verify all provided keys exist as active items for the given league+type
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 2.4 Implement default seeding method
    - Implement `seedDefaults(leagueId)`: create the full default set (categories, race types, org types, person types) with proper labels and sort orders
    - Use the default values from the design document's "Default Reference Data Values" table
    - Skip creation if items already exist for that league+type (idempotent)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 2.5 Write property tests for ReferenceDataService
    - **Property 1: Reference data persistence round-trip**
    - **Property 2: Key uniqueness within league and type**
    - **Property 3: Auto-increment sort order**
    - **Property 4: Key immutability on update**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 3.1, 3.2, 3.4, 4.1, 4.2, 4.4, 5.1, 5.2, 5.4, 6.1, 6.2, 6.4**

  - [ ]* 2.6 Write property tests for deactivation, filtering, and delete
    - **Property 5: Deactivation preserves referencing records**
    - **Property 6: Active-only filtering scoped by league and type, sorted by sortOrder**
    - **Property 7: Delete blocked when item is referenced**
    - **Validates: Requirements 3.3, 3.5, 3.6, 4.3, 4.5, 4.6, 5.3, 5.5, 5.6, 6.3, 6.5, 6.6, 7.3, 8.1, 8.4, 8.5**

  - [ ]* 2.7 Write property tests for key resolution and validation
    - **Property 8: Key-to-label resolution with fallback**
    - **Property 9: Form validation rejects invalid or inactive keys**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 2.5, 11.6**

- [x] 3. Implement API routes for reference data
  - [x] 3.1 Create GET and POST route handler
    - Create `src/app/api/admin/reference-data/route.ts`
    - GET: extract `leagueId` and `type` from query params, call `listAll()` or `listActive()` based on optional `activeOnly` param, return JSON array
    - POST: parse body with `createReferenceDataSchema`, call `create()`, return 201 with created item
    - Both wrapped with `withAdmin` middleware and `withRateLimit`
    - Handle `REFERENCE_DATA_DUPLICATE_KEY` (409), `INVALID_REFERENCE_DATA_TYPE` (400), `LEAGUE_REQUIRED` (400)
    - _Requirements: 8.1, 8.2, 8.6, 8.7_

  - [x] 3.2 Create PUT and DELETE route handler for individual items
    - Create `src/app/api/admin/reference-data/[id]/route.ts`
    - PUT: parse body with `updateReferenceDataSchema`, call `update()`, return 200
    - DELETE: call `delete()`, return 204 on success
    - Handle `REFERENCE_DATA_NOT_FOUND` (404), `REFERENCE_DATA_IN_USE` (409)
    - Both wrapped with `withAdmin` middleware and `withRateLimit`
    - _Requirements: 8.3, 8.4, 8.5, 8.6_

  - [ ]* 3.3 Write unit tests for API route handlers
    - Test GET returns league-scoped items filtered by type
    - Test POST creates item and returns 201
    - Test PUT updates label/description/sortOrder
    - Test DELETE returns 409 when item is referenced
    - Test DELETE returns 204 when item is unreferenced
    - Test 403 for non-admin users
    - **Property 14: Write operations require admin authorization**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Restructure Person model and validation schemas
  - [x] 5.1 Update Person model with securityRoles and personTypes fields
    - Modify `src/models/person.model.ts`: add `securityRoles` field (String array, enum of security roles, default [])
    - Add `personTypes` field (String array, no enum constraint, default [])
    - Keep existing `roles` field temporarily for backward compatibility during migration
    - Update `PersonDocument` interface accordingly
    - _Requirements: 2.1, 2.2, 2.3, 11.1, 11.2, 11.3, 11.4_

  - [x] 5.2 Update Person TypeScript interfaces
    - Update `Person` interface in `src/types/index.ts`: add `securityRoles: SecurityRole[]` and `personTypes: string[]`
    - Mark `roles` as deprecated or optional during transition
    - _Requirements: 2.1, 2.2, 11.1, 11.2_

  - [x] 5.3 Update person validation schemas
    - Modify `src/lib/validations/person.ts`: replace `roles` enum with `securityRoles` (z.array of hardcoded enum) and `personTypes` (z.array(z.string()))
    - Keep both create and update schemas consistent
    - _Requirements: 2.4, 2.5, 11.1, 11.2_

  - [ ]* 5.4 Write property test for security role / person type independence
    - **Property 10: Security roles and person types are independent**
    - **Validates: Requirements 2.3, 11.3, 11.4, 11.5**

- [x] 6. Update validation schemas for races and organizations
  - [x] 6.1 Update race validation schemas
    - Modify `src/lib/validations/race.ts`: change `raceType` from `z.enum(raceTypeValues)` to `z.string().min(1)`
    - Change `categories` from `z.array(z.enum(categoryValues))` to `z.array(z.string().min(1))`
    - Remove hardcoded `raceTypeValues` and `categoryValues` arrays (or keep as documentation-only)
    - _Requirements: 9.1, 9.5_

  - [x] 6.2 Update organization validation schemas
    - Find and update organization validation: change `type` from enum to `z.string().min(1)`
    - _Requirements: 9.1, 9.5_

  - [x] 6.3 Add runtime reference data validation to Race API
    - In the race POST/PUT route handlers, after Zod validation passes, call `referenceDataService.validateKeys()` for raceType and categories before persisting
    - Return 422 `INVALID_REFERENCE_DATA_KEY` if validation fails
    - _Requirements: 9.5_

  - [x] 6.4 Add runtime reference data validation to Person API
    - In the person POST/PUT route handlers, validate `personTypes` against active person_type reference data for the league
    - Return 422 `INVALID_REFERENCE_DATA_KEY` if validation fails
    - _Requirements: 9.5, 2.5_

  - [x] 6.5 Add runtime reference data validation to Organization API
    - In the organization POST/PUT route handlers, validate `type` against active organization_type reference data
    - Return 422 `INVALID_REFERENCE_DATA_KEY` if validation fails
    - _Requirements: 9.5_

- [x] 7. Integrate seeding into league creation
  - [x] 7.1 Hook seeding into LeagueService.create()
    - Modify `src/services/league.service.ts`: after league document is created, call `referenceDataService.seedDefaults(league._id)`
    - Handle errors gracefully (log warning but don't fail league creation)
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]* 7.2 Write property test for default seeding on league creation
    - **Property 13: Default seeding on league creation**
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create migration script
  - [x] 9.1 Create the reference data migration script
    - Create `scripts/migrate-reference-data.ts`
    - For each existing league: seed default reference data items for all four types (skip if already exist)
    - For each person: split `roles` array into `securityRoles` (administrator, super_administrator, league_administrator) and `personTypes` (all others)
    - Log progress per league and per person batch
    - Handle duplicate key errors gracefully (skip and continue for idempotency)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 11.7_

  - [ ]* 9.2 Write property tests for migration logic
    - **Property 11: Migration idempotency**
    - **Property 12: Migration splits person roles correctly**
    - **Validates: Requirements 10.7, 11.7, 2.1, 2.2**

- [x] 10. Create the useReferenceData hook
  - [x] 10.1 Implement the useReferenceData React hook
    - Create `src/hooks/use-reference-data.ts`
    - Accept `type: ReferenceDataType` parameter
    - Fetch reference data from GET endpoint using `adminFetch` with the active league context
    - Return `{ items, activeItems, isLoading, resolveKey }` where `resolveKey` returns label or raw key fallback
    - Use React Query or SWR pattern consistent with existing hooks
    - _Requirements: 3.5, 3.6, 4.5, 4.6, 5.5, 5.6, 6.5, 6.6, 9.2, 9.4_

- [x] 11. Build the Reference Data admin UI
  - [x] 11.1 Create the Reference Data admin page
    - Create `src/app/(authenticated)/admin/reference-data/page.tsx`
    - Render four tabs: Categories, Race Types, Organization Types, Person Types
    - Each tab renders a `ReferenceDataTab` component with the appropriate type
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 11.2 Create the ReferenceDataTab component
    - Create `src/components/admin/reference-data-tab.tsx`
    - Accept `type: ReferenceDataType` prop
    - Display list of items using `useReferenceData` hook (show all items, including inactive)
    - Include create/edit form and item list
    - Visually distinguish inactive items (e.g., greyed-out with strikethrough or badge)
    - _Requirements: 7.3, 7.4, 7.7_

  - [x] 11.3 Create the ReferenceDataForm component
    - Create `src/components/admin/reference-data-form.tsx`
    - Fields: key (only for create, disabled on edit), label, description (optional), sortOrder (optional with auto-assign hint)
    - Submit calls POST (create) or PUT (edit) via `adminFetch`
    - Display validation errors and duplicate key errors
    - _Requirements: 7.4, 7.5_

  - [x] 11.4 Create the ReferenceDataList component
    - Create `src/components/admin/reference-data-list.tsx`
    - Display items sorted by sortOrder
    - Action buttons: Edit, Deactivate/Reactivate, Delete
    - Delete shows confirmation dialog; if blocked (in-use), show error message
    - Inactive items shown with visual distinction and Reactivate button
    - _Requirements: 7.5, 7.6, 7.7, 7.8_

- [x] 12. Update existing forms to use dynamic reference data
  - [x] 12.1 Update race forms to use useReferenceData
    - Modify race creation/editing page: replace hardcoded category and raceType dropdowns with options from `useReferenceData("category")` and `useReferenceData("race_type")`
    - Show only active items in dropdowns
    - _Requirements: 3.5, 4.5_

  - [x] 12.2 Update person forms to use useReferenceData
    - Modify person creation/editing page: replace hardcoded person type checkboxes/multi-select with options from `useReferenceData("person_type")`
    - Separate security role assignment (hardcoded options) from person type assignment (dynamic)
    - _Requirements: 6.5, 11.6_

  - [x] 12.3 Update organization forms to use useReferenceData
    - Modify organization creation/editing page: replace hardcoded organization type dropdown with options from `useReferenceData("organization_type")`
    - _Requirements: 5.5_

  - [x] 12.4 Update display components to resolve keys to labels
    - In views that display category, race type, organization type, or person type values, use `resolveKey()` from `useReferenceData` to show labels instead of raw keys
    - Ensure fallback to raw key when reference data item doesn't exist
    - _Requirements: 9.2, 9.3, 9.4_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1-14)
- Unit tests validate specific examples and edge cases
- The migration script (task 9) should be run after deploying tasks 1-7 to ensure the model and service are in place
- Test files should be placed in `tests/property/reference-data/` for property tests and `tests/unit/reference-data/` for unit tests
- Use `fast-check` for property-based testing (already available in devDependencies)
- Use `mongodb-memory-server` for in-memory MongoDB during tests
