# Starting points

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 04

See `../spec.md`, decision 19. ADR 0003 (the step explainer goes on the Workspace's own empty state).

- Empty state: when the Workspace has no Query, the shared `StepExplainer` plus four starting points. Once a Query exists, the same four are reachable from a "New" menu in the header, which asks before replacing a Query that has unsaved edits since it was last run or stored.
  - **Blank**: pick a Table (reuse an existing Table combobox); creates `<fetch><entity name="..."><attribute name="<primary name>"/></entity></fetch>`.
  - **Paste Fetch XML**: focuses the XML pane; pasting into the empty editor is enough.
  - **From a view**: pick a Table, then a view from two groups, System Views and Personal Views, with a filter box; loads that view's Fetch XML. Read-only: nothing is ever written back to the view.
  - **From the open page**: only when the Workspace has a source tab. Lists the grids and subgrids the page offers, through the existing `utilities.generateFetchXml` command, and loads the chosen one. Hidden for an Environment connection with no source tab.
- `query.listViews({ logicalName })` added to `queryOperations`: System Views (`savedquery`) and Personal Views (`userquery`) for the Table, each with id, name, kind and Fetch XML. Personal Views are new to the codebase; over an Environment connection the Service Principal sees only views shared with it, which is expected, and an empty Personal Views group says so in one line. Command contract, page handler, harness stubs and fake-fetch routes, `createFakeHttp` tests.
- Launch with Fetch XML: a launch payload that carries `fetchXml` opens the Workspace on that Query. Add "Open in Query Builder" to the Utilities Fetch XML dialog (`src/modules/utilities/dialogs/FetchXmlDialog.tsx`), which launches the Workspace with the dialog's current Fetch XML and the bound tab.

Acceptance:

- In the harness: each of the four starting points produces a Query in both panes (the tree placeholder or the tree, whichever exists when this lands); the view picker shows both groups; "Open in Query Builder" from the Utilities dialog opens the Workspace on that Fetch XML.
- `createFakeHttp` tests for `listViews`, including a Table with no Personal Views.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.

Needs a real org (issue 14): Personal Views over both Connections, and the page's grid Fetch XML arriving intact.
