# Implementation Plan: Bike Racing League

## Overview

A full-stack Next.js (TypeScript) application for managing amateur bike racing leagues, deployed on Heroku with MongoDB + TimescaleDB dual database strategy. The implementation proceeds from foundational scaffolding through core data models, authentication, business logic (standings, achievements, awards), branding, public pages, authenticated dashboards, and admin panels—finishing with integration testing.

## Tasks

- [x] 1. Project scaffolding and configuration
  - [x] 1.1 Initialize Next.js project with TypeScript and configure tooling
    - Create Next.js app with TypeScript, ESLint, Tailwind CSS
    - Install and configure: shadcn/ui, Lucide icons, Recharts, TanStack Query, TanStack Table, Zustand, React Hook Form, Zod, Framer Motion, Mapbox GL
    - Install backend deps: mongoose, pg (node-postgres), jsonwebtoken, bcrypt, helmet, morgan, next-auth
    - Install test deps: jest, @testing-library/react, fast-check, playwright
    - Configure path aliases, environment variables (.env.local template)
    - _Requirements: 15.1, 15.2, 15.3_

  - [x] 1.2 Set up project directory structure
    - Create folder structure: `src/app/`, `src/components/`, `src/lib/`, `src/services/`, `src/models/`, `src/middleware/`, `src/types/`, `tests/`
    - Create test directory structure: `tests/unit/`, `tests/property/`, `tests/integration/`, `tests/e2e/`
    - Set up barrel exports for shared types
    - _Requirements: 15.3_

  - [x] 1.3 Configure database connections
    - Create MongoDB connection utility with Mongoose (connection pooling, retry logic)
    - Create TimescaleDB connection utility with node-postgres (pool configuration)
    - Add environment variable validation for DB connection strings
    - _Requirements: 15.1_

  - [x] 1.4 Configure middleware stack
    - Set up Helmet security headers middleware
    - Set up Morgan HTTP logging middleware
    - Create rate limiting middleware (per-IP for public, per-user for admin)
    - _Requirements: 12.8_

- [x] 2. Database schemas and models
  - [x] 2.1 Create MongoDB schemas and models
    - Define Mongoose schema for `Person` with roles array, category, categoryHistory, auth fields, organizationIds
    - Define Mongoose schema for `Organization` with unique name index, type enum, memberIds
    - Define Mongoose schema for `Season` with date range, isActive flag
    - Define Mongoose schema for `Race` with location subdocument, raceType, competitionIds, status enum
    - Define Mongoose schema for `RaceResult` with unique compound index on {raceId, racerId}
    - Define Mongoose schema for `Competition` with eligibilityCriteria and scoringMethod subdocuments
    - Define Mongoose schema for `Standing` and `TeamStanding`
    - Define Mongoose schema for `Achievement` and `EarnedAchievement` with unique compound index on {achievementId, personId, seasonId}
    - Define Mongoose schema for `Award`, `AssignedAward`, and `PeerNomination` with nominatorId !== nomineeId validation
    - Define Mongoose schema for `CalculatedRecognition` and `EarnedRecognition`
    - Define Mongoose schema for `BrandingConfiguration`
    - _Requirements: 1.1, 2.1, 4.1, 5.1, 6.1, 6.14, 7.1, 8.1, 17.1, 18.1, 19.1_

  - [x] 2.2 Create TimescaleDB tables and hypertables
    - Create `standings_history` hypertable with person_id, competition_id, season_id, position, total_points, total_races
    - Create `team_standings_history` hypertable
    - Create `race_performance` hypertable with person_id, race_id, season_id, category, position, finish_time, points
    - Create appropriate indexes (person_id + time DESC)
    - Create database migration script
    - _Requirements: 6.1, 6.2, 17.2, 17.3_

  - [x] 2.3 Create Zod validation schemas for all API inputs
    - Create shared Zod schemas for Person, Organization, Season, Race, RaceResult, Competition, Achievement, Award, PeerNomination, BrandingConfiguration, CalculatedRecognition
    - Export validation schemas for use in both API routes and form validation
    - _Requirements: 1.1, 2.1, 4.1, 5.1, 7.1, 8.1, 19.6, 19.7_

- [x] 3. Authentication system
  - [x] 3.1 Implement JWT authentication utilities
    - Create JWT token generation (access + refresh tokens)
    - Create JWT verification middleware for protected routes
    - Implement token refresh logic
    - Create password hashing utilities (bcrypt)
    - _Requirements: 12.1, 12.8_

  - [x] 3.2 Implement auth API routes
    - `POST /api/auth/login` - Email/password login, return JWT
    - `POST /api/auth/register` - New user registration with email/password
    - `POST /api/auth/refresh` - Refresh access token
    - `POST /api/auth/forgot-password` - Initiate password reset
    - `POST /api/auth/reset-password` - Complete password reset
    - `POST /api/auth/google` - Google OAuth login
    - `POST /api/auth/apple` - Apple OAuth login
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.9_

  - [x] 3.3 Implement role-based authorization middleware
    - Create admin-only middleware that returns 403 for non-admin users
    - Create authenticated-only middleware that returns 401 for unauthenticated users
    - Wire auth middleware into API route handlers
    - _Requirements: 12.5, 12.6, 12.7_

  - [ ]* 3.4 Write property test for unauthenticated endpoint rejection
    - **Property 21: Unauthenticated endpoint rejection**
    - **Validates: Requirements 12.5, 12.6**

- [x] 4. Core services - People and Organizations
  - [x] 4.1 Implement PersonService
    - `create(data)` - Create person with name, contact info, optional roles
    - `update(id, data)` - Update person fields
    - `assignRoles(id, roles)` - Add roles to person
    - `removeRole(id, role)` - Remove single role preserving others and historical data
    - `getById(id)` - Fetch person by ID
    - `list(filters)` - List people with filtering
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.2 Implement OrganizationService
    - `create(data)` - Create organization with unique name and type
    - `update(id, data)` - Update organization fields
    - `addMember(orgId, personId)` - Associate person with organization
    - `removeMember(orgId, personId)` - Disassociate person preserving individual records
    - `getTeams()` - Get team-type organizations for standings
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 4.3 Implement admin API routes for People and Organizations
    - `POST/PUT/DELETE /api/admin/people` - CRUD people
    - `POST/PUT/DELETE /api/admin/organizations` - CRUD organizations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.5_

  - [ ]* 4.4 Write property test for role removal preserves other roles
    - **Property 13: Role removal preserves other roles**
    - **Validates: Requirements 1.4**

- [x] 5. Core services - Seasons and Races
  - [x] 5.1 Implement SeasonService
    - `create(data)` - Create season with overlap validation
    - `getActive()` - Return current active season
    - `validateNoOverlap(start, end)` - Check date range against existing seasons
    - `markInactive(seasonId)` - Deactivate season, preserve historical data
    - `activate(seasonId)` - Activate season ensuring single active invariant
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 5.2 Implement RaceService
    - `create(data)` - Create race with season association (by date range or explicit)
    - `update(id, data)` - Update race fields
    - `assignOfficials(raceId, personIds)` - Assign race officials
    - `assignVolunteers(raceId, personIds)` - Assign volunteers
    - `getUpcoming()` - Get upcoming scheduled races
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.3 Implement RaceResultService
    - `enter(raceId, results)` - Enter results with duplicate rejection and non-existent racer validation
    - `validate(result)` - Validate result data (racer exists, no duplicate)
    - `getByRace(raceId)` - Get all results for a race
    - `getByRacer(personId, seasonId)` - Get racer's results in a season
    - Trigger standings recalculation after result entry
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 5.4 Implement admin API routes for Seasons, Races, and Results
    - `POST/PUT/DELETE /api/admin/seasons` - CRUD seasons
    - `POST/PUT/DELETE /api/admin/races` - CRUD races
    - `POST/PUT /api/admin/races/[raceId]/results` - Enter/update race results
    - _Requirements: 18.1, 4.1, 5.1_

  - [ ]* 5.5 Write property tests for seasons
    - **Property 4: Race-season association by date range**
    - **Property 5: Season date range overlap rejection**
    - **Property 6: Single active season invariant**
    - **Validates: Requirements 4.6, 18.2, 18.3**

  - [ ]* 5.6 Write property tests for race results
    - **Property 10: Race result duplicate rejection**
    - **Property 11: Race result rejected for non-existent racer**
    - **Validates: Requirements 5.2, 5.4**

- [x] 6. Checkpoint - Core services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Standings computation engine
  - [x] 7.1 Implement CompetitionService
    - `create(data)` - Define competition with scoring method and eligibility criteria
    - `evaluateEligibility(raceResult, competition)` - Check if result qualifies for competition
    - `getActive()` - Get all active competitions
    - _Requirements: 6.12, 6.13, 6.14, 6.15, 6.16_

  - [x] 7.2 Implement StandingsService - Individual standings
    - `calculate(competitionId, seasonId)` - Compute standings for a competition by aggregating results, applying scoring method (points/time/position_average), supporting top-N counting
    - `recalculateAll(seasonId)` - Recalculate all standings for a season
    - Position ordering by total points descending
    - Insert standings history snapshot into TimescaleDB after each recalculation
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.13_

  - [x] 7.3 Implement StandingsService - Team standings
    - `calculateTeam(competitionId, seasonId)` - Aggregate member race results for team standings
    - Recalculate team standings when member added/removed from organization
    - _Requirements: 6.6, 6.7, 6.8, 6.9, 6.17_

  - [x] 7.4 Implement standings API routes (public)
    - `GET /api/standings` - Current standings for active season
    - `GET /api/standings/[seasonId]` - Historical standings
    - `GET /api/standings/team` - Team standings for active season
    - _Requirements: 6.3, 6.8, 6.18, 6.19_

  - [x] 7.5 Implement admin API routes for Competitions
    - `POST/PUT/DELETE /api/admin/competitions` - CRUD competitions
    - _Requirements: 6.14_

  - [ ]* 7.6 Write property tests for standings
    - **Property 1: Standings aggregation correctness**
    - **Property 2: Team standings equal sum of member contributions**
    - **Property 3: Eligibility criteria correctly filters results into competitions**
    - **Property 20: Standings grouped by category**
    - **Validates: Requirements 6.1, 6.2, 5.3, 6.6, 6.7, 6.17, 6.13, 6.15, 6.16, 6.4**

- [x] 8. Achievements, Awards, and Calculated Recognitions
  - [x] 8.1 Implement AchievementService
    - `define(data)` - Create achievement with trigger criteria and badge
    - `checkAndAward(personId, seasonId)` - Evaluate threshold, award if met, prevent duplicates (idempotent)
    - `getByPerson(personId)` - Get person's earned achievements
    - `resetForSeason(seasonId)` - Reset progress counters for new season
    - Wire automatic check after race result entry
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 8.2 Implement AwardService
    - `define(data)` - Create award with nomination type and badge
    - `assign(awardId, personId, seasonId)` - Admin-assign an award
    - `submitNomination(data)` - Submit peer nomination (validate no self-nomination)
    - `approveNomination(nominationId)` - Admin approves peer nomination, assigns award
    - _Requirements: 8.1, 8.2, 8.3, 8.6, 8.7, 8.8, 8.9, 8.10_

  - [x] 8.3 Implement CalculatedRecognitionService
    - `define(data)` - Create recognition with computation method and criteria
    - `compute(seasonId)` - Run all active recognitions for the season
    - `getMostImproved(seasonId, period)` - Compute most improved from standings history
    - `getBiggestMover(seasonId, period)` - Compute biggest single-period mover
    - Wire recalculation after standings update
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.7, 17.8_

  - [x] 8.4 Implement admin API routes for Achievements, Awards, and Recognitions
    - `POST/PUT/DELETE /api/admin/achievements` - CRUD achievements
    - `POST/PUT/DELETE /api/admin/awards` - CRUD awards
    - `POST/PUT /api/admin/awards/assign` - Assign awards
    - `GET/PUT /api/admin/nominations` - View/approve peer nominations
    - `POST/PUT/DELETE /api/admin/calculated-recognitions` - CRUD recognitions
    - _Requirements: 7.1, 8.1, 8.8, 17.1_

  - [x] 8.5 Implement peer nomination API route
    - `POST /api/nominations` - Submit peer nomination (authenticated users)
    - _Requirements: 8.6, 8.7_

  - [ ]* 8.6 Write property tests for achievements
    - **Property 7: Achievement threshold triggering**
    - **Property 8: Achievement uniqueness per person per season**
    - **Property 9: Achievement progress reset on season transition**
    - **Validates: Requirements 7.2, 7.4, 7.6, 18.5**

  - [ ]* 8.7 Write property test for self-nomination prevention
    - **Property 12: Self-nomination prevention**
    - **Validates: Requirements 8.7**

  - [ ]* 8.8 Write property tests for calculated recognitions
    - **Property 18: Most Improved Rider computation**
    - **Property 19: Biggest Mover computation**
    - **Validates: Requirements 17.2, 17.3**

- [x] 9. Trophy Case services and API
  - [x] 9.1 Implement Trophy Case API routes
    - `GET /api/people/[personId]/trophy-case` - Person's achievements and awards grouped by season
    - `GET /api/organizations/[orgId]/trophy-case` - Team trophy case aggregating member accomplishments
    - Handle team membership changes (add/remove person updates team trophy case)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13_

  - [ ]* 9.2 Write property tests for trophy case
    - **Property 14: Team trophy case aggregation**
    - **Property 15: Team trophy case membership round trip**
    - **Validates: Requirements 9.8, 9.9, 9.12, 9.13**

- [x] 10. Branding configuration system
  - [x] 10.1 Implement BrandingService
    - `get()` - Return current branding config (cached in Redis)
    - `update(data)` - Update branding with validation (exactly 3 main colors, 1-2 accent colors)
    - `uploadLogo(variant, file)` - Upload logo to S3/Cloudinary, validate format
    - `validateColors(colors)` - Validate color counts
    - Apply branding via CSS custom properties in ThemeProvider
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9_

  - [x] 10.2 Implement branding API routes
    - `GET /api/branding` - Public endpoint returning current branding config
    - `PUT /api/admin/branding` - Admin endpoint to update branding
    - _Requirements: 19.1, 19.5_

  - [x] 10.3 Create ThemeProvider component
    - React context provider that applies branding colors as CSS custom properties
    - Fetch branding on app load, apply to document root
    - Support light/dark mode toggle
    - _Requirements: 19.3, 19.4, 11.7_

  - [ ]* 10.4 Write property tests for branding validation
    - **Property 16: Branding color count validation**
    - **Property 17: Logo variant completeness validation**
    - **Validates: Requirements 19.6, 19.7, 19.9**

- [x] 11. Checkpoint - Backend services complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Public layout and navigation
  - [x] 12.1 Create PublicLayout and PublicNavBar components
    - Top navigation bar with league logo (from branding), links to Features, Leagues, About, Contact, and "Request a Demo" button
    - Responsive design (mobile hamburger menu)
    - Apply branding colors from ThemeProvider
    - _Requirements: 10.2, 10.3, 13.1, 13.5_

  - [x] 12.2 Create PublicFooter component
    - Copyright, Privacy Policy, Terms of Service, Support links
    - Social media icons
    - Value propositions row (Built for Racers, Stronger Together, Every Race Counts, All in One Place)
    - _Requirements: 10.11, 10.12_

- [x] 13. Public pages
  - [x] 13.1 Implement Landing Page
    - Hero section with cycling imagery, tagline, CTA buttons ("Explore Features", "Learn More")
    - Login card with email/password form, social login buttons (Google, Apple), forgot password link, create account link
    - Feature highlights section (Compete, Develop, Connect, Organize)
    - Value propositions section
    - Wire login form to POST /api/auth/login, redirect to /dashboard on success
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12, 10.13_

  - [x] 13.2 Implement Standings Page
    - Display current standings for active season grouped by category
    - Display team standings alongside individual standings
    - Show recent race results, earned achievements, awards, and calculated recognitions
    - Season selector for historical standings
    - Links to individual trophy cases
    - _Requirements: 6.3, 6.4, 6.5, 6.8, 6.10, 6.11, 6.18, 6.19, 7.3, 8.4, 17.5_

  - [x] 13.3 Implement Trophy Case pages
    - Person trophy case page (`/trophy-case/[personId]`) with achievements and awards grouped by season
    - Team trophy case page (`/trophy-case/team/[orgId]`) aggregating member accomplishments
    - Display badges alongside each achievement/award
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.7, 9.8, 9.9, 9.11_

  - [x] 13.4 Implement About Page
    - Static content page about the league
    - Accessible from navigation bar
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 13.5 Implement Academy Page
    - Development Academy program information
    - Accessible from navigation bar
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 13.6 Implement Features and Contact pages
    - Features page with platform capabilities
    - Contact page with contact information/form
    - _Requirements: 10.3, 13.1_

- [x] 14. Authenticated layout and navigation
  - [x] 14.1 Create AuthenticatedLayout with Sidebar
    - Sidebar navigation with links: Dashboard, Calendar, Races, Standings, Teams, Academy, Achievements, Mentors, Messages, Profile
    - Admin section in sidebar for administrators
    - User profile card at sidebar bottom (name, role, team, "View Profile" link)
    - Apply league logo from branding config
    - _Requirements: 11.4, 11.6, 13.2, 13.4, 13.6_

  - [x] 14.2 Create TopBar component
    - League name selector dropdown
    - Notification bell
    - User avatar
    - Light/dark mode toggle
    - _Requirements: 11.5, 11.7, 13.3_

  - [x] 14.3 Implement auth guard and redirect logic
    - Redirect unauthenticated users to landing page
    - Protect all /dashboard and /admin routes
    - _Requirements: 11.1, 11.2, 12.5, 12.7_

- [x] 15. User Dashboard - Registry pattern and variants
  - [x] 15.1 Implement dashboard registry pattern
    - Create `dashboardRegistry` array with `{ role, component, priority }` entries
    - Implement `resolveDashboard(userRoles)` function to select variant by priority
    - Register: Racer (priority 100), Administrator (priority 50), General (priority 0, fallback)
    - _Requirements: 11.3_

  - [x] 15.2 Implement Racer Dashboard
    - LeagueStandingWidget: current position, points, races, best finish, sparkline (Recharts)
    - NextRaceWidget: countdown timer (days, hours, minutes, seconds), race name, date, location
    - RecentResultsWidget: latest race results with position and race type icons
    - AchievementsWidget: earned badges with progress indicators, next to unlock
    - UpcomingEventsCarousel: horizontal scroll of upcoming race cards
    - Hero section with cycling imagery and quick-action buttons
    - _Requirements: 11.8, 11.9, 11.10, 11.11, 11.12, 11.13_

  - [x] 15.3 Implement Admin Dashboard
    - QuickActionsWidget: buttons for add results, manage people, manage races
    - RecentActivityWidget: feed of latest league activity
    - SeasonStatusWidget: current season info, upcoming race schedule
    - ActionItemsWidget: pending peer nominations, incomplete results, system alerts
    - _Requirements: 11.16, 11.17, 11.18, 11.19_

  - [x] 15.4 Implement General Dashboard
    - UpcomingEventsWidget: upcoming races with dates, names, locations
    - StandingsHighlightsWidget: top standings and recent news
    - RoleInfoWidget: role-specific content (volunteer assignments, mentorship, officiating)
    - AwardsWidget: user's earned awards and notifications
    - _Requirements: 11.20, 11.21, 11.22, 11.23_

- [x] 16. Admin panel pages
  - [x] 16.1 Implement Admin People management page
    - TanStack Table with person list, search, filter by role
    - Create/edit person form (React Hook Form + Zod validation)
    - Role assignment UI
    - Category assignment with history tracking
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3_

  - [x] 16.2 Implement Admin Organizations management page
    - Organization list with type filter
    - Create/edit form with unique name validation
    - Member management (add/remove people)
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 16.3 Implement Admin Races management page
    - Race list with filters (season, status, race type)
    - Create/edit race form with date, location, race type, category assignment
    - Official and volunteer assignment
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 16.4 Implement Admin Results entry page
    - Results entry form for a specific race (`/admin/races/[raceId]/results`)
    - Bulk result entry with racer lookup, position, finish time
    - Validation feedback (duplicate detection, non-existent racer errors)
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 16.5 Implement Admin Seasons management page
    - Season list with active indicator
    - Create/edit form with date range and overlap validation feedback
    - Activate/deactivate season controls
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 16.6 Implement Admin Competitions management page
    - Competition list with scoring method and eligibility summary
    - Create/edit form with eligibility criteria builder (category filter, race type filter, min races)
    - Scoring method configuration (points table, count-best-N)
    - _Requirements: 6.12, 6.14, 6.15, 6.16_

  - [x] 16.7 Implement Admin Achievements management page
    - Achievement list with threshold info
    - Create/edit form with trigger criteria and badge upload
    - _Requirements: 7.1_

  - [x] 16.8 Implement Admin Awards and Nominations pages
    - Award definition list, create/edit form with badge upload and nomination type selection
    - Peer nominations review page (approve/reject)
    - Award assignment interface
    - _Requirements: 8.1, 8.2, 8.8_

  - [x] 16.9 Implement Admin Branding page
    - Branding configuration form: league name, 3 main colors (color pickers), 1-2 accent colors
    - Logo upload for all 3 variants (square, horizontal, vertical)
    - Live preview of branding changes
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.8, 19.9_

- [x] 17. Checkpoint - All pages implemented
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Integration and end-to-end tests
  - [ ]* 18.1 Write integration tests for API routes
    - Test CRUD operations for all entity types against test database
    - Test auth flow: login → token → protected endpoint → expired token
    - Test standings recalculation pipeline: result entry → standings update → TimescaleDB insert
    - Test branding propagation
    - _Requirements: 12.1, 12.4, 12.5, 5.3, 6.2_

  - [ ]* 18.2 Write integration tests for error handling
    - Test consistent API error response format
    - Test domain-specific errors (duplicate result 409, season overlap 409, self-nomination 422)
    - _Requirements: 5.2, 5.4, 18.3, 8.7_

  - [ ]* 18.3 Write end-to-end tests with Playwright
    - Public page accessibility tests (standings, trophy cases, landing page without auth)
    - Admin workflow test (login → create race → enter results → verify standings)
    - Responsive layout verification (desktop + mobile viewports)
    - Navigation flow tests (sidebar links, public nav links)
    - _Requirements: 6.3, 9.5, 9.11, 10.1, 15.2_

- [x] 19. Final checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests use fast-check library and validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The dashboard registry pattern enables future role-based dashboard variants without modifying existing code
- TimescaleDB writes should be queued in Redis for retry if they fail (resilience)
- Branding configuration is cached in Redis for performance
