# Dirty Columns Utility

Status: resolved
Type: task

See `../spec.md`, "Dirty Columns".

- Page command `utilities.getDirtyColumns` (query): for the open form, returns the table name, record id, whether the Record is new, the total attribute count, and one entry per attribute where `getIsDirty()` is true: logical name, display name, type, required level, submit mode, formatted current value, whether it has a control, and the controls with tab, section, visibility, and disabled state.
- Pure helpers in `src/modules/utilities/lib/dirtyColumns.ts` with tests: `dirtyColumnFindings` (submit outcome, control state tags, `never` first then by display name), `dirtyColumnsSummary` (caption), `dirtyColumnsToText` (Copy).
- Dialog `DirtyColumnsDialog`: caption, `DataTable` with Column, Logical name, Value, and On save cells, row click reveals the control through `utilities.revealFormColumn`, Copy.
- Card on the Admin Area after Toggle Logical Names, action label Show.
- Harness: stub with four sample changes on the account form (one hidden control, one read-only with submit mode `never`, one attribute with no control and submit mode `always`).

Blocked by: none
