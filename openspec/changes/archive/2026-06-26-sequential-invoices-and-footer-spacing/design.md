## Context

The cart summary total needs more visual space to prevent cramping with the bulk order button. Additionally, fallback invoices are currently generated via a random timestamp which breaks requirements for sequentially numbered document records.

## Goals / Non-Goals

**Goals:**
- Visually separate the grand total from the primary action button using margin constraints.
- Ensure fallback invoices increment correctly (e.g., `INV-1001`, `INV-1002`) within a user session and across page reloads.

**Non-Goals:**
- We are not changing the backend API's primary invoice assignment logic, only the frontend fallback path for missing IDs.

## Decisions

- **LocalStorage Counter:** Use `localStorage` to persist a sequential counter variable (defaulting to 1000) for fallback invoices. This is a lightweight, frontend-only solution that guarantees sequential continuity across browser refreshes without requiring backend database migrations.
