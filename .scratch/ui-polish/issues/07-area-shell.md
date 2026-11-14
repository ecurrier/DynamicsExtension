# AreaShell owns the toolbar row

Status: resolved
Type: task

See `../spec.md`, decisions 1 and 2, and "The Area shell".

Eleven Areas use `AreaToolbar`, six wrote their own toolbar, four use a tab bar instead and eight have none. There is no shared Button, Badge, Card, Panel, Section or SearchInput, and 94 files call `makeStyles`. A written rule will not hold against that; the placement has to be structural.

- Add `src/shared/components/AreaShell` with named slots: `search`, `filters`, `actions`, `primaryAction`, `children`. There is no slot for a toolbar in any other position, which is the point.
- It renders those slots into the breadcrumb row `AppShell` already draws, in this order: breadcrumb, search filling the remaining width, a Filters button carrying a count of active filters, secondary icon buttons, at most one primary action. The standard therefore costs no extra height.
- Below about 560px of container width the search field drops to its own line. The environment name is dropped before the search field is.
- Use a container query, never a media query. The popup is a fixed 700px root inside a viewport of any size, so a media query reads the viewport and gets it wrong — ADR 0002 records this and `TaskGrid` sets the pattern. Note that a `max-width: 480px` container query never fires in the popup, because the popup's container is always 700px.
- The row must set `flexWrap`. Neither `AreaToolbar` nor `FormRow` does today, and `FormRow` has 55 usages; that is why controls push past their container in the side panel.
- `AppShell` is not the home for this contract. It is shared with the five Workspaces, which need a different top bar.
- An empty slot renders nothing and costs no height.
- A tab bar is not a toolbar. An Area with tabs passes them in `children`, below the row.

Blocked by: 02

## Answer

- `src/shared/components/AreaShell` holds `AreaShell` and `FilterPanel`. The slots are `search`, `filters`, `actions`, `primaryAction` and `children`, and there is no slot for a toolbar anywhere else.
- The row renders through a React portal into an element `AppShell` puts in the breadcrumb row (`AreaShellSlotContext`). A portal keeps the slots in the Area's own React tree, so its state and handlers work as usual, while the row belongs to the shell. An `AreaShell` with no slot renders nothing at all, and the slot element is `:empty`, so it disappears and the breadcrumb keeps the whole row.
- Order in the row: breadcrumb, search filling the rest, the Filters button with its count, secondary icon buttons, one primary action. It costs no extra height.
- Below 560px of container width the whole slot block takes a line of its own (`flex-basis: 100%` and `order: 1` on the slot element, with the header row wrapping). The environment name is dropped at the same breakpoint, which is before the search moves. Both are container queries on `AppShell`'s `.bar`, never media queries.
- The breadcrumb is `flex: 0 1 auto` and truncates; a spacer after the slots holds the shell buttons against the edge, above all when the Area fills no slot.
- `FormRow` keeps its 55 usages and gains `flexWrap: "wrap"`, which is why controls no longer push past their container.
- A fallback inline row renders when there is no shell to portal into, so a row is never lost.
