# Implementation Plan: Multi-League Support

## Overview

This plan extends the existing Bike Racing League platform to support multiple independent leagues within a single application instance. A new League entity becomes the top-level container for all competitive activity. Seasons, Enrollments, Races, Results, Standings, Achievements, Awards, and Calculated Recognitions are scoped to a League-Season combination. A tiered administrative role system (Super_Admin / League_Admin) is introduced, and the existing league selector dropdown in the top bar becomes functional. Existing data is migrated into a default league.

## Tasks

- [x] 1. League and Enrollment data models
  - [x] 1.1 Create League MongoDB schema and model
    - Define Mongoose schema for `League` with name (unique), description, isActive, embedded branding subdocument, timestamps
    - Add unique index on `name` (case-insensitive)
    - Create TypeScript interface matching the design's `League` type
    - _Requirements: 1.1, 1.3, 11.1_

  - [x] 1.2 Create Enrollment MongoDB schema and model
    - Define Mongoose schema for `Enrollment` with entityType, entityId, leagueId, seasonId, enrolledAt, enrolledBy, isActive, timestamps
    - Add unique compound index on `{ entityType, entityId, leagueId, seasonId }`
    - Add index on `{ leagueId, seasonId, entityType }`
    - Add index on `{ entityId, entityType }`
    - _Requirements: 3.1, 3.5, 4.1, 4.5_

  - [x] 1.3 Modify existing schemas to add leagueId fields
    - Add `leagueId: ObjectId` (required) to Season schema with index `{ leagueId: 1, isActive: 1 }`
    - Add `leagueId: ObjectId` (required) to Race schema with index `{ leagueId: 1, date: 1 }`
    - Add `leagueId: ObjectId` (required) to RaceResult schema with index `{ leagueId: 1, seasonId: 1, racerId: 1 }`
    - Add `leagueId: ObjectId` (required) to Competition schema with index `{ leagueId: 1, seasonId: 1 }`
    - Add `leagueId: ObjectId` (required) to Standing and TeamStanding schemas
    - Add `leagueId: ObjectId` (required) to EarnedAchievement schema; update unique index to `{ achievementId, personId, seasonId, leagueId }`
    - Add `leagueId: ObjectId` (required) to AssignedAward schema with index `{ leagueId: 1, seasonId: 1 }`
    - Add `leagueId: ObjectId` (required) to EarnedRecognition schema
    - _Requirements: 2.1, 5.1, 5.2, 5.8_

  - [x] 1.4 Extend Person schema with adminScope field
    - Add `adminScope?: { type: 'super' | 'league', leagueIds?: ObjectId[] }` to Person schema
    - Add 'super_administrator' and 'league_administrator' to the roles enum
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 1.5 Create Zod validation schemas for League and Enrollment
    - League creation schema: name (required, min 2 chars), description (optional)
    - League update schema: partial of creation schema
    - Enrollment creation schema: entityType, entityId, leagueId, seasonId
    - _Requirements: 1.1, 3.1, 4.1_

  - [ ]* 1.6 Write property tests for League name uniqueness
    - **Property 1: League name uniqueness**
    - **Validates: Requirements 1.3, 1.6**

  - [ ]* 1.7 Write property test for League modification preserves data
    - **Property 2: League modification preserves associated data**
    - **Validates: Requirements 1.2, 1.5**

- [x] 2. LeagueService and LeagueAuthorizationService
  - [x] 2.1 Implement LeagueService
    - `create(data)` - Create league with unique name enforcement (case-insensitive), initialize default branding
    - `update(id, data)` - Update league name/description preserving associations
    - `deactivate(id)` - Mark league inactive, preserve all historical data
    - `getById(id)` - Fetch league by ID
    - `getByName(name)` - Fetch league by name
    - `listAll()` - List all leagues (for Super_Admin)
    - `listActive()` - List active leagues (for public selector)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Implement LeagueAuthorizationService
    - `canAccessLeague(userId, leagueId)` - Check if user can access a league (Super_Admin: always; League_Admin: only assigned leagues)
    - `isSuperAdmin(userId)` - Check super admin status from JWT claims
    - `isLeagueAdmin(userId, leagueId)` - Check league admin for specific league
    - `getAdminLeagues(userId)` - Get list of leagues a League_Admin is assigned to
    - `assignLeagueAdmin(personId, leagueIds)` - Assign League_Admin role with specific league assignments
    - `removeLeagueAdmin(personId)` - Remove League_Admin role
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

  - [x] 2.3 Implement League Authorization Middleware
    - Extract `leagueId` from query param or `X-League-Id` header
    - For Super_Admin: allow access to any league
    - For League_Admin: allow only if leagueId is in their assigned leagues (from JWT `adminScope.leagueIds`)
    - Return 403 `LEAGUE_ACCESS_DENIED` for unauthorized league access
    - Return 400 `LEAGUE_REQUIRED` if leagueId is missing on admin routes
    - Apply to all `/api/admin/*` routes
    - _Requirements: 12.5, 12.6, 12.7, 12.9_

  - [x] 2.4 Extend JWT payload with adminScope
    - Modify token generation to include `adminScope: { type, leagueIds }` in JWT payload
    - Update JWT verification to parse and expose adminScope to route handlers
    - Update token refresh to preserve adminScope claims
    - _Requirements: 12.1, 12.2_

  - [ ]* 2.5 Write property tests for League authorization
    - **Property 17: Super administrator unrestricted access**
    - **Property 18: League administrator access scoped to assigned leagues**
    - **Property 19: League CRUD restricted to super administrators**
    - **Validates: Requirements 12.1, 12.2, 12.5, 12.6, 12.7, 12.8**

- [x] 3. EnrollmentService
  - [x] 3.1 Implement EnrollmentService
    - `enrollPerson(personId, leagueId, seasonId)` - Create enrollment with duplicate prevention (return ENROLLMENT_DUPLICATE on conflict)
    - `enrollOrganization(orgId, leagueId, seasonId)` - Create enrollment for organizations with duplicate prevention
    - `removePerson(personId, leagueId, seasonId)` - Remove enrollment while preserving historical race results, achievements, awards
    - `removeOrganization(orgId, leagueId, seasonId)` - Remove org enrollment preserving historical team standings
    - `getPersonEnrollments(personId)` - Get all enrollments for a person (across all leagues)
    - `getOrganizationEnrollments(orgId)` - Get all enrollments for an organization
    - `listByLeagueSeason(leagueId, seasonId, type?)` - List enrollments filtered by league-season and optional entity type
    - `isPersonEnrolled(personId, leagueId, seasonId)` - Boolean check for person enrollment
    - `isOrgEnrolled(orgId, leagueId, seasonId)` - Boolean check for org enrollment
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 3.2 Write property tests for Enrollment
    - **Property 6: Enrollment uniqueness**
    - **Property 7: Enrollment removal preserves historical data**
    - **Property 8: Non-enrolled entities excluded from standings**
    - **Property 9: Enrollment filtering returns only enrolled entities**
    - **Validates: Requirements 3.4, 3.5, 3.6, 4.4, 4.5, 4.6, 7.5, 7.6**

- [x] 4. Checkpoint - Core league services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Modify existing services for league-scoping
  - [x] 5.1 Modify SeasonService for league-scoping
    - All CRUD methods accept and require `leagueId` parameter
    - Season overlap validation scoped to same `leagueId` (allow overlap across different leagues)
    - Active season check scoped per league (each league can have one active season)
    - `getActive(leagueId)` - Return active season for specific league
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 5.2 Modify RaceService for league-scoping
    - `create()` and `list()` require `leagueId`; associate league with race
    - Filter race queries by `leagueId`
    - _Requirements: 9.1, 9.4, 5.8_

  - [x] 5.3 Modify RaceResultService for league-scoping
    - `enter()` validates racer enrollment in the league-season before accepting result (return `NOT_ENROLLED` error if not enrolled)
    - Associates `leagueId` with race result record
    - _Requirements: 5.1, 9.6_

  - [x] 5.4 Modify StandingsService for league-scoping
    - `calculate()` scoped to league-season; filters standings by enrolled racers/teams only
    - Non-enrolled entities excluded from standings even if race results exist
    - Standings recalculation only affects the specific league-season (isolation)
    - _Requirements: 5.2, 5.7, 7.5, 7.6, 7.7_

  - [x] 5.5 Modify CompetitionService for league-scoping
    - `create()` requires league-season context
    - Competitions associated with specific league-season
    - _Requirements: 9.2, 9.3_

  - [x] 5.6 Modify AchievementService for league-scoping
    - `checkAndAward()` tracks progress per league-season
    - Achievement thresholds evaluated within league-season scope
    - _Requirements: 5.3, 5.4_

  - [x] 5.7 Modify AwardService for league-scoping
    - `assign()` scopes to active league-season context
    - _Requirements: 5.5_

  - [x] 5.8 Modify CalculatedRecognitionService for league-scoping
    - `compute()` scoped to league-season
    - _Requirements: 5.6_

  - [x] 5.9 Modify BrandingService for league-scoping
    - Read/write branding from League document embedded subdocument instead of standalone collection
    - `get(leagueId)` - Return branding for specific league
    - `update(leagueId, data)` - Update branding for specific league
    - Deprecate standalone branding collection usage
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 5.10 Write property tests for league-scoped seasons
    - **Property 3: Single active season per league invariant**
    - **Property 4: Season overlap rejection scoped to league**
    - **Property 5: Cross-league season overlap allowed**
    - **Validates: Requirements 2.4, 2.5, 2.6**

  - [ ]* 5.11 Write property tests for league-scoped competitive data
    - **Property 10: League-season isolation of competitive data**
    - **Property 11: Race result entry validates enrollment**
    - **Property 15: Standings recalculation isolation**
    - **Property 23: Cross-league race results without conflict**
    - **Validates: Requirements 5.2, 5.3, 5.6, 5.7, 7.7, 9.5, 9.6**

- [x] 6. Checkpoint - Modified services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. New API routes for leagues and enrollments
  - [x] 7.1 Implement League admin API routes
    - `GET /api/admin/leagues` - List all leagues (Super_Admin only)
    - `POST /api/admin/leagues` - Create new league (Super_Admin only)
    - `PUT /api/admin/leagues/[leagueId]` - Update league name/description (Super_Admin only)
    - `PATCH /api/admin/leagues/[leagueId]/deactivate` - Deactivate league (Super_Admin only)
    - Return 403 for non-Super_Admin users attempting these operations
    - _Requirements: 1.1, 1.2, 1.5, 12.7_

  - [x] 7.2 Implement public League API routes
    - `GET /api/leagues` - List active leagues (public, for standings page league selector)
    - `GET /api/leagues/[leagueId]/branding` - Get branding for a specific league (public)
    - _Requirements: 7.2, 11.4_

  - [x] 7.3 Implement Enrollment admin API routes
    - `GET /api/admin/enrollments` - List enrollments for active league-season (League_Admin+)
    - `POST /api/admin/enrollments/persons` - Enroll a person in league-season (League_Admin+)
    - `DELETE /api/admin/enrollments/persons/[personId]` - Remove person enrollment (League_Admin+)
    - `POST /api/admin/enrollments/organizations` - Enroll an organization (League_Admin+)
    - `DELETE /api/admin/enrollments/organizations/[orgId]` - Remove organization enrollment (League_Admin+)
    - _Requirements: 3.1, 3.4, 3.7, 4.1, 4.4, 4.7_

  - [x] 7.4 Implement user leagues API route
    - `GET /api/user/leagues` - Return leagues available to the current user
    - For non-admin users: return leagues where user has at least one enrollment
    - For League_Admin: return only assigned leagues
    - For Super_Admin: return all leagues
    - _Requirements: 6.2, 6.3, 12.9_

  - [x] 7.5 Implement League Admin assignment API routes
    - `POST /api/admin/people/[personId]/league-admin` - Assign League_Admin role with league assignments (Super_Admin only)
    - `DELETE /api/admin/people/[personId]/league-admin` - Remove League_Admin role (Super_Admin only)
    - _Requirements: 12.3, 12.4, 12.8_

  - [x] 7.6 Implement league branding admin API route
    - `PUT /api/admin/leagues/[leagueId]/branding` - Update league branding (League_Admin+)
    - _Requirements: 11.2_

  - [ ]* 7.7 Write property tests for API data scoping
    - **Property 12: API data scoping to active league context**
    - **Property 13: League selector shows enrolled leagues for non-admin users**
    - **Property 20: League admin selector shows only assigned leagues**
    - **Validates: Requirements 6.2, 6.7, 9.4, 12.9**

- [x] 8. Modify existing API routes for league-scoping
  - [x] 8.1 Modify Seasons API routes
    - `GET/POST/PUT/DELETE /api/admin/seasons` - Require `leagueId` query param; CRUD scoped to league
    - Season creation validates no overlap within same league
    - _Requirements: 2.1, 2.4, 2.5, 2.7_

  - [x] 8.2 Modify Races API routes
    - `GET/POST/PUT/DELETE /api/admin/races` - Require `leagueId`; associates races with league
    - Filter race listing by active league context
    - _Requirements: 9.1, 9.4_

  - [x] 8.3 Modify Race Results API routes
    - `POST /api/admin/races/[raceId]/results` - Validate racer enrollment in league-season before accepting
    - Associate `leagueId` with result records
    - _Requirements: 5.1, 9.6_

  - [x] 8.4 Modify Competitions API routes
    - `GET/POST/PUT/DELETE /api/admin/competitions` - Require `leagueId`; scope to league-season
    - _Requirements: 9.2, 9.3_

  - [x] 8.5 Modify Achievements and Awards API routes
    - Achievements scoped to league-season for earned achievements
    - Award assignment scoped to active league-season
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 8.6 Modify Standings public API routes
    - `GET /api/standings` - Accept `leagueId` query param for filtering
    - Return standings for active season of the specified league
    - _Requirements: 7.1, 7.3, 7.5, 7.6_

  - [x] 8.7 Modify Trophy Case API routes
    - `GET /api/people/[personId]/trophy-case` - Group by league then season
    - `GET /api/organizations/[orgId]/trophy-case` - Group by league then season
    - Display entries from all leagues regardless of active context
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 8.8 Modify Branding API route
    - Redirect `GET /api/branding` to league-specific branding based on active context or default league
    - `PUT /api/admin/branding` - Redirect to league-specific branding route
    - _Requirements: 11.3_

  - [ ]* 8.9 Write property test for Trophy Case grouping
    - **Property 14: Trophy case groups by league then season**
    - **Validates: Requirements 8.1, 8.3, 8.4**

  - [ ]* 8.10 Write property test for League branding switching
    - **Property 16: League branding switches with context**
    - **Validates: Requirements 11.3**

- [x] 9. Checkpoint - API routes complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. TimescaleDB schema changes
  - [x] 10.1 Add league_id columns to TimescaleDB tables
    - Add `league_id TEXT NOT NULL DEFAULT 'default'` to `standings_history` table
    - Add `league_id TEXT NOT NULL DEFAULT 'default'` to `team_standings_history` table
    - Add `league_id TEXT NOT NULL DEFAULT 'default'` to `race_performance` table
    - Create index `idx_standings_league` on `standings_history (league_id, person_id, competition_id, time DESC)`
    - Create index `idx_team_standings_league` on `team_standings_history (league_id, organization_id, competition_id, time DESC)`
    - Create index `idx_perf_league` on `race_performance (league_id, person_id, time DESC)`
    - _Requirements: 5.2, 5.7_

  - [x] 10.2 Update TimescaleDB write operations
    - Modify standings history insert to include `league_id`
    - Modify team standings history insert to include `league_id`
    - Modify race performance insert to include `league_id`
    - Update all TimescaleDB queries to filter by `league_id`
    - _Requirements: 5.2, 5.7, 7.7_

- [x] 11. Migration script
  - [x] 11.1 Implement MigrationService
    - `runMigration()` - Orchestrate full migration with error handling and rollback
    - `createDefaultLeague()` - Create default league from existing BrandingConfiguration (league name, logos, colors)
    - `migrateSeasons(leagueId)` - Add `leagueId` to all existing Season documents
    - `migrateRaces(leagueId)` - Add `leagueId` to all Race, RaceResult, Competition documents
    - `createEnrollments(leagueId)` - Create Enrollment records for persons with race results/achievements/awards in each season; create Enrollment records for organizations with members who have race results
    - `migrateStandings(leagueId)` - Add `leagueId` to Standing, TeamStanding, EarnedAchievement, AssignedAward, EarnedRecognition documents
    - `upgradeAdminRoles()` - Set all existing administrators to `adminScope: { type: 'super' }` (Super_Admin)
    - `verifyMigration()` - Count records before/after, verify no data loss, verify all documents have leagueId
    - Use MongoDB sessions for transactional safety where possible
    - Migration is idempotent: skip already-migrated records (check for existing leagueId field)
    - On error: log full context, halt migration, preserve pre-migration state
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 12.10_

  - [x] 11.2 Create migration CLI script
    - Create runnable migration script at `scripts/migrate-multi-league.ts`
    - Accept `--dry-run` flag for preview without writing
    - Log progress to console and file
    - Exit with error code on failure
    - _Requirements: 10.1, 10.6, 10.7_

  - [ ]* 11.3 Write property tests for migration
    - **Property 21: Migration creates enrollments from existing data**
    - **Property 22: Migration preserves data without loss**
    - **Validates: Requirements 10.3, 10.4, 10.6**

- [x] 12. Checkpoint - Backend and migration complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Frontend - Zustand league store and LeagueSelector
  - [x] 13.1 Create useLeagueStore Zustand store
    - Implement `LeagueState` interface: `activeLeagueId`, `activeLeagueName`, `availableLeagues`, `setActiveLeague`, `setAvailableLeagues`, `clearLeagueContext`
    - Persist `activeLeagueId` and `activeLeagueName` to `localStorage`
    - On login: set active league to user's most recent enrollment league or first available
    - On logout: clear league context
    - _Requirements: 6.4, 6.5, 6.6_

  - [x] 13.2 Create LeagueSelector component
    - Dropdown in authenticated TopBar showing currently active league name
    - On open: display list of available leagues from `useLeagueStore.availableLeagues`
    - On select: call `setActiveLeague(leagueId)` and trigger data refresh (invalidate TanStack Query caches)
    - For Super_Admin: show all leagues
    - For League_Admin: show only assigned leagues
    - For regular users: show leagues with enrollments
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 13.3 Create PublicLeagueSelector component
    - Dropdown on public Standings page for visitors to choose which league's standings to view
    - Fetches active leagues from `GET /api/leagues`
    - Does not require authentication
    - _Requirements: 7.2_

  - [x] 13.4 Wire league context into API calls
    - Modify TanStack Query hooks to include `leagueId` from `useLeagueStore` in all admin API requests (query param)
    - Invalidate all queries when active league changes
    - Include `leagueId` in query keys for proper cache separation
    - _Requirements: 6.7_

  - [x] 13.5 Fetch and set available leagues on auth
    - On login success: call `GET /api/user/leagues` and populate `useLeagueStore.availableLeagues`
    - Set initial active league from response
    - _Requirements: 6.2, 6.6_

- [x] 14. Frontend - Modified pages for league context
  - [x] 14.1 Modify TopBar to use functional LeagueSelector
    - Replace static league name text with interactive LeagueSelector component
    - Apply branding from active league's configuration
    - _Requirements: 6.1, 11.3_

  - [x] 14.2 Modify Sidebar and ThemeProvider for league branding
    - ThemeProvider sources branding from active league's embedded configuration
    - Sidebar logo updates when league context changes
    - CSS custom properties update on league switch
    - _Requirements: 11.3, 11.4_

  - [x] 14.3 Modify Admin Seasons page
    - Show only seasons for active league (pass `leagueId` to API)
    - Season creation form auto-associates with active league
    - _Requirements: 2.1, 2.7_

  - [x] 14.4 Modify Admin Races page
    - Filter races by active league context
    - Race creation associates with active league
    - _Requirements: 9.1, 9.4_

  - [x] 14.5 Modify Admin People page
    - Show enrollment status for active league-season
    - Add enrollment management controls (enroll/remove from league-season)
    - _Requirements: 3.7_

  - [x] 14.6 Modify public Standings page
    - Add PublicLeagueSelector for visitors to choose league
    - Display standings for active season of selected league
    - Allow switching between historical seasons within selected league
    - Show only enrolled persons/teams in standings
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 14.7 Modify Trophy Case pages
    - Group achievements and awards by league then season
    - Display league name as grouping header
    - Show entries from all leagues regardless of active context
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 14.8 Create League Admin page (Super_Admin only)
    - List all leagues with status (active/inactive)
    - Create/edit/deactivate league forms
    - League_Admin assignment interface (assign persons to leagues)
    - _Requirements: 1.1, 1.2, 1.5, 12.3, 12.7_

  - [x] 14.9 Create Enrollment Management panel
    - Admin component within People/Organizations pages for managing enrollments
    - Enroll/remove persons and organizations from active league-season
    - Display current enrollment status
    - _Requirements: 3.1, 3.4, 4.1, 4.4_

- [x] 15. Checkpoint - Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Integration and end-to-end tests
  - [ ]* 16.1 Write integration tests for league admin workflow
    - Test full workflow: create league → create season → enroll racer → enter results → verify standings scoped to league
    - Test league context switching propagation (switch league → verify API returns correct data)
    - Test authorization flow (league admin on unassigned league → 403)
    - _Requirements: 1.1, 2.1, 3.1, 5.2, 12.5, 12.6_

  - [ ]* 16.2 Write integration tests for enrollment flows
    - Test person enrollment create/remove with data preservation
    - Test organization enrollment create/remove with data preservation
    - Test duplicate enrollment rejection
    - Test enrollment filtering by league-season
    - _Requirements: 3.1, 3.4, 3.5, 4.1, 4.4, 4.5_

  - [ ]* 16.3 Write integration tests for migration script
    - Test migration against realistic test data (multiple seasons, races, results)
    - Verify default league creation from branding config
    - Verify enrollment record creation from existing race results
    - Verify admin role upgrade to Super_Admin
    - Verify idempotency (re-run produces no duplicates)
    - Test error halt behavior (partial failure preserves pre-migration state)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ]* 16.4 Write end-to-end tests with Playwright
    - League selector dropdown interaction and context switching
    - Public standings page league selector for visitors
    - Admin workflow within league context (create season, enter results, verify standings)
    - Trophy case display with multiple leagues (grouped by league then season)
    - Branding changes on league switch (verify CSS custom properties update)
    - _Requirements: 6.1, 6.4, 7.2, 8.1, 11.3_

- [x] 17. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests use fast-check library and validate universal correctness properties from the design document (23 properties total)
- The migration script must be run once in production after deployment; it is idempotent and safe to re-run
- All existing API routes gain leagueId scoping; backward compatibility is maintained via the default league
- The League selector in the TopBar (currently static) becomes the primary mechanism for league context switching
- Branding moves from standalone collection into League document as an embedded subdocument
