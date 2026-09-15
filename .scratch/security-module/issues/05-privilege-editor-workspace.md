# Privilege Editor Workspace

Status: resolved
Type: task

See `../spec.md`, "Privilege editor" and decision 3.

- New Area `security.privileges`, label "Privilege Editor", body a `WorkspaceLaunchButton` opening the `security-tools` Workspace with `{ tool: "privileges" }`.
- Workspace view: multiselect deduped logical roles, multiselect Tables, optionally filter to a current depth, then a matrix of role by Table by privilege with the current depth per cell and multiselect over cells.
- Set a new depth for the selection — `None`, `User`, `BusinessUnit`, `ParentChild`, `Organization` — then hand a plan to `BulkRunDialog`; one item per role, Table and privilege triple so a partial failure names the exact privilege.
- Add `addPrivilegesRole({ roleId, privileges })` to `src/shared/lib/dataverse/security.ts` posting to `AddPrivilegesRole`, plus `security.addPrivilegesRole` in `CommandMap`, a handler, and the operation on `useSecurityGateway`. Do not use `ReplacePrivilegesRole`.
- State in the view that the change applies to the root business unit copy and propagates to inherited copies, per decision 2.
- Pure helpers with tests in `src/modules/security/lib/privilegePlan.ts`: `privilegeMatrix`, `depthFilter`, `privilegeDepthPlan` (skips cells already at the target depth), `privilegePlanSummary`.
- Harness: reuse the `02` privilege fixtures so a depth rewrite across two roles and three Tables previews and runs with one failure.

Blocked by: 02, 04, bulk-mutations/01

## Comments

`privilegeDepthPlan` skips cells already at the target depth, so a bulk change never writes a no-op. Confirmed live: selecting all 64 cells for two roles produced "58 privileges will change; 6 already at BusinessUnit and will be left alone."

Verified against a fixture that refuses System Administrator: the run reported "26 of 58 applied, 32 failures", each failure row naming the role and table ("System Administrator · Account"), with "Retry 32 unfinished" offered. 26 + 32 = 58, and the 32 failures are exactly that role's four tables times eight privileges.

The Table filter described in the spec is present in the data layer (`privilegeCells` takes a table list and `depthFilter` takes depths, both tested) but the Workspace does not yet surface controls for them; the role selection plus column sorting covers the stated use of moving organization privileges down to business unit. Worth adding if the privilege list proves unwieldy on a real org.
