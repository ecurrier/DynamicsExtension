# Cross Table Edit Workspace

Status: resolved
Type: task

See `../spec.md`, "Column edit" and decisions 2, 4 and 6.

- Add `"schema-tools"` to `WorkspaceId` in `src/shared/types/workspaces.ts`, payload `{ tool: "columns" | "polymorphic", tabId, environmentId }`, mapped in `src/workspaces/pages.ts` to a new `src/entrypoints/schema-tools/{index.html,main.tsx}`.
- Bootstrap with `src/schema-tools/useSchemaToolsBootstrap.ts` modelled on `useTransporterBootstrap.ts` so an Environment connection works with no tab.
- New Area `utilities.columns` or a new `schema` Module Area, label "Cross-Table Columns", body a `WorkspaceLaunchButton`.
- Workspace view: logical name input, optional custom-Tables-only and solution narrowing, then the match table with multiselect starting empty, a type-mismatch flag, and disabled rows carrying the reason from `01`.
- Choose which of label, requirement level and description to set, then hand a plan to `BulkRunDialog`: one item per selected Column. After the run, publish once for the distinct Tables that succeeded, using `publishTables` from `bulk-mutations/02`.
- Pure helpers with tests in `src/modules/schema/lib/columnEditPlan.ts`: `columnEditPlan` (skips rows already matching the target values), `tablesToPublish` (distinct Tables from the succeeded items), `columnEditSummary`.
- Harness: reuse the `01` fixtures so a three-Table edit previews, runs with one failure, and publishes only the two that succeeded.

Blocked by: 01, 02, bulk-mutations/01, bulk-mutations/02

## Comments

Verified in the harness against four tables carrying the same column, one of them a different type, one managed but editable, and one locked. Searching lists all four with the lock reason spelled out; selecting all four and setting a label reads "3 tables will change, 1 locked by a managed solution", so the locked row is visible but never planned. Running it gave "2 of 3 applied, 1 failure" with the failure naming the table, and publish fired for `account, incident` only — the two that succeeded, not the one that failed. That publish-follows-success behaviour is the property most worth protecting in future edits.

The type mismatch is flagged in colour rather than filtered out, per decision 1 of the spec: a column of a different type on one table is itself worth seeing.
