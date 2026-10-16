# Spec Delta

## Purpose

Defines the single visual language of the Zaeem frontend: design tokens, light and dark themes, typography, and the shared UI primitives every page is built from, so all screens look and behave consistently.

## ADDED Requirements

### Requirement: Token-driven styling
All colours, font sizes, spacing, radii, shadows and motion durations used by the UI SHALL come from one shared set of named design tokens. Page and feature components MUST NOT declare raw colour values or inline `style` attributes, except for values computed at runtime, such as timeline bar positions.

#### Scenario: No hard-coded colours in feature components
- **WHEN** the frontend source outside the design-system token files is searched for hex, `rgb()` or `rgba()` colour literals
- **THEN** no matches are found

#### Scenario: No static inline styles
- **WHEN** component templates are searched for `style="` attributes
- **THEN** no matches are found, and only bindings that set runtime-computed geometry (for example `[style.left.%]`) remain

### Requirement: Light and dark themes
The UI SHALL provide a light theme and a dark theme built from the same tokens. On first visit it MUST follow the operating-system colour preference; an explicit user choice MUST persist across reloads.

#### Scenario: First visit follows system preference
- **WHEN** a user with a dark OS colour preference opens the app for the first time
- **THEN** the app renders in the dark theme

#### Scenario: Explicit choice persists
- **WHEN** a user switches to the light theme and reloads the page
- **THEN** the app renders in the light theme regardless of OS preference

#### Scenario: Storage unavailable
- **WHEN** browser storage is blocked
- **THEN** the app still renders using the OS preference without errors

### Requirement: Typographic scale and numerals
Text SHALL use a single typeface family and a fixed type scale of no more than eight sizes. Monetary amounts, counts and dates in tables and stat cards MUST use tabular (fixed-width) numerals in the proportional UI font, not a monospace font.

#### Scenario: Amounts align in tables
- **WHEN** a table lists several currency amounts in a column
- **THEN** the digits line up vertically and render in the UI typeface

### Requirement: Currency and date formatting
Monetary values SHALL be shown in a consistent currency format with two decimals and thousands separators. Calendar dates MUST use a single, consistent short date format across all pages.

#### Scenario: Consistent amount rendering
- **WHEN** the same amount appears on the dashboard, ledger and order summary
- **THEN** it is rendered identically on each page

### Requirement: Shared UI primitives
Buttons, cards, form fields, data tables, status badges, stat cards, page headers, empty states, loading skeletons, dialogs and toasts SHALL each be built once and reused by every page. Every page MUST use them, not its own copy.

#### Scenario: One button style across pages
- **WHEN** primary actions on the order entry, payments and schedule pages are compared
- **THEN** they share identical size, colour, radius, hover, focus and disabled styling

### Requirement: Button variants and states
Buttons SHALL offer primary, secondary, ghost and destructive variants. Each variant MUST have distinct hover, active, focus-visible, disabled and busy (in-progress) states. A busy button MUST block repeat activation.

#### Scenario: Busy state prevents double submit
- **WHEN** a user activates a primary button that starts a request
- **THEN** the button shows a progress indicator and ignores further activation until the request settles

### Requirement: Status badges
Rental and record statuses SHALL be shown as badges with a fixed colour mapping (Pending, Active, Completed, Cancelled). Every badge MUST carry a text label, so meaning never depends on colour alone.

#### Scenario: Status rendered consistently
- **WHEN** an Active rental appears on the dashboard and in a schedule booking detail
- **THEN** both show the same "Active" badge with the same colour

### Requirement: Iconography
The UI SHALL use a single consistent SVG icon set. Emoji MUST NOT be used as icons. Decorative icons MUST be hidden from assistive technology, and icon-only controls MUST have an accessible name.

#### Scenario: Dashboard KPI icons
- **WHEN** the dashboard stat cards are rendered
- **THEN** each shows an SVG icon from the shared set and no emoji characters are present
