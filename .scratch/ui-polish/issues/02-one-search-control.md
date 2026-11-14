# One search control

Status: ready-for-agent
Type: task

See `../spec.md`, decision 3.

There are about 20 search controls in three shapes: `TableFilter` (shared, `size="small"`, 7 uses), a hand-rolled `Input` with a `Search20Regular` prefix (12 instances), and Fluent `SearchBox` (once, in the nav drawer). The small size and the fixed widths are why the placeholder text is cut off while the container has room to spare.

- Add `src/shared/components/SearchField`: Fluent `size="medium"` (32px), `flex: 1; min-width: 0` so it fills its row, search icon as `contentBefore`, a clear button, Escape clears, and a required `aria-label`.
- The `aria-label` is required because the accessibility audit found 20 placeholder-only fields with no accessible name, and most of them are these search boxes.
- The placeholder names what is searched — "Search variables", "Search trace logs" — never the bare word "Filter".
- The result count renders beside the field, not inside it.
- Rebuild `TableFilter` on top of `SearchField`, keeping its `shown of total` count and the `useTableFilter` hook unchanged.
- Replace all 12 hand-rolled instances: `EnvironmentVariablesArea`, `AutomationArea`, `RecordCountsArea`, `FormDiagnosticsArea`, `PackagesArea`, `PluginStepsArea`, `RoleTable` (currently a `Filter20Regular` icon — standardise on search), `ColumnBrowserDialog`, `TableMetadataDialog`, `TraceViewer`, `ResultsViewer`, `ColumnSearch`.
- Leave the nav drawer's `SearchBox` alone. It is a combobox wired with `aria-activedescendant`, not a filter.
- Verify in the harness side panel at 400px that the placeholder is fully readable and the field fills its container.
