# Requirements Document

## Introduction

This feature extends the existing Bike Racing League platform to support multiple leagues within a single application instance. Currently, the system operates as a single-league platform where Seasons, Races, Standings, Achievements, and Awards exist in a global scope. With multi-league support, a new top-level "League" entity is introduced that serves as the container for all league activity. Seasons become owned by exactly one League, and Persons and Organizations enroll in specific League-Season combinations. All competitive data (Race Results, Standings, Achievements, Awards, Calculated Recognitions) is scoped to a League-Season combination. The existing league name selector dropdown in the authenticated top bar becomes functional for switching between leagues.

## Glossary

- **System**: The Bike Racing League Management application
- **League**: A top-level organizational entity representing a distinct racing league, serving as the container for Seasons and all associated competitive activity
- **Season**: A named time period with a start and end date that groups all league activity; a Season belongs to exactly one League
- **League_Season**: The combination of a specific League and a specific Season within that League, representing the scope for all competitive data, enrollments, and recognitions
- **Enrollment**: A many-to-many relationship associating a Person or Organization with a specific League_Season combination, granting participation in that league's season
- **Person**: An individual registered in the system who may hold one or more roles
- **Organization**: A group entity registered in the system, classified by type (Team, Promoter, Sponsor, or other)
- **Administrator**: A person with elevated privileges to manage league data
- **Super_Administrator**: A platform-wide administrator with unrestricted access to all operations including League creation, deletion, and League_Administrator assignment
- **League_Administrator**: An administrator scoped to one or more assigned Leagues, with full administrative access only within those Leagues
- **League_Selector**: The dropdown control in the authenticated top bar that allows a user to switch the active League context for viewing and managing data
- **Active_League_Context**: The currently selected League that determines which League_Season data is displayed and operated upon within the authenticated interface
- **Race_Result**: The outcome record for a racer in a specific race, scoped to a League_Season
- **Standing**: A computed ranking of racers within a Competition for a given League_Season
- **Achievement**: A milestone-based recognition triggered by quantifiable criteria within a League_Season
- **Award**: A subjective recognition assigned within a League_Season
- **Calculated_Recognition**: A data-driven recognition automatically computed from race data within a League_Season
- **Trophy_Case**: A dedicated page displaying Achievements and Awards earned, organized by League and Season
- **Competition**: A grouping of races whose results contribute to a specific standing within a League_Season

## Requirements

### Requirement 1: League Entity Management

**User Story:** As an administrator, I want to create and manage leagues, so that the platform can host multiple distinct racing leagues each with their own seasons and competitive data.

#### Acceptance Criteria

1. WHEN an Administrator creates a League, THE System SHALL store the League with a unique name, an optional description, and a creation timestamp
2. WHEN an Administrator updates a League, THE System SHALL persist the updated name and description while preserving all associated Seasons and Enrollments
3. THE System SHALL enforce uniqueness on League names across the entire application
4. THE System SHALL allow multiple Leagues to exist simultaneously
5. WHEN an Administrator deactivates a League, THE System SHALL mark the League as inactive and preserve all historical data associated with that League
6. IF an Administrator attempts to create a League with a name that already exists, THEN THE System SHALL reject the creation and notify the Administrator of the duplicate name

### Requirement 2: Season-League Association

**User Story:** As an administrator, I want Seasons to belong to exactly one League, so that each league can manage its own independent schedule of seasons without conflicts.

#### Acceptance Criteria

1. WHEN an Administrator creates a Season, THE System SHALL require the Administrator to select a parent League for that Season
2. THE System SHALL associate each Season with exactly one League
3. THE System SHALL allow multiple Seasons to exist within a single League
4. THE System SHALL enforce that only one Season per League is active at any given time
5. IF an Administrator attempts to create a Season whose date range overlaps with an existing Season in the same League, THEN THE System SHALL reject the creation and notify the Administrator of the conflict
6. THE System SHALL allow Seasons in different Leagues to have overlapping date ranges
7. WHEN the System displays Seasons in administrative views, THE System SHALL group Seasons by their parent League

### Requirement 3: Person Enrollment in League-Seasons

**User Story:** As an administrator, I want to enroll persons in specific league-season combinations, so that participation is tracked per league per season and persons can participate in multiple leagues.

#### Acceptance Criteria

1. WHEN an Administrator enrolls a Person in a League_Season, THE System SHALL create an Enrollment record associating that Person with the specified League and Season combination
2. THE System SHALL allow a Person to be enrolled in multiple League_Season combinations simultaneously
3. THE System SHALL allow a Person to be enrolled in League_Seasons across different Leagues simultaneously
4. WHEN an Administrator removes a Person's Enrollment from a League_Season, THE System SHALL disassociate that Person from the League_Season while preserving the Person's historical Race_Results, Achievements, and Awards within that League_Season
5. THE System SHALL prevent duplicate Enrollments for the same Person in the same League_Season
6. IF a Person is not enrolled in a League_Season, THEN THE System SHALL exclude that Person from Standings calculations and Achievement tracking for that League_Season
7. WHEN displaying enrolled Persons, THE System SHALL filter by the Active_League_Context and the selected Season

### Requirement 4: Organization Enrollment in League-Seasons

**User Story:** As an administrator, I want to enroll organizations in specific league-season combinations, so that teams, sponsors, and promoters are associated with the leagues and seasons they participate in.

#### Acceptance Criteria

1. WHEN an Administrator enrolls an Organization in a League_Season, THE System SHALL create an Enrollment record associating that Organization with the specified League and Season combination
2. THE System SHALL allow an Organization to be enrolled in multiple League_Season combinations simultaneously
3. THE System SHALL allow an Organization to be enrolled in League_Seasons across different Leagues simultaneously
4. WHEN an Administrator removes an Organization's Enrollment from a League_Season, THE System SHALL disassociate that Organization from the League_Season while preserving historical Team_Standings and Trophy_Case data
5. THE System SHALL prevent duplicate Enrollments for the same Organization in the same League_Season
6. WHEN a Team-type Organization is not enrolled in a League_Season, THE System SHALL exclude that Organization from Team_Standings calculations for that League_Season
7. WHEN displaying enrolled Organizations, THE System SHALL filter by the Active_League_Context and the selected Season

### Requirement 5: League-Season Scoping of Competitive Data

**User Story:** As a league organizer, I want all competitive data (race results, standings, achievements, awards, and calculated recognitions) scoped to a league-season combination, so that each league maintains its own independent competitive records.

#### Acceptance Criteria

1. WHEN an Administrator enters a Race_Result, THE System SHALL associate that Race_Result with the League_Season of the Race
2. THE System SHALL compute Standings within the scope of a single League_Season
3. THE System SHALL track Achievement progress within the scope of a single League_Season
4. WHEN an Achievement threshold is met by a Racer, THE System SHALL award the Achievement within the scope of the applicable League_Season
5. WHEN an Administrator assigns an Award, THE System SHALL associate that Award with the Active_League_Context and the active Season within that League
6. WHEN the System computes Calculated_Recognitions, THE System SHALL compute them within the scope of a single League_Season
7. THE System SHALL maintain independent Standings for the same Person across different Leagues
8. WHEN a Race is created, THE System SHALL associate the Race with a League_Season based on the Season's parent League

### Requirement 6: League Context Switching

**User Story:** As an authenticated user, I want to switch between leagues using the league selector dropdown in the top bar, so that I can view and manage data for different leagues I participate in.

#### Acceptance Criteria

1. THE League_Selector SHALL display the name of the currently active League in the authenticated top bar
2. WHEN an authenticated user opens the League_Selector, THE System SHALL display a list of all Leagues in which the user has at least one Enrollment
3. WHEN an authenticated user with the Administrator role opens the League_Selector, THE System SHALL display all Leagues regardless of Enrollment
4. WHEN a user selects a different League from the League_Selector, THE System SHALL update the Active_League_Context and refresh all displayed data to reflect the selected League
5. THE System SHALL persist the user's Active_League_Context across page navigations within the same session
6. WHEN a user logs in, THE System SHALL set the Active_League_Context to the League of the user's most recent Enrollment, or the first available League if no previous context exists
7. WHILE the Active_League_Context is set, THE System SHALL scope all data views (Dashboard, Standings, Races, Achievements, Awards) to the selected League

### Requirement 7: League-Scoped Standings Display

**User Story:** As a visitor, I want to view standings scoped to a specific league and season, so that I can follow the competitive progress of each league independently.

#### Acceptance Criteria

1. THE Standings_Page SHALL display Standings for a single League_Season at a time
2. THE Standings_Page SHALL provide a League selector for visitors to choose which League's standings to view
3. WHEN a visitor selects a League on the Standings_Page, THE System SHALL display Standings for the active Season of the selected League
4. THE Standings_Page SHALL allow visitors to switch between historical Seasons within the selected League
5. THE System SHALL display only enrolled Persons in the Standings for a given League_Season
6. THE System SHALL display only enrolled Team-type Organizations in the Team_Standings for a given League_Season
7. WHEN Race_Results are updated for a Race within a League_Season, THE System SHALL recalculate the Standings only for the affected League_Season

### Requirement 8: League-Scoped Trophy Case

**User Story:** As a visitor, I want to view a person's or team's trophy case organized by league and season, so that I can see accomplishments separated by each league they participate in.

#### Acceptance Criteria

1. THE Trophy_Case SHALL organize Achievements and Awards grouped first by League, then by Season within each League
2. THE Trophy_Case SHALL display the League name as a grouping header above the Seasons within that League
3. WHEN a Person earns an Achievement or receives an Award in a League_Season, THE System SHALL display it under the corresponding League and Season in the Trophy_Case
4. THE Team_Trophy_Case SHALL organize aggregated member Achievements and Awards grouped first by League, then by Season within each League
5. THE Trophy_Case SHALL display entries from all Leagues in which the Person has earned Achievements or Awards, regardless of the visitor's Active_League_Context

### Requirement 9: League-Scoped Races and Competitions

**User Story:** As an administrator, I want races and competitions scoped to a league-season, so that each league maintains its own race schedule and competition structure independently.

#### Acceptance Criteria

1. WHEN an Administrator creates a Race, THE System SHALL associate the Race with the Active_League_Context and the appropriate Season within that League
2. WHEN an Administrator creates a Competition, THE System SHALL associate the Competition with a specific League_Season
3. THE System SHALL allow different Leagues to define independent Competitions with different scoring methods and eligibility criteria
4. WHEN displaying Races in administrative views, THE System SHALL filter by the Active_League_Context
5. THE System SHALL allow the same Person to have Race_Results in multiple Leagues without conflict
6. WHEN an Administrator enters Race_Results, THE System SHALL validate that the Racer is enrolled in the League_Season associated with the Race

### Requirement 10: Migration of Existing Data

**User Story:** As a platform operator, I want existing data (seasons, results, standings, achievements, awards) migrated into a default league, so that current data is preserved and the system continues to function after multi-league support is added.

#### Acceptance Criteria

1. WHEN multi-league support is deployed, THE System SHALL create a default League using the existing Branding_Configuration league name
2. THE System SHALL associate all existing Seasons with the default League
3. THE System SHALL create Enrollment records for all existing Persons in the default League for each Season in which they have Race_Results, Achievements, or Awards
4. THE System SHALL create Enrollment records for all existing Organizations in the default League for each Season in which they have members with Race_Results
5. THE System SHALL associate all existing Race_Results, Standings, Achievements, Awards, and Calculated_Recognitions with the default League
6. THE System SHALL complete the migration without data loss or modification to existing competitive records
7. IF the migration encounters an error, THEN THE System SHALL log the error, halt the migration, and preserve the pre-migration state

### Requirement 11: League-Scoped Branding Configuration

**User Story:** As an administrator, I want each league to have its own branding configuration, so that the visual identity reflects the currently selected league.

#### Acceptance Criteria

1. THE System SHALL associate a Branding_Configuration with each League
2. WHEN an Administrator configures branding, THE System SHALL apply the configuration to the Active_League_Context
3. WHEN a user switches the Active_League_Context via the League_Selector, THE System SHALL apply the Branding_Configuration of the selected League to the interface
4. THE Standings_Page SHALL apply the Branding_Configuration of the League whose standings are being displayed
5. WHEN a new League is created, THE System SHALL initialize it with a default Branding_Configuration requiring the Administrator to complete the branding setup before the League is publicly visible

### Requirement 12: Administrative Role Hierarchy

**User Story:** As a platform operator, I want a tiered admin role system with super-administrators and league-administrators, so that platform-wide management is separated from league-specific management.

#### Acceptance Criteria

1. THE System SHALL support a Super_Administrator role that has unrestricted access to all platform operations including creating, modifying, and deleting Leagues
2. THE System SHALL support a League_Administrator role that has full administrative access only within Leagues to which they are assigned
3. WHEN a Super_Administrator assigns a Person the League_Administrator role, THE System SHALL require the Super_Administrator to specify one or more Leagues to which the League_Administrator is assigned
4. THE System SHALL allow a League_Administrator to be assigned to multiple Leagues
5. WHILE a League_Administrator is operating within an assigned League, THE System SHALL grant them full administrative privileges for that League's Seasons, Races, Results, Competitions, Achievements, Awards, Enrollments, Branding, and Calculated_Recognitions
6. WHILE a League_Administrator attempts to operate on a League to which they are not assigned, THE System SHALL deny the operation and display an authorization error
7. THE System SHALL restrict League creation, modification, and deletion to Super_Administrators only
8. THE System SHALL restrict League_Administrator assignment to Super_Administrators only
9. WHEN the League_Selector is displayed for a League_Administrator, THE System SHALL show only the Leagues to which they are assigned
10. THE System SHALL migrate the existing Administrator role: all current Administrators become Super_Administrators during the multi-league migration
