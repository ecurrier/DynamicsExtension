# Query Runs over several Connections

Status: ready-for-agent
Type: task
Phase: 2
Blocked by: 14

See `../spec.md`, decisions 5, 23, 25.

Phase 1 runs a Query over one Connection. This makes the Workspace hold a list of Connections and one Query Run per Connection.

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
