# Requirements Document

## Introduction

This feature converts hardcoded enum values for categories, race types, organization types, and person types into league-scoped reference data stored in MongoDB. Each league can independently define and administer its own set of reference data values. Security-related roles (administrator, super_administrator, league_administrator) remain hardcoded in the codebase because they drive permissions and feature access. Person types (racer, volunteer, mentor, race_official) become league-level reference data alongside categories, race types, and organization types. An administrative UI allows league administrators to manage these reference data collections per league, and a migration converts existing hardcoded values into database records for each league.

## Glossary

- **System**: The Bike Racing League Management application
- **Reference_Data**: A named collection of configurable values (categories, race types, organization types, or person types) scoped to a specific League
- **Reference_Data_Item**: A single entry within a Reference_Data collection, consisting of a unique key, a display label, an optional description, and a sort order
- **Category_Reference**: A Reference_Data collection defining racer experience-based classifications for a League (e.g., cat1, cat2, beginner)
- **Race_Type_Reference**: A Reference_Data collection defining race format classifications for a League (e.g., crit, time_trial, road_race)
- **Organization_Type_Reference**: A Reference_Data collection defining organization classifications for a League (e.g., team, promoter, sponsor)
- **Person_Type_Reference**: A Reference_Data collection defining non-security role classifications for a League (e.g., racer, volunteer, mentor, race_official)
- **Security_Role**: A hardcoded role that drives application permissions and feature access (administrator, super_administrator, league_administrator); these remain in the codebase and are not stored as Reference_Data
- **League**: A top-level organizational entity representing a distinct racing league
- **League_Administrator**: An administrator scoped to one or more assigned Leagues with full administrative access within those Leagues
- **Super_Administrator**: A platform-wide administrator with unrestricted access to all operations
- **Active_League_Context**: The currently selected League that determines which data is displayed and operated upon

## Requirements

### Requirement 1: Reference Data Model

**User Story:** As a platform architect, I want reference data stored as league-scoped documents in the database, so that each league can independently define its own categories, race types, organization types, and person types.

#### Acceptance Criteria

1. THE System SHALL store Reference_Data_Items as documents in MongoDB with fields for key, label, description, sort order, reference data type, league association, and active status
2. THE System SHALL scope each Reference_Data_Item to exactly one League
3. THE System SHALL enforce uniqueness of Reference_Data_Item keys within the same League and reference data type combination
4. THE System SHALL support four reference data types: category, race_type, organization_type, and person_type
5. THE System SHALL store each Reference_Data_Item with a machine-readable key and a human-readable display label
6. WHEN a Reference_Data_Item is created without an explicit sort order, THE System SHALL assign the next sequential sort order within that League and reference data type

### Requirement 2: Security Role Separation

**User Story:** As a platform architect, I want security-related roles to remain hardcoded in the codebase separately from person types, so that permission checks remain compile-time verifiable and person type assignments are league-configurable.

#### Acceptance Criteria

1. THE System SHALL maintain administrator, super_administrator, and league_administrator as hardcoded Security_Roles in the application code
2. THE System SHALL store person types (racer, volunteer, mentor, race_official) as Reference_Data_Items scoped to a League
3. THE System SHALL treat Security_Roles and Person_Type_References as independent classifications that can be assigned to a Person simultaneously
4. THE System SHALL validate Security_Role assignments against the hardcoded list at compile time
5. THE System SHALL validate Person_Type_Reference assignments against the League-scoped Reference_Data at runtime

### Requirement 3: Category Reference Data Administration

**User Story:** As a league administrator, I want to manage the list of racer categories for my league, so that my league can define its own experience-based classification system.

#### Acceptance Criteria

1. WHEN a League_Administrator creates a Category_Reference item, THE System SHALL store it with a key, label, optional description, and sort order scoped to the Active_League_Context
2. WHEN a League_Administrator updates a Category_Reference item, THE System SHALL persist the updated label, description, and sort order without modifying the key
3. WHEN a League_Administrator deactivates a Category_Reference item, THE System SHALL mark it as inactive and preserve all historical data referencing that category
4. IF a League_Administrator attempts to create a Category_Reference item with a key that already exists in that League, THEN THE System SHALL reject the creation and notify the administrator of the duplicate key
5. WHEN the System displays category selection options (in Race forms, Person forms, Result forms), THE System SHALL populate the options from the active Category_Reference items for the Active_League_Context
6. THE System SHALL order Category_Reference items by their sort order value when displaying them in selection lists

### Requirement 4: Race Type Reference Data Administration

**User Story:** As a league administrator, I want to manage the list of race types for my league, so that my league can define its own race format classifications.

#### Acceptance Criteria

1. WHEN a League_Administrator creates a Race_Type_Reference item, THE System SHALL store it with a key, label, optional description, and sort order scoped to the Active_League_Context
2. WHEN a League_Administrator updates a Race_Type_Reference item, THE System SHALL persist the updated label, description, and sort order without modifying the key
3. WHEN a League_Administrator deactivates a Race_Type_Reference item, THE System SHALL mark it as inactive and preserve all historical data referencing that race type
4. IF a League_Administrator attempts to create a Race_Type_Reference item with a key that already exists in that League, THEN THE System SHALL reject the creation and notify the administrator of the duplicate key
5. WHEN the System displays race type selection options (in Race creation and editing forms), THE System SHALL populate the options from the active Race_Type_Reference items for the Active_League_Context
6. THE System SHALL order Race_Type_Reference items by their sort order value when displaying them in selection lists

### Requirement 5: Organization Type Reference Data Administration

**User Story:** As a league administrator, I want to manage the list of organization types for my league, so that my league can define its own organization classifications beyond the default set.

#### Acceptance Criteria

1. WHEN a League_Administrator creates an Organization_Type_Reference item, THE System SHALL store it with a key, label, optional description, and sort order scoped to the Active_League_Context
2. WHEN a League_Administrator updates an Organization_Type_Reference item, THE System SHALL persist the updated label, description, and sort order without modifying the key
3. WHEN a League_Administrator deactivates an Organization_Type_Reference item, THE System SHALL mark it as inactive and preserve all historical data referencing that organization type
4. IF a League_Administrator attempts to create an Organization_Type_Reference item with a key that already exists in that League, THEN THE System SHALL reject the creation and notify the administrator of the duplicate key
5. WHEN the System displays organization type selection options (in Organization creation and editing forms), THE System SHALL populate the options from the active Organization_Type_Reference items for the Active_League_Context
6. THE System SHALL order Organization_Type_Reference items by their sort order value when displaying them in selection lists

### Requirement 6: Person Type Reference Data Administration

**User Story:** As a league administrator, I want to manage the list of person types for my league, so that my league can define its own participant role classifications beyond the default set.

#### Acceptance Criteria

1. WHEN a League_Administrator creates a Person_Type_Reference item, THE System SHALL store it with a key, label, optional description, and sort order scoped to the Active_League_Context
2. WHEN a League_Administrator updates a Person_Type_Reference item, THE System SHALL persist the updated label, description, and sort order without modifying the key
3. WHEN a League_Administrator deactivates a Person_Type_Reference item, THE System SHALL mark it as inactive and preserve all historical Person type assignments referencing that person type
4. IF a League_Administrator attempts to create a Person_Type_Reference item with a key that already exists in that League, THEN THE System SHALL reject the creation and notify the administrator of the duplicate key
5. WHEN the System displays person type selection options (in Person forms), THE System SHALL populate the options from the active Person_Type_Reference items for the Active_League_Context
6. THE System SHALL order Person_Type_Reference items by their sort order value when displaying them in selection lists

### Requirement 7: Reference Data Admin UI

**User Story:** As a league administrator, I want a dedicated admin page for managing reference data, so that I can add, edit, reorder, and deactivate reference data items for my league in one place.

#### Acceptance Criteria

1. THE System SHALL provide an administrative page accessible to League_Administrators and Super_Administrators for managing Reference_Data
2. THE Reference_Data admin page SHALL display four tabs or sections: Categories, Race Types, Organization Types, and Person Types
3. WHEN a League_Administrator views the Reference_Data admin page, THE System SHALL display only Reference_Data_Items belonging to the Active_League_Context
4. THE Reference_Data admin page SHALL allow the administrator to create new Reference_Data_Items with a key, label, optional description, and sort order
5. THE Reference_Data admin page SHALL allow the administrator to edit the label, description, and sort order of existing Reference_Data_Items
6. THE Reference_Data admin page SHALL allow the administrator to deactivate Reference_Data_Items that are no longer needed
7. THE Reference_Data admin page SHALL display inactive items visually distinguished from active items
8. THE Reference_Data admin page SHALL allow the administrator to reactivate previously deactivated Reference_Data_Items

### Requirement 8: Reference Data API Endpoints

**User Story:** As a frontend developer, I want RESTful API endpoints for CRUD operations on reference data, so that the admin UI and other consumers can manage and retrieve reference data programmatically.

#### Acceptance Criteria

1. THE System SHALL provide a GET endpoint that returns all Reference_Data_Items for a given type and League, filtered by the Active_League_Context
2. THE System SHALL provide a POST endpoint that creates a new Reference_Data_Item within the Active_League_Context
3. THE System SHALL provide a PUT endpoint that updates an existing Reference_Data_Item's label, description, sort order, and active status
4. THE System SHALL provide a DELETE endpoint that permanently removes a Reference_Data_Item only when no existing records reference it
5. IF a DELETE request targets a Reference_Data_Item that is referenced by existing records, THEN THE System SHALL reject the deletion and return an error indicating the item is in use
6. THE System SHALL require League_Administrator or Super_Administrator authentication for all write operations on Reference_Data endpoints
7. THE System SHALL scope all Reference_Data API operations to the Active_League_Context derived from the authenticated user's session

### Requirement 9: Referential Integrity with Reference Data

**User Story:** As a platform architect, I want entities that reference categories, race types, organization types, and person types to store the reference data key, so that historical records remain valid even when reference data labels change.

#### Acceptance Criteria

1. THE System SHALL store the Reference_Data_Item key (not the label) in entities that reference categories, race types, organization types, or person types
2. WHEN the System displays a stored reference data key in the UI, THE System SHALL resolve the key to its current display label from the Reference_Data collection
3. WHEN a Reference_Data_Item's label is updated, THE System SHALL reflect the updated label in all views without modifying stored records
4. IF the System encounters a stored reference data key that does not match any active or inactive Reference_Data_Item for that League, THEN THE System SHALL display the raw key value as a fallback
5. THE System SHALL validate that reference data keys submitted in forms correspond to active Reference_Data_Items for the Active_League_Context before persisting records

### Requirement 10: Migration from Hardcoded Enums to Reference Data

**User Story:** As a platform operator, I want existing hardcoded enum values automatically migrated to league-scoped reference data records, so that all leagues have their initial reference data populated without manual setup.

#### Acceptance Criteria

1. WHEN the migration runs, THE System SHALL create Category_Reference items for each existing League from the current hardcoded values: cat1, cat2, cat3, cat4, cat5, beginner
2. WHEN the migration runs, THE System SHALL create Race_Type_Reference items for each existing League from the current hardcoded values: crit, time_trial, road_race, cyclocross, gravel, track
3. WHEN the migration runs, THE System SHALL create Organization_Type_Reference items for each existing League from the current hardcoded values: team, promoter, sponsor, other
4. WHEN the migration runs, THE System SHALL create Person_Type_Reference items for each existing League from the current hardcoded values: racer, volunteer, mentor, race_official
5. THE System SHALL assign human-readable labels to migrated items (e.g., key "cat1" receives label "Category 1", key "time_trial" receives label "Time Trial")
6. THE System SHALL assign sequential sort order values to migrated items matching their original declaration order
7. IF the migration encounters a League that already has Reference_Data_Items of a given type, THEN THE System SHALL skip creation for that type in that League to prevent duplicates
8. THE System SHALL complete the migration without modifying existing Race, Person, Organization, or Result records

### Requirement 11: Person Model Role Restructuring

**User Story:** As a platform architect, I want the Person model restructured to separate security roles from person types, so that security permissions remain code-driven while person type assignments reference league-scoped data.

#### Acceptance Criteria

1. THE System SHALL store Security_Roles (administrator, super_administrator, league_administrator) on the Person record as a dedicated security roles field
2. THE System SHALL store Person_Type_Reference assignments on the Person record as a separate field containing reference data keys scoped to a League
3. THE System SHALL allow a Person to hold zero or more Security_Roles simultaneously
4. THE System SHALL allow a Person to hold zero or more Person_Type_Reference assignments simultaneously
5. WHEN the System evaluates permissions and feature access, THE System SHALL use only the Security_Roles field
6. WHEN the System displays a Person's participant roles in the UI, THE System SHALL resolve the Person_Type_Reference keys to their display labels from the appropriate League's Reference_Data
7. THE System SHALL migrate existing person type values (racer, volunteer, mentor, race_official) from the current roles array into the new person types field during the migration

### Requirement 12: Default Reference Data for New Leagues

**User Story:** As a platform operator, I want new leagues to be initialized with a default set of reference data, so that league administrators have a useful starting point without manual setup.

#### Acceptance Criteria

1. WHEN a new League is created, THE System SHALL automatically create a default set of Category_Reference items: cat1, cat2, cat3, cat4, cat5, beginner
2. WHEN a new League is created, THE System SHALL automatically create a default set of Race_Type_Reference items: crit, time_trial, road_race, cyclocross, gravel, track
3. WHEN a new League is created, THE System SHALL automatically create a default set of Organization_Type_Reference items: team, promoter, sponsor, other
4. WHEN a new League is created, THE System SHALL automatically create a default set of Person_Type_Reference items: racer, volunteer, mentor, race_official
5. THE System SHALL assign the same human-readable labels and sort orders to default items as those used in the migration
6. THE League_Administrator SHALL be able to modify or deactivate any default Reference_Data_Items after League creation
