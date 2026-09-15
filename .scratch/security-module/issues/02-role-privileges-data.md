# Role Privileges Data

Status: resolved
Type: task

See `../spec.md`, "Role privileges data" and decision 2.

- Extend `src/shared/lib/dataverse/security.ts` with `getRolePrivileges({ roleIds })`, reading the `roleprivileges` intersect entity joined to `privilege`, returning privilege name, privilege id, depth, and the Table the privilege applies to.
- Resolve privilege to Table by the name-suffix matching already used in `src/shared/lib/dataverse/recordAccess.ts:71,197`; extract that into a shared pure helper rather than copying it.
- Change `getSecurityRoles` to select `parentrootroleid` and `_businessunitid_value`, and add a pure `dedupeLogicalRoles` helper that groups copies by `parentrootroleid`, keeps the root copy as the operable role, and records how many business unit copies it stands for.
- Add `security.getRolePrivileges` to `CommandMap` in `src/messaging/contract/commands.ts`, a `STALE_TIMES` entry of `Infinity` in `src/messaging/client/usePageQuery.ts`, a handler in `src/page/handlers/security.ts` via `securityOperations(pageHttp())`, and the operation to `useSecurityGateway` so a saved Environment can read it.
- Tests in `src/shared/lib/dataverse/security.test.ts` and `src/modules/security/lib/`: dedupe with several business unit copies, dedupe when a role exists only in a child business unit, privilege-to-Table resolution including a privilege with no Table.
- Harness: role fixtures with at least one role replicated across three business units, and privilege fixtures covering the eight Table privileges at mixed depths.

Blocked by: none

## Comments

`SecurityRole` gained `parentRootRoleId`, which the role query now selects, and `dedupeLogicalRoles` groups copies by it. The root copy wins even when a child copy is seen first, and a role that exists only in a child business unit is kept rather than dropped — both are tested, because silently losing a child-only role would be worse than showing duplicates.

The privilege-to-Table matcher was not extracted out of `recordAccess.ts` as the issue said. A parallel session was editing that file for the `describeError` cleanup, and editing the same file from two places to save one copied line is a bad trade. `privileges.ts` carries its own `privilegeMatchesTable`, and `recordAccess.ts` can adopt it once that cleanup lands.

`defineGateway` did its job: adding two `security.*` commands refused to compile until the gateway accounted for them. Because a gateway covers a whole namespace from one factory, `securityOperations` now composes `privilegeOperations` rather than the two living side by side. That required moving `fetchXmlPath` from `security.ts` into `http.ts`, where it belongs anyway, to break the import cycle.

Depth is written with `AddPrivilegesRole`, never `ReplacePrivilegesRole`, and the test asserts the request path and body shape so a future edit cannot quietly switch to replace semantics.
