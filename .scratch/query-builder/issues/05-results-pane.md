# Results pane

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 04

See `../spec.md`, decisions 16, 17.

Turn the bare grid from issue 04 into the pane used for checking a Query. Put the shaping logic in a pure `lib/` module next to the Workspace, with tests.

- Columns: derived from the Query first (the root Table's selected Columns in Query order, then each link-entity's Columns under `alias.column`), then any other keys the rows carry. Annotation keys never become columns. Lookup Columns arrive as `_name_value`; show them under the Column's logical name. Aggregate and aliased Columns show under their alias.
- Values: a friendly/raw toggle. Friendly uses the formatted-value annotation where present; raw shows the stored value (the option number, the GUID, the ISO date). Empty values are visibly empty, not "null".
- Opening Records: the row's primary key opens the Record in the Environment in a new browser tab; a lookup value opens the Record it references, using the lookup-logical-name annotation. For a Page connection the base URL is the source tab's origin; for an Environment connection it is the Environment's URL.
- Paging: "Next page" loads and shows the next server page; "Load all" keeps loading until no more exist, with a visible running count and a Stop button, and asks for confirmation before going past 50,000 Records. Loaded pages accumulate in the Query Run.
- Display: the grid shows the loaded Records one display page at a time with previous/next and a "Records 51-100 of 320 loaded" caption, so a large load does not render tens of thousands of rows at once. No virtualisation library.
- Status line: Records loaded, whether more exist on the server, elapsed time of the last request, and the Connection the Query Run used.
- A second view, "JSON", shows the raw Web API response of the loaded pages in a read-only `CodeEditor`.
- A Query with `top` or `aggregate="true"` shows no paging controls.
- A maximise button fills the Workspace with the results pane, hiding the tree and XML, and restores them; Escape also restores. The Query Run and scroll position are kept across the switch.

Acceptance:

- Unit tests for column derivation (root, linked with and without alias, lookup keys, aggregates), friendly and raw values, and the Record URL for both Connection kinds.
- In the harness: Next page moves from 50 to 100 loaded; Load all reaches 120 and reports no more; the toggle switches a Choice column between its label and its number; the JSON view shows the response; maximise fills the Workspace and restore brings the tree and XML back as they were.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.

Needs a real org (issue 14): the exact keys linked-Table Columns arrive under, with and without an alias.
