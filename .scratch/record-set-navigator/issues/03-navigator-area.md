# Navigator Area

Status: resolved
Type: task

See `../spec.md`, "Grid selection" and "Navigation".

- New Area `utilities.records`, label "Records", breadcrumb `["Utilities", "Records"]`, `requires: "model-driven-app"`, registered in `src/modules/utilities/module.ts`.
- Pick a grid from `utilities.generateFetchXml` using the existing `useSelectDialog`, then run the chosen query through `webapi.executeFetchXml`, capped at two hundred and fifty rows with a load-more that raises the cap.
- Render with `DataTable`, deriving columns from the returned rows as `src/modules/webapi/areas/retrieve-records/ResultsPreview.tsx` does, with explicit widths rather than `autoFitColumns`.
- Row click and the Prev and Next buttons call `utilities.navigateToRecord`. Highlight the row matching the bound tab current Record via `rowClassName`, reading `utilities.getPageTarget` and refreshing it off the tab binding invalidation from `extension-surfaces/01` so the highlight follows in-app navigation.
- Pure helpers with tests in `src/modules/utilities/lib/recordSet.ts`: `recordSetRows` (untyped rows to id, primary name and display columns, tolerating a missing primary name), `recordSetPosition` (index of the current Record, and whether prev or next exist), `recordSetStep`.
- Harness: a fixture set of sixty rows for one view and twelve for a subgrid, so the list, the cap, the load-more and stepping all render at panel width.

Blocked by: 01, 02

## Comments

The Area invalidates `utilities.getPageTarget` itself after navigating rather than relying only on `webNavigation.onHistoryStateUpdated`. The event does fire for a real in-app navigation and the watcher from `extension-surfaces/01` would catch it, but making the Area responsible for refreshing what it just changed means the position caption and the highlight are correct even if the event is missed, and it is what makes the flow testable in the harness at all.

Verified in the side panel: choosing a view loads 120 records, clicking the fourth row reads "Record 4 of 120", Next moves to 5, Previous back to 4, and the current row is highlighted. The 250-row cap and its load-more are implemented and unit tested but the fixture returns only 120 rows, so the truncation path was not exercised live.
