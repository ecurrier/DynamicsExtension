# Badges give way

Status: resolved
Type: task

See `../spec.md`, decision 4.

No badge in the codebase carries a `className`. Fluent's `Badge` root sets only `height` and `min-width` — no `white-space`, no `overflow`, no `text-overflow`, no `max-width`, no `flex-shrink` — so it is the one element in a row that cannot give way. Text beside it truncates at 24 sites, and `flex-shrink: 0` is used 12 times and never on a badge. This is the single cause of the "squeezed" look in the popup and the side panel.

- Add a shared badge style (a wrapper component or a `makeStyles` hook exported from `shared/components`) applying `min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`, `flex-shrink: 1`, and forwarding a `title` with the untruncated text.
- Apply it across the 59 badge render sites in 36 files. `ValueChip` and `ControlStateBadges` are the two wrappers that already exist; route sites through them where it fits rather than adding a third.
- Where badges already sit in a container with `flexWrap: "wrap"` — `ControlStateBadges`, `ColumnMatchesCard` `.badges`, `RecordColumnsArea` `.chips`, the `BulkUsersArea` TagGroup — keep wrapping and do not truncate.
- `ImpersonationIndicator` is the worst case: it renders `Impersonating {fullName}` into the `AppShell` actions slot with no width bound, beside a title capped at 35%. Keep "Impersonating" readable, truncate the name, set both `title` and `aria-label` to the full text.
- Inside a `DataTable` cell a badge is currently hard-cut by `.cell`'s `max-width: 260px` with no ellipsis of its own. After this change it must ellipsise inside the cell.
- `ValueChip` accepts a `title` prop that no call site passes. Either pass it from the three call sites or drop the prop.
- Verify in the harness side panel at 400px: no badge label spills out of its row, and none is cut without an ellipsis.

## Answer

- `src/shared/components/TextBadge` holds the shared badge: `useBadgeStyles` (the `makeStyles` hook) and `TextBadge`, a `Badge` whose label sits in a span that truncates with an ellipsis. The root gets `min-width: 0`, `max-width: 100%`, `flex-shrink: 1` and `overflow: hidden`. Fluent renders children straight into an `inline-flex` root, so `text-overflow` on the root alone does nothing; the span is what makes the ellipsis work.
- `badgeText` (unit tested) reads the plain text of the children, so every badge carries its full label in a `title` without a call site passing one.
- 27 files moved to `TextBadge`. `ValueChip` is rebuilt on it, and its unused `title` prop is dropped.
- Kept as a plain `Badge`, because the badges there wrap: `ControlStateBadges`, `ColumnMatchesCard` `.badges`. The `ColumnSearch` step number is a circular number, not a label.
- `ImpersonationIndicator` keeps "Impersonating" at `flex-shrink: 0`, truncates the name, and carries the full text in `title` and `aria-label`.
- A badge in a `DataTable` cell now ellipsises inside the cell's 260px bound, because `max-width: 100%` makes it give way.
