# Spec Delta

## Purpose

Sets the accessibility baseline (WCAG 2.2 level AA) that every page and shared component must meet, so the app is usable with a keyboard, screen readers and reduced-motion settings in both themes.

## ADDED Requirements

### Requirement: Labelled form controls
Every form control SHALL have a programmatically associated visible label. Validation messages MUST be associated with their field and announced when they appear.

#### Scenario: Screen reader reads a field
- **WHEN** focus moves to the plate number input
- **THEN** assistive technology announces its label "Plate number"

#### Scenario: Field error announced
- **WHEN** a booking conflict is detected for the entered plate
- **THEN** the conflict message is linked to the plate field and the field is marked invalid

### Requirement: Keyboard operation
Every interactive element SHALL be reachable and operable with the keyboard alone, in a logical order. This includes navigation, the mobile drawer, dialogs, timeline bookings and toasts. No keyboard traps are allowed, except an open dialog, which MUST trap focus until it is closed.

#### Scenario: Complete an order without a mouse
- **WHEN** a keyboard-only user fills the order form, adds an item and places the order
- **THEN** every step is possible using Tab, Shift+Tab, Enter, Space and arrow keys

#### Scenario: Dialog focus handling
- **WHEN** a confirmation dialog opens and is then closed with Escape
- **THEN** focus moves into the dialog while it is open and returns to the control that opened it afterwards

### Requirement: Visible focus
All focusable elements SHALL show a clearly visible focus indicator for keyboard focus, with at least 3:1 contrast against adjacent colours in both themes.

#### Scenario: Focus ring in dark theme
- **WHEN** a keyboard user tabs through the navigation in the dark theme
- **THEN** each focused entry shows a clearly visible focus ring

### Requirement: Colour contrast
Text SHALL meet WCAG AA contrast (4.5:1 for body text, 3:1 for large text and essential UI component boundaries) in both the light and the dark theme, including disabled-looking states that are still meaningful.

#### Scenario: Automated contrast audit
- **WHEN** an automated accessibility audit runs on each page in both themes
- **THEN** no colour-contrast violations are reported

### Requirement: Reduced motion
When the user's system requests reduced motion, the UI SHALL disable non-essential animations and transitions, such as page fade-ins and hover scaling, while keeping all functionality.

#### Scenario: Reduced motion preference
- **WHEN** the OS reduced-motion preference is enabled and a page is opened
- **THEN** content appears without entrance or hover-scale animations

### Requirement: Landmarks and skip link
The shell SHALL expose landmark regions (banner, navigation, main) and a "Skip to content" link as the first focusable element, which moves focus to the main content.

#### Scenario: Skip navigation
- **WHEN** a keyboard user presses Tab once after page load and activates the revealed link
- **THEN** focus moves to the start of the main page content

### Requirement: Accessibility audit score
Each page SHALL score at least 95 in a Lighthouse accessibility audit, in both themes and in both the demo and full-stack builds.

#### Scenario: Audit each page
- **WHEN** Lighthouse accessibility audits run on Dashboard, New Rental Order, Fleet Schedule, Client Ledger and Payments
- **THEN** every page scores 95 or higher
