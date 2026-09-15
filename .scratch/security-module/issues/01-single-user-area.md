# Single User Area

Status: resolved
Type: task

See `../spec.md`, "Single user".

- In `src/modules/security/module.ts`, relabel the `security.roles` Area to "Single User" with breadcrumb `["Security", "Single User"]`, and keep the id so `lastVisitedArea` and any saved state still resolve.
- Add the id to `LEGACY_AREA_IDS` in `src/modules/registry.ts:32-35` only if the id changes; prefer keeping `security.roles` so no remap is needed.
- Confirm `src/shared/components/AppNavDrawer/AppNavDrawer.tsx:48-54` renders the Module as a `NavCategory` once it has more than one Area, and that `AreaBreadcrumb` turns segment zero into the Area switcher.
- No behaviour change to `RolesArea.tsx`, `RoleTable.tsx`, `PendingChangesList.tsx` or the staging store beyond consuming the deduped role list from `02`.
- Harness: confirm the Security Module renders as a category with its Areas listed.

Blocked by: none

## Comments

The Area id stayed `security.roles`, so no `LEGACY_AREA_IDS` remap was needed and any saved last-visited area still resolves. Only the label, breadcrumb and tooltip changed. `AppNavDrawer` collapses a single-Area Module to a flat item, so the Security Module only became a category once `03` added a sibling; verified in the harness showing "Single User" and "Bulk Users" beneath it.
