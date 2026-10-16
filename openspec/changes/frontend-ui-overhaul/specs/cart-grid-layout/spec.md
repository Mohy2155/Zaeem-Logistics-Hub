# Spec Delta

## MODIFIED Requirements

### Requirement: CSS Grid Cart Layout
The cart summary list SHALL use a shared column grid so the header row and every item row align as a table. The description column flexes to the available width, while the amount and action columns keep fixed, design-token-defined widths.

#### Scenario: Render Alignment
- **WHEN** the order summary cart is rendered containing active items
- **THEN** the table header row and each subsequent item row MUST share an identical column grid, so column boundaries line up across all rows
- **THEN** the equipment description column MUST include right-padding, and MUST wrap or truncate long text with the full text still available, so it never overlaps the pricing column
- **THEN** pricing values MUST be horizontally aligned to the right using tabular numerals, establishing a uniform vertical decimal baseline
- **THEN** each row's remove action MUST be constrained entirely within the rightmost column, without shifting other columns

#### Scenario: Narrow summary
- **WHEN** the order summary is narrower than 360px
- **THEN** each item's amount and remove action move beneath its description, keeping the amount right-aligned, and no content overflows the summary horizontally
