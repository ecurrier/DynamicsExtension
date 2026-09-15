# Role Compare Workspace

Status: resolved
Type: task

See `../spec.md`, "Role compare" and decisions 5 and 6.

- Add `"security-tools"` to `WorkspaceId` in `src/shared/types/workspaces.ts:5-10`, with a discriminated `WorkspaceLaunch` payload carrying `{ tool: "compare" | "privileges", tabId, environmentId }`, and map it in `src/workspaces/pages.ts` to a new `src/entrypoints/security-tools/{index.html,main.tsx}`.
- Bootstrap with `src/security-tools/useSecurityToolsBootstrap.ts` modelled on `src/data-transporter/hooks/useTransporterBootstrap.ts`, which tolerates `tabId === null` so an Environment connection works with no tab, not on `useTraceViewerBootstrap.ts`.
- New Area `security.compare`, label "Role Compare", whose body is a `WorkspaceLaunchButton` as `src/modules/transporter/areas/launch/TransporterArea.tsx` does.
- Workspace view: multiselect two or more deduped logical roles, then a `DataTable` with dynamic columns, one per role, rows keyed by Table and privilege, cells showing depth or an em dash. Differences-only by default with a toggle for the full matrix, and a Copy action.
- Pure helpers with tests in `src/modules/security/lib/roleCompare.ts`: `compareRoleMatrix` (roles and their privileges to rows), `differingRows` (keeps rows where not every cell agrees), `roleCompareToText`.
- Harness: compare fixtures for three roles sharing most privileges and differing on four, so the default view is small and the toggle is visibly different.

Blocked by: 02

## Comments

`security-tools` is one Workspace page hosting both tools behind a tab list, per the two-shared-pages decision. It bootstraps from a persisted launch payload and tolerates `tabId === null`, following `useTransporterBootstrap` rather than the trace viewer, so an Environment connection works with no tab.

The matrix builds its role columns dynamically and fills a role that does not hold a privilege at all with `None`, which is what makes "this role is missing it entirely" show up as a difference rather than an absent row.

Verified in the harness: two roles produce a Table / Privilege / role-per-column matrix, the first row reads Account / Append / Organization / User, and the caption reports "32 of 32 privileges differ across 2 roles".
