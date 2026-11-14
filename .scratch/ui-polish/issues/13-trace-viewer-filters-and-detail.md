# Trace Viewer: filters into a panel, detail on select

Status: resolved
Type: task

See `../spec.md`, decision 14.

Eleven controls stand between the user and the first row: From, To, Type name, Message, Entity, Correlation id, Top, Exceptions only, Auto-refresh, Refresh and Apply filters. Below them sits a second search box that filters the rows already loaded across eight fields. The two searches look alike and do different work. The detail pane holds `minmax(360px, 2fr)` of the width even when nothing is selected.

- Move the eight filter controls out of `TraceFilters` and into a panel behind a Filters button carrying a count of active filters, in the `AreaShell` filters slot.
- What stays above the table: the quick filter (now a `SearchField`), the Top dropdown, auto-refresh, refresh, and "Delete selected".
- "Apply filters" stays inside the panel. The server filters are the react-query key, so applying them is a deliberate act; the quick filter stays live.
- Make the quick filter's purpose visible. `QUICK_FILTER_HELP` lists the eight fields it matches and exists only in a `title` attribute today.
- Render the detail pane only once a row is selected, and give the table the full width until then.
- The root grid declares four rows, so the error `MessageBar` creates a fifth implicit `auto` row and the split grid loses its `1fr`. Fix the template.
- Verify in `harness-traces` at the pinned-window minimum of 1100px and in a narrow browser tab.

Blocked by: 07

## Answer

- `TraceFilters` is now the content of a shared `FilterPanel`: From, To, Type name, Message, Entity, Correlation id and Exceptions only, with "Apply filters" at the foot of the panel. The server filters are the react-query key, so applying them stays a deliberate act.
- The button carries the count. `activeTraceFilterCount` (unit tested) counts the seven, and leaves `top` out, because Top is a size and not a filter. "Clear all" resets them and keeps Top as the user set it.
- Above the table: the quick filter as a `SearchField`, the loaded count, the Filters button, the Top dropdown, auto-refresh, refresh, the Columns button and Delete. One line at 1100px, two at 620px.
- `QUICK_FILTER_HELP` was a `title` attribute, which a keyboard user cannot reach. It is now an `InfoTip` button at the end of the quick filter.
- The detail pane renders only once a row is selected. The split grid is one column until then, and the table has the whole width. Checked in `harness-traces` at 1100px: 1052px for the table alone, 622/414 once a row is picked.
- The root is a flex column instead of four declared grid rows, so a banner or an error no longer creates a fifth row and steals the split's `1fr`.
- The `AreaShell` filters slot is not used here: the Trace Viewer is a Workspace, not an Area, and has no shell to render into. It uses the same shared `FilterPanel` in its own toolbar.
