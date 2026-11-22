# Workspace shell: paste, run, see Records

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 01, 03

See `../spec.md`, decisions 1, 5, 6, 7, 8 and "Architecture > Workspace". ADR 0002, ADR 0003.

Before starting, read the `## Comments` sections of issues 01 and 02: they document the Query core's API and the decisions made while building it.

The first end-to-end slice: open the Workspace, paste Fetch XML, run it, see the first page. No tree yet; the left pane shows a placeholder.

- Register the Workspace the way Schema Tools is, touching the same files: `src/entrypoints/query-builder/{index.html,main.tsx}`, `src/query-builder/` (app, bootstrap hook, store, stylesheet, barrel), `WorkspaceId` and a `QueryBuilderLaunch` type in `src/shared/types/workspaces.ts`, `WORKSPACE_PAGES`, a launch storage item, `areaWorkspaceLaunch`, a lazy import in `WorkspaceOutlet`, and a line in `dev/harness/build.mjs` producing `harness-query-builder.html`. The launch payload carries the source tab or Environment and an optional `fetchXml` to open with. The entrypoint owns its stylesheet; do not import a stylesheet through a barrel.
- A new Module **Query Builder** (`src/modules/querybuilder/`) with one Area, id `querybuilder.builder`, label "Query Builder", `fit: "workspace"`, placed after Web API in the drawer, added to the registry.
- Workspace header: the title, the shared `ConnectionPicker`, "Open in a new tab" when hosted in the pinned window (as the other Workspaces do), and a primary Run button, also on Ctrl+Enter.
- Three panes, resizable by dragging the dividers and each collapsible: left (placeholder for the tree), right (XML), bottom (results). Sizes are kept for the session only. Use container queries, not media queries.
- Store (Zustand): the XML text, the last valid Query, the parse error, the selected node path, and the current Query Run. Typing in the XML pane sets the text and re-parses after a short debounce; a successful parse replaces the Query, a failed one keeps the last valid Query and records the error.
- XML pane: the shared `CodeEditor` in fill mode. While the XML does not parse, a banner above it names the error and Run is disabled.
- Run: resolves the root Table's entity set name through `getTable`/`listTables`, calls `runQuery` for the first page (page size 50 unless the Query sets `count` or `top`), and shows the rows in the shared `DataTable` with one column per key returned. Errors from the platform show in the results pane with the platform's message. Switching Connection clears the results and keeps the Query.
- Harness: seed a launch payload for `harness-query-builder` in the shim.

Acceptance (in the harness):

- Query Builder appears in the navigation drawer and opens the Workspace in a tab; from `harness?mode=window&tabId=1&granted=1` it fills the window with a working back arrow.
- Pasting the fixture account query and pressing Ctrl+Enter shows 50 rows.
- Deleting a closing tag shows the error banner and disables Run; restoring it re-enables Run.
- The dividers drag, and each pane collapses and restores.
- No console errors. `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot in your report.

## Notes from earlier issues

Read the `## Comments` section of issue 03 before starting: it has the Gateway hook, the operation shapes, `pagedFetchXml`, and how errors differ by Connection. The harness fixtures already exist (account, contact, 130 accounts in pages of 50); this issue adds the `harness-query-builder` page and its seeded launch payload.
