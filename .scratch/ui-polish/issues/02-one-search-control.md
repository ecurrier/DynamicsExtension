# One search control

Status: resolved
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

## Answer

- `src/shared/components/SearchField` is the one control. Fluent `size="medium"`, `flex: 1; min-width: 0`, a search icon before, a clear button after, and a required `aria-label`.
- Escape clears the field only when it holds text (`clearsOnEscape`, unit tested), so a second press still closes the dialog or panel around it. Without that rule a search box inside a dialog would swallow Escape.
- A `hint` slot carries an `InfoTip` at the end of the field. The Trace Viewer quick filter needs it, and issue 13 needs it again.
- `TableFilter` is rebuilt on `SearchField`. It keeps its `shown of total` count beside the field and `useTableFilter` is unchanged. Its `placeholder` is now required, and a `label` prop sets a longer accessible name.
- All 12 hand-rolled instances are replaced. Every placeholder names what is searched; no placeholder says "Filter" any more.
- Left alone: the nav drawer `SearchBox` (a combobox), `RecordLookup` and `UserPicker` (record and user lookups with their own panels, not filters).
