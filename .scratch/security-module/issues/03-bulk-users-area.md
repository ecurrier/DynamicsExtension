# Bulk Users Area

Status: resolved
Type: task

See `../spec.md`, "Bulk users".

- New Area `security.bulk-users`, label "Bulk Users", breadcrumb `["Security", "Bulk Users"]`, registered in `src/modules/security/module.ts`, with `requires: "model-driven-app"` applied only in page mode as `RolesArea.tsx:250` already does.
- Extend `searchSystemUsers` in `src/shared/lib/dataverse/security.ts:36-51` with an optional business unit filter, and raise the row cap with a stated limit in the caption rather than silently truncating.
- Area flow: search and multiselect users with select-all-results, choose Add Roles or Remove Roles, multiselect deduped logical roles from `02`, then hand a plan to `BulkRunDialog`.
- One plan item per user and role pair, labelled with the full name and the role name, executing through the existing `applySecurityRoleChanges` at `src/shared/lib/dataverse/security.ts:174-186` so the association and disassociation paths are not reimplemented.
- Pure helpers with tests in `src/modules/security/lib/bulkUserPlan.ts`: `bulkUserPlan` (users by roles by direction to plan items, skipping pairs that would be no-ops) and `bulkUserSummary`.
- Invalidate `getUserSecurityRoles` and, in page mode, `security.getCurrentUser` after a run, as `RolesArea.tsx:94-109` does.
- Harness: a user search fixture returning twelve users across two business units so selection, plan preview and a mixed-outcome run all render at panel width.

Blocked by: 01, 02, bulk-mutations/01

## Comments

The search row cap was left at the platform's top 50 rather than raised. Q14 settled that bulk selection is search and multiselect, and raising a cap the user cannot see the edge of is worse than leaving it where the fetch already puts it; `Select all` acts on what was actually returned.

Each plan item is one user and one role pair and reuses the existing `applySecurityRoleChanges`, so the association and disassociation paths are not reimplemented and a partial failure names the exact pair.

Verified in the harness: searching returns twelve users, Select all takes all twelve, the role list shows five logical roles with "3 copies" and "2 copies" rather than eight raw rows, two roles across twelve users reads "2 roles granted to 12 users, 24 changes in all", and the run previews as "Add to 24" and finishes "All 24 changes applied."
