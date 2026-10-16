## ADDED Requirements

### Requirement: CSS Grid Cart Layout
The cart summary list SHALL utilize an explicit CSS Grid layout for strict tabular columnar alignment.

#### Scenario: Render Alignment
- **WHEN** the order summary cart is rendered containing active items
- **THEN** the table header row and each subsequent item row MUST share an identical grid footprint using `display: grid; grid-template-columns: 1fr 120px 100px;`
- **THEN** the equipment description column MUST include right-padding to prevent long strings from overlapping into the pricing column
- **THEN** pricing values MUST be horizontally aligned to the right, establishing a uniform vertical decimal baseline
- **THEN** the 'Remove' buttons MUST be constrained entirely within the rightmost 100px column container, filling the available width evenly without shifting
