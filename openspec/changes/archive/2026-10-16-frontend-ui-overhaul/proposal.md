# Proposal

## Why

The frontend works, but it doesn't look or behave like a finished enterprise product. Every page scrolls sideways, the shell doesn't adapt to tablets or phones, and each page restyles itself from scratch: there are 42 inline `style=""` attributes and 42 different hex colours, and cards, tables, buttons and badges are re-declared in 3–5 components each. Figures use monospace type and the KPI icons are emoji. Data views have no loading, empty or error states, and none of the 10 form labels is linked to its input. The planned `enterprise-ui-refactor` change was never written. This proposal replaces it with a full overhaul, so the public GitHub Pages demo and the cloned full-stack app both look polished and consistent.

## What Changes

- **Design system**: one set of design tokens (colour, type scale, spacing, radius, elevation, motion) and a light and a dark theme. Shared UI primitives (button, card, form field, data table, status badge, stat card, page header, empty state, skeleton, dialog, toast) replace the per-component copies. Inline styles and hard-coded colours are removed.
- **App shell**: a responsive layout. Persistent sidebar on desktop; collapsible rail on tablet; off-canvas drawer with a top bar on mobile. Navigation is grouped (Overview, Operations, Finance) and uses SVG icons. Each route gets a real page header and browser tab title. A visible demo-mode banner replaces the bare "Reset Demo Data" link. There is a theme toggle. The app opens on the dashboard.
- **Order entry (Client Portal)**: a two-column layout. A sectioned order form with inline validation sits beside a sticky order summary showing the line items, totals breakdown, and invoice actions. Booking conflicts are shown next to the field that caused them.
- **Fleet schedule**: overlapping rentals of the same machine type stack into separate lanes instead of drawing over each other. Adds a today marker, weekend shading, a visible date-range label with Today / previous / next controls, and an accessible detail view for each booking.
- **Operations dashboard**: KPI stat cards with icons and supporting context (for example "3 of 19 units"), a properly formatted deployments table with status badges, and a fleet utilisation breakdown.
- **Client ledger and payments**: the duplicated balance tables are consolidated. Client Ledger owns balances and lifetime billing. Payments owns recording a payment, with validation and a confirmation step, plus the receipt history.
- **Feedback states**: every data view gets skeleton loading, an empty state and an error state with retry. Toasts become a dismissible stack that screen readers announce.
- **Accessibility**: WCAG 2.2 AA. Labelled controls, full keyboard operation, visible focus, AA contrast in both themes, and support for reduced motion.
- **Cart layout**: the cart keeps its column-alignment guarantees, but the spec no longer pins exact pixel column widths, so the summary can respond to screen size.

No backend, API or data-model changes. Existing route paths (`/portal`, `/admin`, `/dashboard`, `/scheduler`, `/payments`) are kept; only the default redirect changes.

## Capabilities

### New Capabilities
- `ui-design-system`: design tokens, themes, typography, and the shared UI primitives every page is built from.
- `app-shell-navigation`: responsive application frame, grouped navigation, page headers and titles, demo-mode banner, theme switching, and the landing route.
- `ui-feedback-states`: loading, empty and error states for data views, and the toast notification stack.
- `ui-accessibility`: accessibility guarantees that apply across all pages, including labelling, keyboard, focus, contrast and motion.
- `order-entry-ui`: the rental order workspace: order form, validation and conflict feedback, order summary, and invoice actions.
- `fleet-schedule-view`: the machinery timeline, including lanes, range navigation, today and weekend cues, and booking details.
- `operations-dashboard`: the KPI overview, active deployments table, and fleet utilisation breakdown.
- `client-ledger-ui`: client balance ledger, payment recording flow, and receipt history.

### Modified Capabilities
- `cart-grid-layout`: the alignment requirement is restated as a behaviour contract (shared column grid, right-aligned amounts, contained actions) instead of the fixed `1fr 120px 100px` CSS declaration, and it gains narrow-screen behaviour.

## Impact

- **Code**: `zaeem-distribute-ui/src` only. That covers the app shell (`app.html`, `app.scss`, `app.ts`), global styles, all five page components (split into template/style files and sub-components), a new shared `ui/` component folder, and the toast service. Business logic in `company.ts`, `rental-dates.ts` and `mock-api.interceptor.ts` keeps its behaviour.
- **Dependencies**: adds `@angular/cdk` (overlay, a11y, layout breakpoints) and an SVG icon set (`lucide-angular`). Fonts stay on Google Fonts (Inter).
- **Build**: component style budgets in `angular.json` stay as they are; moving shared styles into the design system keeps components within them.
- **Deployments**: both the `prod-demo` GitHub Pages build and the full-stack build must keep working; demo data and the reset behaviour are unchanged.
- **Specs**: `cart-grid-layout` is modified; `rental-management` routing requirements are unaffected.
