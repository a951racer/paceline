# Requirements Document

## Introduction

A web application (with future mobile app support) for managing a bike racing league. The system tracks people in various roles (racers, volunteers, mentors, race officials, administrators), manages races and results, computes standings, and supports achievements and awards. All league activity is organized into Seasons, each with a defined date range. Public visitors can view standings without authentication, while administrators log in to manage all league data.

## Glossary

- **System**: The Bike Racing League Management application
- **Person**: An individual registered in the system who may hold one or more roles
- **Racer**: A person who participates in races
- **Volunteer**: A person who assists with race operations
- **Mentor**: A person who provides guidance to other participants
- **Race_Official**: A person who officiates races
- **Administrator**: A person with elevated privileges to manage league data
- **Organization**: A group entity registered in the system, classified by type (Team, Promoter, Sponsor, or other)
- **Team**: An Organization of type Team; an optional group of racers competing together for standings purposes
- **Promoter**: An Organization of type Promoter; an entity that organizes or promotes races
- **Sponsor**: An Organization of type Sponsor; an entity that provides financial or material support to the league, races, or people
- **Season**: A named time period with a start and end date that groups all league activity (Races, Race_Results, Standings, Achievements, Awards, Calculated_Recognitions) within that date range
- **Category**: An experience-based classification assigned to racers (e.g., Cat 1 through Cat 5)
- **Race_Type**: A classification for races indicating the format of competition (e.g., Crit, Time Trial, Road Race, Cyclocross, Gravel, Track)
- **Race**: A scheduled competitive event in which racers participate, classified by a Race_Type and associated with a Season
- **Race_Result**: The outcome record for a racer in a specific race, including placement and time
- **Standing**: A computed ranking of racers based on accumulated race results within a Competition for a given Season
- **Achievement**: A milestone-based recognition triggered by quantifiable criteria (e.g., number of races completed) within a Season
- **Award**: A subjective recognition given based on non-quantifiable criteria decided by administrators, assigned within a Season
- **Badge**: A small graphic image associated with an Achievement or Award, displayed wherever the Achievement or Award appears
- **Trophy_Case**: A dedicated page for each Person or Team-type Organization displaying all Achievements and Awards earned, organized by Season, with their associated Badges
- **Team_Trophy_Case**: A Trophy_Case for a Team-type Organization that aggregates all Achievements and Awards earned by the Team's members, attributed to the individual who earned each one
- **Team_Standing**: A computed ranking of Team-type Organizations based on the aggregated Race_Results of their members within a Competition for a given Season
- **Competition**: A grouping of races whose results contribute to a specific standing, with optional eligibility criteria that filter which Racers or Races qualify (e.g., Overall League Champion, Rookie Championship, Time Trial Cup, Attendance Championship)
- **Eligibility_Criteria**: Configurable rules on a Competition that determine which Racers or Races qualify for inclusion (e.g., first-year racers only, time trial races only)
- **Calculated_Recognition**: A data-driven recognition automatically computed from race data based on configurable criteria within a Season (e.g., Most Improved Rider, Biggest Mover)
- **Peer_Nomination**: A nomination submitted by a Person for another Person to receive a subjective Award
- **Landing_Page**: The unauthenticated public home page displaying league branding, a marketing message, feature highlights, a login form, social login options, account creation link, and a top navigation bar with links to Features, Leagues, About, and Contact
- **User_Dashboard**: The authenticated user's home page, displayed in one of three role-based variants: Racer Dashboard (for users with the Racer role, showing standings, results, achievements, and training), Admin Dashboard (for administrators without the Racer role, showing management tools and league activity), or General Dashboard (for all other authenticated users, showing upcoming events and role-specific information)
- **Standings_Page**: A dedicated public page displaying current standings for the active Season, recent race results, and earned achievements and awards for all active Competitions, with the ability to view historical Season standings
- **About_Page**: A public page containing detailed information about the league, accessible without authentication
- **Development_Academy_Page**: A public page containing information about the league's Development Academy program
- **Branding_Configuration**: Administrator-configurable visual identity settings for the league application, including league name, logo, main colors (3), and accent colors (1-2)
- **Navigation_Bar**: The top navigation element on public (unauthenticated) pages displaying the configured league logo and links to Features, Leagues, About, Contact, and a "Request a Demo" button
- **Sidebar**: The left navigation panel for authenticated users providing links to Dashboard, Calendar, Races, Standings, Teams, Academy, Achievements, Mentors, Messages, and Profile

## Requirements

### Requirement 1: Person Management

**User Story:** As an administrator, I want to add and manage people in the system, so that I can track all participants in the league.

#### Acceptance Criteria

1. WHEN an Administrator adds a new person, THE System SHALL create a Person record with a name and contact information
2. WHEN an Administrator assigns roles to a Person, THE System SHALL associate one or more roles (Racer, Volunteer, Mentor, Race_Official, Administrator) with that Person
3. THE System SHALL allow a Person to hold multiple roles simultaneously
4. WHEN an Administrator removes a role from a Person, THE System SHALL disassociate that role while preserving other assigned roles and historical data

### Requirement 2: Organization Management

**User Story:** As an administrator, I want to create and manage organizations (teams, promoters, sponsors, and others), so that the league can track all entities involved in racing operations.

#### Acceptance Criteria

1. WHEN an Administrator creates an Organization, THE System SHALL store the Organization with a unique name and a type (Team, Promoter, Sponsor, or other)
2. WHEN an Administrator assigns a Person to an Organization, THE System SHALL associate that Person with the specified Organization
3. THE System SHALL allow a Person to belong to multiple Organizations simultaneously
4. THE System SHALL allow a Racer to exist without a Team-type Organization assignment
5. WHEN an Administrator removes a Person from an Organization, THE System SHALL disassociate the Person from the Organization while preserving the Person's individual records and other Organization memberships
6. THE System SHALL distinguish Team-type Organizations for use in race standings

### Requirement 3: Racer Categorization

**User Story:** As an administrator, I want to assign categories to racers based on experience, so that racers compete against others of similar ability.

#### Acceptance Criteria

1. WHEN an Administrator assigns a Category to a Racer, THE System SHALL store the Category classification for that Racer
2. THE System SHALL support predefined Category levels (Cat 1 through Cat 5, and Beginner)
3. WHEN an Administrator updates a Racer's Category, THE System SHALL record the new Category and the date of change
4. WHERE USA Cycling integration is enabled, WHEN an Administrator provides a USA Cycling license number, THE System SHALL attempt to retrieve the Racer's category from USA Cycling's website

### Requirement 4: Race Management

**User Story:** As an administrator, I want to create and manage races within a season, so that the league has structured events for racers to compete in.

#### Acceptance Criteria

1. WHEN an Administrator creates a Race, THE System SHALL store the Race with a name, date, location, Race_Type, associated Competition, and associated Season
2. WHEN an Administrator assigns Race_Officials to a Race, THE System SHALL associate the specified Race_Officials with that Race
3. WHEN an Administrator assigns Volunteers to a Race, THE System SHALL associate the specified Volunteers with that Race
4. THE System SHALL support administrator-defined Race_Types, with predefined values including Crit, Time Trial, Road Race, Cyclocross, Gravel, and Track
5. THE System SHALL allow a Race to have multiple categories participating
6. THE System SHALL associate a Race with a Season based on the Race's date falling within the Season's date range, or by explicit Administrator assignment

### Requirement 5: Race Results Entry

**User Story:** As an administrator, I want to enter race results, so that standings can be calculated and displayed within the appropriate season.

#### Acceptance Criteria

1. WHEN an Administrator enters a Race_Result, THE System SHALL store the Racer, Race, finishing position, and finishing time
2. WHEN an Administrator enters a Race_Result for a Racer not registered in the system, THE System SHALL reject the entry and display an error message
3. WHEN an Administrator submits results for a Race, THE System SHALL recalculate the affected Standings for the Season associated with that Race
4. IF a duplicate Race_Result is entered for the same Racer and Race, THEN THE System SHALL reject the duplicate and notify the Administrator

### Requirement 6: Standings Calculation and Display

**User Story:** As a visitor, I want to view current individual and team standings for the active season on a dedicated standings page without logging in, so that I can follow the league's progress at both individual and team levels, and view historical season standings.

#### Acceptance Criteria

1. THE System SHALL compute Standings by aggregating Race_Results within each Competition for a given Season
2. WHEN Race_Results are updated, THE System SHALL recalculate the affected Standings for the Season associated with the updated Race_Results
3. THE Standings_Page SHALL display current Standings for the active Season for all active Competitions without requiring authentication
4. THE Standings_Page SHALL display Standings grouped by Category
5. THE System SHALL display each Racer's Team-type Organization affiliation alongside individual Standing entries
6. THE System SHALL compute Team_Standings by aggregating the Race_Results of all Racers who are members of each Team-type Organization within each Competition for the applicable Season
7. WHEN a Racer's Race_Result is recorded, THE System SHALL include that Race_Result in the Team_Standing for the Racer's Team-type Organization within the applicable Season
8. THE Standings_Page SHALL display Team_Standings alongside individual Standings for all active Competitions
9. WHEN a Racer is added to or removed from a Team-type Organization, THE System SHALL recalculate the affected Team_Standings
10. THE Standings_Page SHALL display recent Race_Results
11. THE Standings_Page SHALL display earned Achievements, assigned Awards, and Calculated_Recognitions for the displayed Season
12. THE System SHALL support multiple parallel Competitions simultaneously (e.g., Overall League Champion, Rookie Championship, Time Trial Cup, Attendance Championship, Team Championship)
13. WHEN a Race_Result is recorded, THE System SHALL evaluate the Race_Result against all active Competitions and include it in the Standings of each Competition whose Eligibility_Criteria the Race_Result satisfies
14. WHEN an Administrator defines a Competition, THE System SHALL store optional Eligibility_Criteria that filter which Racers or Races qualify for that Competition
15. THE System SHALL apply Eligibility_Criteria to include only qualifying Racers in a Competition's Standings (e.g., Rookie Championship includes only first-year Racers)
16. THE System SHALL apply Eligibility_Criteria to include only qualifying Races in a Competition's Standings (e.g., Time Trial Cup includes only Races with Race_Type of Time Trial)
17. THE System SHALL compute Team Championship Standings by aggregating Race_Results of all Team members across all qualifying Races within the Team Championship Competition for the applicable Season
18. THE Standings_Page SHALL default to displaying the active Season's Standings
19. THE Standings_Page SHALL allow visitors to select and view Standings from historical Seasons

### Requirement 7: Achievement Definition and Tracking

**User Story:** As an administrator, I want to define and track milestone-based achievements within a season, so that racers are recognized for participation milestones each season.

#### Acceptance Criteria

1. WHEN an Administrator defines an Achievement, THE System SHALL store the Achievement with a name, description, trigger criteria (number of races completed), and an associated Badge graphic
2. WHEN a Racer completes a Race within a Season and the total completed races in that Season meets an Achievement threshold, THE System SHALL award that Achievement to the Racer for that Season
3. THE System SHALL display earned Achievements with their associated Badge on the Standings_Page alongside Racer information
4. THE System SHALL prevent awarding the same Achievement to the same Racer more than once within the same Season
5. THE System SHALL display the Achievement Badge alongside the Achievement wherever it appears (Standings_Page, Trophy_Case)
6. THE System SHALL reset Achievement progress for each Racer at the start of each new Season

### Requirement 8: Award Definition and Assignment

**User Story:** As an administrator, I want to define and assign awards within a season based on subjective criteria, so that participants are recognized for non-quantifiable contributions, including awards nominated by peers.

#### Acceptance Criteria

1. WHEN an Administrator defines an Award, THE System SHALL store the Award with a name, description, an associated Badge graphic, and a nomination type (admin-assigned or peer-nominated)
2. WHEN an Administrator assigns an Award to a Person, THE System SHALL record the Award, the recipient, the date of assignment, the associated Season, and the nomination source (admin-assigned or peer-nominated)
3. THE System SHALL allow Awards to be assigned to any Person regardless of role
4. THE System SHALL display assigned Awards with their associated Badge on the Standings_Page
5. THE System SHALL display the Award Badge alongside the Award wherever it appears (Standings_Page, Trophy_Case)
6. WHEN a Person submits a Peer_Nomination for another Person, THE System SHALL record the nominating Person, the nominated Person, the Award, and the date of nomination
7. THE System SHALL prevent a Person from submitting a Peer_Nomination for themselves
8. WHEN a Peer_Nomination is submitted, THE System SHALL require an Administrator to approve the nomination before the Award is assigned
9. THE System SHALL track whether each assigned Award originated from an admin-assigned or peer-nominated source
10. THE System SHALL associate each assigned Award with the active Season at the time of assignment

### Requirement 9: Trophy Case Display

**User Story:** As a visitor, I want to view a person's or team's trophy case organized by season, so that I can see all achievements and awards earned across seasons in one place, including team-level aggregation of member accomplishments.

#### Acceptance Criteria

1. THE System SHALL provide a Trophy_Case page for each Person who has earned at least one Achievement or Award
2. THE Trophy_Case SHALL display all Achievements earned by the Person with their associated Badge, name, description, and Season
3. THE Trophy_Case SHALL display all Awards assigned to the Person with their associated Badge, name, date of assignment, and Season
4. THE Trophy_Case SHALL organize Achievements and Awards grouped by Season
5. THE Trophy_Case SHALL be accessible from the Standings_Page without requiring authentication
6. WHEN a new Achievement or Award is earned by a Person, THE System SHALL update that Person's Trophy_Case to include the new entry
7. THE System SHALL provide a Team_Trophy_Case page for each Team-type Organization that has at least one member who has earned an Achievement or Award
8. THE Team_Trophy_Case SHALL aggregate and display all Achievements earned by the Team's members, with each entry attributed to the individual member who earned it and grouped by Season
9. THE Team_Trophy_Case SHALL aggregate and display all Awards assigned to the Team's members, with each entry attributed to the individual member who received it and grouped by Season
10. WHEN a member of a Team-type Organization earns an Achievement or receives an Award, THE System SHALL update the Team_Trophy_Case to include the new entry attributed to that member
11. THE Team_Trophy_Case SHALL be accessible from the Standings_Page without requiring authentication
12. WHEN a Person joins a Team-type Organization, THE System SHALL add that Person's existing Achievements and Awards to the Team_Trophy_Case
13. WHEN a Person leaves a Team-type Organization, THE System SHALL remove that Person's Achievements and Awards from the Team_Trophy_Case

### Requirement 10: Public Landing Page

**User Story:** As a visitor, I want to see an engaging marketing page with login capabilities when I first visit the site, so that I understand what the platform offers and can log in or create an account.

#### Acceptance Criteria

1. THE Landing_Page SHALL be accessible without authentication
2. THE Landing_Page SHALL display the platform name and logo as configured in the Branding_Configuration in a top navigation bar
3. THE Landing_Page SHALL display a top navigation bar with links to Features, Leagues, About, and Contact pages, and a "Request a Demo" call-to-action button
4. THE Landing_Page SHALL apply the main colors and accent colors from the Branding_Configuration to all visual elements
5. THE Landing_Page SHALL display a hero section with exciting cycling imagery, a bold tagline (e.g., "Race Together. Get Faster."), and a brief description of the platform
6. THE Landing_Page SHALL display feature highlights (Compete, Develop, Connect, Organize) with brief descriptions
7. THE Landing_Page SHALL display two call-to-action buttons: "Explore Features" and "Learn More"
8. THE Landing_Page SHALL display a login form with email and password fields, a "Forgot password?" link, and a "Log In" button
9. THE Landing_Page SHALL support social login options (Google, Apple)
10. THE Landing_Page SHALL display a "Create an account" link for new user registration
11. THE Landing_Page SHALL display a footer section with value propositions (Built for Racers, Stronger Together, Every Race Counts, All in One Place)
12. THE Landing_Page SHALL display a footer with copyright, Privacy Policy, Terms of Service, Support links, and social media links
13. WHEN a user provides valid credentials on the Landing_Page login form, THE System SHALL authenticate the user and redirect to the User_Dashboard

### Requirement 11: User Dashboard

**User Story:** As an authenticated user, I want to see a personalized dashboard tailored to my role after logging in, so that I can quickly access the information and tools most relevant to me.

#### Acceptance Criteria

1. THE User_Dashboard SHALL only be accessible to authenticated users
2. WHEN a non-authenticated user attempts to access the User_Dashboard, THE System SHALL redirect them to the Landing_Page
3. THE System SHALL display one of three dashboard variants based on the user's roles, using the following priority: Racer Dashboard if the user holds the Racer role (regardless of other roles), Admin Dashboard if the user holds the Administrator role but not the Racer role, or General Dashboard otherwise
4. THE User_Dashboard SHALL display a sidebar navigation with links to: Dashboard, Calendar, Races, Standings, Teams, Academy, Achievements, Mentors, Messages, and Profile
5. THE User_Dashboard SHALL display a top bar with the league name selector, notification bell, and user avatar
6. THE User_Dashboard SHALL display a user profile card at the bottom of the sidebar with name, role(s), team (if applicable), and a "View Profile" link
7. THE User_Dashboard SHALL support light and dark mode toggle

#### Racer Dashboard (user holds Racer role)

8. THE Racer Dashboard SHALL display a hero section with cycling imagery and quick-action buttons ("View Next Race", "My Schedule")
9. THE Racer Dashboard SHALL display a League Standing widget showing the user's current position, points, races completed, and best finish, with a sparkline trend chart
10. THE Racer Dashboard SHALL display a Next Race widget with the upcoming race name, date, location, and a countdown timer (days, hours, minutes, seconds)
11. THE Racer Dashboard SHALL display a Recent Results widget showing the user's most recent race results
12. THE Racer Dashboard SHALL display an Achievements widget showing earned badges with progress indicators and the next achievement to unlock
13. THE Racer Dashboard SHALL display an Upcoming Events section showing a horizontal scroll of upcoming races with date, name, and location
14. THE Racer Dashboard SHALL display a Training & Progress widget (future phase)
15. THE Racer Dashboard SHALL display an Academy Progress widget (future phase)

#### Admin Dashboard (user holds Administrator role but not Racer role)

16. THE Admin Dashboard SHALL display quick-access widgets for common administrative tasks (add race results, manage people, manage races)
17. THE Admin Dashboard SHALL display a summary of recent league activity (latest race results entered, recent registrations, pending nominations)
18. THE Admin Dashboard SHALL display the current season status and upcoming race schedule
19. THE Admin Dashboard SHALL display system alerts or action items requiring attention (pending peer nominations, incomplete race results)

#### General Dashboard (user holds neither Racer nor Administrator role)

20. THE General Dashboard SHALL display an Upcoming Events section showing upcoming races
21. THE General Dashboard SHALL display recent league news and standings highlights
22. THE General Dashboard SHALL display the user's role-specific information (e.g., volunteer assignments, mentorship connections, officiating schedule)
23. THE General Dashboard SHALL display the user's earned Awards and any relevant league notifications

### Requirement 12: Authentication and Authorization

**User Story:** As a user, I want to log in to the system so that I can access my personalized dashboard and league features; as an administrator, I want elevated access to manage league data securely.

#### Acceptance Criteria

1. WHEN a user provides valid credentials (email/password), THE System SHALL authenticate the user and redirect to the User_Dashboard
2. THE System SHALL support social login via Google and Apple as alternative authentication methods
3. THE System SHALL support new user registration via a "Create an account" flow
4. IF invalid credentials are provided, THEN THE System SHALL deny access and display an error message
5. WHILE a user is not authenticated, THE System SHALL restrict access to the User_Dashboard and all authenticated features
6. WHILE a user without Administrator role is authenticated, THE System SHALL restrict access to all data modification operations
7. WHEN a user session expires, THE System SHALL redirect to the Landing_Page and require re-authentication
8. THE System SHALL issue JWT tokens upon successful authentication and validate them for all protected API requests
9. THE System SHALL provide a "Forgot password?" flow for password recovery

### Requirement 13: Navigation

**User Story:** As a user, I want appropriate navigation depending on whether I'm logged in or not, so that I can easily access relevant sections of the site.

#### Acceptance Criteria

1. WHILE a user is not authenticated, THE System SHALL display a top Navigation_Bar on public pages with the league logo, links to Features, Leagues, About, Contact, and a "Request a Demo" button
2. WHILE a user is authenticated, THE System SHALL display a Sidebar navigation with links to Dashboard, Calendar, Races, Standings, Teams, Academy, Achievements, Mentors, Messages, and Profile
3. WHILE a user is authenticated, THE System SHALL display a top bar with the league name selector, notification bell, and user avatar
4. WHILE an Administrator is authenticated, THE Sidebar SHALL additionally display an option to access administrative functions
5. THE public Navigation_Bar SHALL display the league name and logo as configured in the Branding_Configuration
6. THE authenticated Sidebar SHALL display the league logo as configured in the Branding_Configuration

### Requirement 14: About Page

**User Story:** As a visitor, I want to view detailed information about the league on a dedicated page, so that I can learn more about the league's history, mission, and operations.

#### Acceptance Criteria

1. THE About_Page SHALL be accessible without authentication
2. THE About_Page SHALL display detailed information about the league
3. THE About_Page SHALL be reachable from the Navigation_Bar

### Requirement 15: Multi-Platform Support

**User Story:** As a league organizer, I want the system to support web and future mobile access, so that users can interact with the league on multiple devices.

#### Acceptance Criteria

1. THE System SHALL expose a RESTful API for all data operations to support multiple client applications
2. THE System SHALL provide a responsive web interface that adapts to desktop and mobile screen sizes
3. THE System SHALL separate the API layer from the presentation layer to enable independent mobile app development

### Requirement 16: Development Academy Page

**User Story:** As a visitor, I want to view information about the league's Development Academy on a dedicated page, so that I can learn about the program and how to participate.

#### Acceptance Criteria

1. THE Development_Academy_Page SHALL be accessible without authentication
2. THE Development_Academy_Page SHALL display information about the league's Development Academy program
3. THE Development_Academy_Page SHALL be reachable from the Navigation_Bar

### Requirement 17: Calculated Recognition Definition and Computation

**User Story:** As an administrator, I want to define data-driven recognitions that are automatically computed from race data within a season, so that riders are recognized for progression and improvement without manual intervention.

#### Acceptance Criteria

1. WHEN an Administrator defines a Calculated_Recognition, THE System SHALL store it with a name, description, computation method, configurable criteria, and an associated Badge graphic
2. THE System SHALL support a "Most Improved Rider" Calculated_Recognition that computes improvement in Standings over a configurable time period within the active Season
3. THE System SHALL support a "Biggest Mover" Calculated_Recognition that identifies the largest positive change in Standings within a configurable time period within the active Season
4. WHEN Race_Results are updated, THE System SHALL recalculate all active Calculated_Recognitions for the applicable Season based on their configured criteria
5. THE Standings_Page SHALL display earned Calculated_Recognitions for the displayed Season alongside Standings without requiring authentication
6. THE System SHALL display each Calculated_Recognition with its associated Badge wherever it appears (Standings_Page, Trophy_Case)
7. WHEN a Racer qualifies for a Calculated_Recognition, THE System SHALL record the recognition, the recipient, the computed value, the associated Season, and the date earned
8. THE System SHALL allow an Administrator to define additional Calculated_Recognitions with configurable computation criteria beyond the predefined types

### Requirement 18: Season Management

**User Story:** As an administrator, I want to create and manage seasons, so that all league activity is organized into distinct time periods with their own standings, achievements, awards, and recognitions.

#### Acceptance Criteria

1. WHEN an Administrator creates a Season, THE System SHALL store the Season with a name, start date, and end date
2. THE System SHALL enforce that only one Season is active at any given time
3. IF an Administrator attempts to create a Season whose date range overlaps with an existing Season, THEN THE System SHALL reject the creation and notify the Administrator of the conflict
4. WHEN a Season's end date is reached, THE System SHALL mark the Season as inactive and preserve all associated Standings, Achievements, Awards, and Calculated_Recognitions as historical records
5. WHEN an Administrator activates a new Season, THE System SHALL reset all Achievement progress counters for all Racers
6. THE System SHALL associate all Races, Race_Results, Standings, Achievements, Awards, and Calculated_Recognitions with their applicable Season

### Requirement 19: Branding Configuration

**User Story:** As an administrator, I want to configure the league's visual branding (name, logo, colors), so that the application reflects the league's identity and can be customized without code changes.

#### Acceptance Criteria

1. WHEN an Administrator configures the league name, THE System SHALL store the name and display it on the Landing_Page, Navigation_Bar, and all public pages that reference the league identity
2. WHEN an Administrator uploads logo graphics, THE System SHALL accept three logo variants: square, horizontal rectangle, and vertical rectangle, and THE System SHALL display the appropriate variant based on the layout context (e.g., horizontal in the Navigation_Bar, square for favicons or compact displays, vertical where space permits)
3. WHEN an Administrator sets the 3 main colors, THE System SHALL store the colors and apply them to primary UI elements across all public pages
4. WHEN an Administrator sets 1 or 2 accent colors, THE System SHALL store the accent colors and apply them to secondary UI elements across all public pages
5. WHEN an Administrator updates any Branding_Configuration setting, THE System SHALL apply the change immediately across all public pages without requiring a restart or redeployment
6. THE System SHALL validate that exactly 3 main colors are configured before applying the Branding_Configuration
7. THE System SHALL validate that 1 or 2 accent colors are configured before applying the Branding_Configuration
8. IF an Administrator uploads a logo in an unsupported format, THEN THE System SHALL reject the upload and notify the Administrator of accepted formats
9. THE System SHALL require all three logo variants (square, horizontal rectangle, vertical rectangle) to be uploaded before applying logo branding
