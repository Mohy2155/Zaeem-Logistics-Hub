# app-shell-navigation Specification

## Purpose
Defines the application frame around every page: the responsive layout, grouped navigation, page headers and browser titles, the landing route, theme switching and the demo-mode indicator.

## Requirements

### Requirement: Responsive application frame
The shell SHALL adapt to the viewport. At 1280px and wider it shows a persistent sidebar with labels. From 768px up to 1280px it shows a collapsible icon rail. Below 768px it shows a top bar with a menu button that opens an off-canvas navigation drawer.

#### Scenario: Desktop layout
- **WHEN** the app is viewed at 1440px wide
- **THEN** the labelled sidebar is visible alongside the page content

#### Scenario: Mobile layout
- **WHEN** the app is viewed at 390px wide
- **THEN** a top bar with a menu button is shown and the navigation is hidden until the menu is opened

#### Scenario: Drawer closes after navigation
- **WHEN** a mobile user opens the drawer and selects a page
- **THEN** the drawer closes and the selected page is shown

### Requirement: No page-level horizontal scrolling
At any viewport width from 360px upward, the document SHALL NOT scroll horizontally. Wide content, such as tables and the timeline, MUST scroll inside its own container.

#### Scenario: Wide table on a phone
- **WHEN** the client ledger is viewed at 360px wide
- **THEN** the page itself does not scroll sideways and the table content stays reachable within its container

### Requirement: Grouped navigation
Navigation SHALL group destinations under Overview (Dashboard), Operations (New Rental Order, Fleet Schedule) and Finance (Client Ledger, Payments). Each entry MUST show an icon and a label and indicate the current page.

#### Scenario: Active destination indicated
- **WHEN** the user is on the Fleet Schedule page
- **THEN** its navigation entry is visually marked as current and exposes the current-page state to assistive technology

### Requirement: Stable route paths
The existing route paths `/dashboard`, `/portal`, `/scheduler`, `/admin` and `/payments` SHALL keep working. The empty path and unknown paths MUST redirect to `/dashboard`.

#### Scenario: Landing on the root
- **WHEN** a user opens the application root URL
- **THEN** the Operations Dashboard is shown

#### Scenario: Existing deep link
- **WHEN** a user opens a bookmarked `/portal` URL
- **THEN** the New Rental Order page is shown

### Requirement: Page headers
Every page SHALL begin with a header showing the page title, a one-line description, and that page's primary actions, if any. Breadcrumb text that does not correspond to real navigation levels MUST NOT be shown.

#### Scenario: Order page header
- **WHEN** the New Rental Order page is opened
- **THEN** a header with the title "New Rental Order" and a short description is shown above the form

### Requirement: Browser tab titles
Each route SHALL set a browser tab title in the form "<Page> · Zaeem Logistics Hub".

#### Scenario: Title updates on navigation
- **WHEN** the user navigates from the dashboard to the payments page
- **THEN** the tab title changes to "Payments · Zaeem Logistics Hub"

### Requirement: Theme switching control
The shell SHALL provide a control to switch between light and dark themes. The control is reachable from every page and at every breakpoint.

#### Scenario: Toggle from mobile
- **WHEN** a user on a 390px viewport switches the theme
- **THEN** the whole app re-renders in the chosen theme without reloading

### Requirement: Demo mode indicator
When the app runs on demo data (the GitHub Pages build), the shell SHALL show a persistent, unobtrusive notice explaining that data is stored in the browser. It MUST offer a Reset Demo Data action that asks for confirmation first. The full-stack build MUST show neither.

#### Scenario: Demo build
- **WHEN** the GitHub Pages demo is opened
- **THEN** a demo notice with a Reset Demo Data action is visible

#### Scenario: Reset requires confirmation
- **WHEN** a user activates Reset Demo Data and then cancels the confirmation
- **THEN** no demo data is changed

#### Scenario: Full-stack build
- **WHEN** the app runs against the real API
- **THEN** no demo notice or reset action is shown
