# operations-dashboard Specification

## Purpose
Defines the Operations Dashboard (route `/dashboard`, the landing page): an at-a-glance view of fleet activity and receivables built only from live rental and client data.

## Requirements

### Requirement: KPI stat cards
The dashboard SHALL show four stat cards: Active Deployments, Outstanding Receivables, Fleet Utilisation and Active Clients. Each card shows its value, an icon and one line of supporting context derived from real data (for example "3 of 19 units on hire").

#### Scenario: Utilisation context
- **WHEN** 3 machines are on active rentals out of a fleet of 19 units
- **THEN** the Fleet Utilisation card shows 16% with the context "3 of 19 units on hire"

### Requirement: No fabricated figures
Dashboard values SHALL be computed only from loaded rental and client data. Trends, comparisons or sample numbers that the data does not support MUST NOT be shown.

#### Scenario: No history available
- **WHEN** the dashboard renders
- **THEN** no period-over-period trend indicators are displayed

### Requirement: Neutral presentation of balances
Outstanding receivables SHALL be shown in the standard text colour. Warning colour MUST be used only for an explicitly defined condition, and that condition MUST be labelled in text.

#### Scenario: Receivables match the Client Ledger
- **WHEN** two clients owe $85,000.00 and $12,500.00 and a third holds a $606.50 credit
- **THEN** Outstanding Receivables shows $97,500.00, the same as the Client Ledger's balance due, because a credit is not netted against what other clients owe

#### Scenario: Normal receivables
- **WHEN** total receivables are $98,972.63
- **THEN** the value is shown in the standard text colour without warning styling

### Requirement: Active deployments table
The dashboard SHALL list current and upcoming (non-cancelled, not yet completed) rentals with machine and plate, client, rental period, amount and status badge, sorted by start date. It links to the Fleet Schedule.

#### Scenario: Completed rentals excluded
- **WHEN** a rental's end date is in the past
- **THEN** it does not appear in the active deployments table

#### Scenario: Jump to schedule
- **WHEN** the user activates View Schedule on the deployments panel
- **THEN** the Fleet Schedule page opens

### Requirement: Fleet utilisation breakdown
The dashboard SHALL show, for each machine type, the number of units on active hire against that type's fleet size, as a labelled bar with the numbers written in text.

#### Scenario: Per-type breakdown
- **WHEN** one of five Excavator X3000 units is on active hire
- **THEN** the Excavator X3000 row shows a bar at 20% and the text "1 of 5"

### Requirement: Responsive dashboard grid
Stat cards SHALL show four across on wide screens, two across on tablets and one per row on phones. The deployments and utilisation panels MUST stack on viewports below 1024px.

#### Scenario: Tablet layout
- **WHEN** the dashboard is viewed at 800px wide
- **THEN** the stat cards are arranged two per row and the panels are stacked
