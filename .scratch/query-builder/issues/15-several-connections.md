# Query Runs over several Connections

Status: resolved
Type: task
Phase: 2
Blocked by: 14

See `../spec.md`, decisions 5, 23, 25.

Phase 1 runs a Query over one Connection. This makes the Workspace hold a list of Connections and one Query Run per Connection.

- All UI text follows spec decision 31 (few words, Simplified Technical English); issue 19 lists the rules.
- Header: the first Connection stays where the picker is and remains the one whose metadata drives the pickers and autocomplete. An "Add Connection" control adds further Connections: any saved Environment, and the source tab's Page connection if it is not already in the list. Each added Connection can be removed. The same Environment cannot be added twice.
- Run starts a Query Run on every Connection in the list at once. Each runs and pages independently; one failing or being slow does not hold the others.
- Before a Connection's Query Run starts, the Query is validated against that Connection's own metadata (issue 08's `validate`, loading that Connection's Tables). A Table or Column the Environment lacks is shown as that Connection's error ("contoso_region does not exist on account in Contoso UAT") and its request is not sent; the other Connections still run.
- Results pane: one tab per Connection, each tab's label showing the Connection name and, once known, the Record count or an error mark. Each tab is the phase 1 results pane unchanged, with its own paging, Load all, friendly/raw toggle and JSON view. Opening a Record opens it in that tab's Environment.
- A summary strip above the tabs shows every Connection's count and elapsed time side by side, with "50+" style counts while more Records exist on the server, and a "Load all on every Connection" action.
- History (issue 11) records one entry per Query Run, as before.
- With a single Connection in the list, the Workspace looks and behaves exactly as it did in phase 1: no tabs, no strip.
- Harness: a second and third seeded Environment whose fake data differs from the first (some Records missing, some values changed), and one whose `account` lacks a Column the fixture Query uses.

Acceptance:

- In the harness: adding two Environments and running shows three tabs with three counts; the Environment missing a Column shows its error while the others show Records; removing the extra Connections returns the Workspace to its phase 1 appearance.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.

## Comments

Resolved 2026-11-22. Built by an Opus worker, reviewed and verified (typecheck, lint, 1,539 tests, build; in the harness, adding Contoso Test and pressing Run gave a tab and a count for each Connection and a summary strip).

- Store: `connections` is the list and `connection` its first entry. `runs` holds one Query Run per Connection, keyed `"page"` or `"environment:<id>"`, each with its own pages, paging state, stop flag, 50,000 pause, status and error. Run ids are unique across Connections, so a late reply for a removed Connection is dropped. The rules are pure functions in `lib/connectionList.ts` and `lib/queryRuns.ts`.
- One Gateway per Connection without hooks in a loop: `ConnectionRunners.tsx` renders one `ConnectionRunner` per Connection, which calls `useConnectionRunner`, owns that Connection's Gateway and Table metadata, and registers a `{ start, loadPages }` runner in a plain map inside the store. `useQueryRun()` takes no arguments and every paging action takes a Connection key.
- With two or more Connections, each validates the Query against its own metadata before sending; a `missing-table` or `missing-column` becomes that Connection's error through `connectionLacks` and no request is sent there. With one Connection the check is skipped, so phase 1 behaviour is unchanged.
- UI: `ConnectionChips.tsx` in the header, `MultiResultsPane.tsx` (tabs; its tab list takes string values, so a "compare" tab can be added), `ResultsSummaryStrip.tsx`.
- Harness: Environments "Contoso Test" and "Contoso Staging" with data that differs from the first (130, 121 and 125 accounts; some Contoso Test Records share a name with base Records but have a different id); `?queryFetchXml=regions` uses a Column that Contoso Staging lacks.

For issue 17: `useQueryRun().loadRemaining(key, pastLimitConfirmed?)` returns a promise of `"complete" | "stopped" | "confirm" | "failed" | "unavailable"`; `useQueryBuilder(s => s.runs[key])` gives a run's `rows` and `pages`; `useQueryRunColumns(connection, run)` gives its result columns and Record link base.

Decisions made here: swapping the first Connection keeps both Connections' results. Run needs only the first Connection to be ready; another Connection that is not ready shows its own error. Tabs and the strip appear as soon as a second Connection is added.

Not verified: a real org; the picker swap in a browser (unit-tested only); keyboard-only use of the chips.
