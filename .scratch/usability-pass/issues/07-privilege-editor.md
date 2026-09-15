# Privilege Editor Polish

Status: resolved
Type: task

See `../spec.md`, "Role Compare and Privilege Editor".

- Filter the role list with `TableFilter` and raise its `maxHeight` so more than four rows are visible at Workspace width.
- Filter the privilege table on role, table and privilege name, and add the depth filter the data layer already supports (`depthFilter` in `src/modules/security/lib/privilegePlan.ts` is written and tested but unreachable from the UI) as a multi-select of depths.
- Render the privilege and current-depth columns with `ValueChip` from `02`.
- Add a select-all-filtered action, so narrowing to "every Organization privilege on Account" and selecting the result is two gestures rather than a hundred.
- Keep the plan honest: `privilegeDepthPlan` already skips cells already at the target, and the summary already says so.
- Harness: reuse the existing privilege fixtures; confirm filtering to one depth then selecting all produces a plan of only those cells.

Blocked by: 01, 02

## Comments

The depth filter that `depthFilter` already supported is now reachable, as a multi-select of depths beside the text filter. `Select all N` acts on the filtered set, so narrowing to one depth on one table and selecting the result is two gestures.

The role list is taller and filterable. Privilege and current depth render as chips.

Selection is held outside the filtered list, the same as everywhere else in this pass, so narrowing the privilege table does not drop cells already ticked.
