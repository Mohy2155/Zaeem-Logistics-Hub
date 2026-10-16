# UI design system

Every page is built from the tokens in `src/styles/` and the primitives in this folder. If a page needs something that isn't here, add it here instead of styling it inside the page.

## Tokens (`src/styles/`)

| File | What it holds |
|------|---------------|
| `tokens.scss` | Primitive values: palette (`--gray-*`, `--blue-*`, `--green-*`, `--amber-*`, `--red-*`, `--navy-*`), type scale (`--text-xs` … `--text-3xl`), spacing (`--space-1` … `--space-12`, 4px grid), radii, motion, layout sizes, z-index. |
| `themes.scss` | Semantic tokens for the light and dark themes (`--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-danger-text`, …), plus the WCAG contrast table. |
| `_breakpoints.scss` | `md` 768px, `lg` 1024px, `xl` 1280px, with `@include bp.up(lg)` / `bp.down(md)` mixins. Use with `@use 'breakpoints' as bp;`. |
| `base.scss` | Element defaults, focus ring, reduced-motion overrides, and the `.num` (tabular numerals) and `.sr-only` utilities. |
| `forms.scss`, `table.scss`, `dialog.scss` | Global parts of form controls, data tables and dialogs, which render into page templates or the CDK overlay. |

**Do:** use semantic tokens (`var(--color-text-muted)`) in components.
**Don't:** use palette tokens or raw colours (`#4a5468`, `rgba(…)`) outside `src/styles/`, write static `style="…"` attributes, or put emoji in templates. The guard tests in `src/app/style-guards.spec.ts` fail `ng test` on any of these and name the file and line. (The Excel/PDF generators are exempt from the colour rule: their colours style the exported documents, not the UI.)

After changing a colour in `tokens.scss` or `themes.scss`, run `npm run check:contrast`. It recomputes the contrast table and fails if any text/background pair drops below WCAG AA.

## Theme

`ThemeService` (`services/theme.ts`) sets `data-theme="light|dark"` on `<html>`. It follows the OS preference until the user picks a theme, then remembers the choice. A small script in `index.html` applies the theme before Angular boots, so the page never flashes the wrong theme.

## Primitives

| Primitive | Use it for | Notes |
|-----------|-----------|-------|
| `ui-icon` (`icon.ts`) | SVG icons from the lucide set | `<ui-icon name="truck" />`. Decorative by default (`aria-hidden`); pass `label` when the icon carries meaning. Only icons registered in `icon.ts` ship, so add new names there. Never use emoji as icons. |
| `button[ui-button]` (`button.ts`) | Every text button or button-styled link | `variant`: `primary` · `secondary` (default) · `ghost` · `destructive`; `size`: `md` · `sm`; `icon`; `block`; `busy` (shows a spinner and disables the button, so it can't be submitted twice). |
| `button[ui-icon-button]` (`button.ts`) | Icon-only actions | `icon` and `label` are both required; `label` becomes the accessible name and tooltip. The compiler rejects a missing label. |
| `ui-card` (`card.ts`) | A self-contained panel | `heading`, `description`, actions via `[card-actions]`; `flush` removes body padding for edge-to-edge tables. |
| `ui-page-header` (`page-header.ts`) | The top of every page | `title` (rendered as the page's `h1`), `description`, projected primary actions. |
| `ui-badge` (`badge.ts`) | Status pills | `status="Active"` uses the fixed mapping: Pending → warning, Active → success, Completed → neutral, Cancelled → danger. Or `tone` plus projected text. The text always carries the meaning. |
| `ui-stat-card` (`stat-card.ts`) | Dashboard KPIs | `label`, `value` (pre-formatted string), `icon`, `context` (one line derived from real data). |
| `ui-form-field` + `uiControl` (`form-field.ts`) | Every form control | Wraps a native `input`/`select`/`textarea` marked `uiControl`; wires the label's `for`, `aria-describedby` (hint and error), `aria-invalid` and `aria-required`. The error text is in a polite live region. `suffix` adds a unit such as `%`. |
| `ui-data-table` (`data-table.ts`) | Tabular data | `columns` (`TableColumn<T>`: `key`, `label`, `align: 'end'` for numbers, `sortable`, `sortValue`, `firstDirection`, `width`), `rows`, `[(sort)]`, `caption`, `trackBy`. Custom cells: `<ng-template uiCell="key" let-row>`. Totals: `<ng-template uiTableFooter>` with your own `<td>`s. Below 768px rows become labelled cards. `sortRows()` is exported for page-level helpers. |
| `ui-async-view` + `loadState()` (`async-view.ts`, `load-state.ts`) | Any view backed by a request | `loadState(() => request$)` gives `{ state$, retry }`. The view shows a skeleton, an empty state (action via `[empty-action]`), an error with Retry, or `<ng-template uiReady let-data>`. Error messages come from `describeLoadError()`; stale or invented data is never shown. |
| `ui-skeleton` (`skeleton.ts`) | Loading placeholders | `variant`: `table` · `cards` · `text` · `block`; `count`. Usually rendered by `ui-async-view`. |
| `ui-empty-state` (`empty-state.ts`) | "Nothing here" and error panels | `title`, `message`, `icon`, `tone`, projected actions. |
| `ui-dialog` + `UiDialogService` (`dialog.ts`) | Custom dialogs (details, success views) | Open with `UiDialogService.open(Component, { data, ariaLabelledBy })` and use `<ui-dialog [title] [titleId]>` inside, with actions in `[dialog-actions]`. The CDK traps focus, closes on Escape and returns focus to the trigger. |
| `ConfirmService` (`dialog.ts`) | Confirming consequential actions | `await confirm({ title, message, details, confirmLabel, tone })` resolves `true` only on explicit confirmation. Use it for payments, clearing the cart and resetting demo data. |
| `ui-toast-stack` + `ToastService` (`toast-stack.ts`, `services/toast.ts`) | Results of user actions | `success()` / `info()` dismiss after 5s; `error()` stays until dismissed. Every toast is announced (errors assertively). `show(message, isError)` is kept for older call sites. |

## Formatting

- Money: Angular's `currency` pipe (USD, two decimals, thousands separators).
- Dates: the `date` pipe with `'mediumDate'` (e.g. "Oct 16, 2026") everywhere.
- Columns of numbers: `.num` or `align: 'end'` in tables, which applies tabular numerals.
