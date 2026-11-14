# Trace Viewer: filters into a panel, detail on select

Status: ready-for-agent
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
