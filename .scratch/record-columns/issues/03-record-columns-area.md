# Record Columns Area

Status: resolved
Type: task

See `../spec.md`, decisions 1-7, 10, 11 and "The list".

- Replace `areas/update-fields` with `areas/record-columns`. Area id `webapi.record-columns`, label and breadcrumb Record Columns, new tooltip. Map `#webapi-update-fields-content` in `legacyKeys.ts` to the new id, and resolve a remembered `webapi.update-fields` to it (the same pattern as `migrateFormPresets`).
- Load on open: `codegen.getTableModel`, `webapi.getRecordValues`, and `utilities.getFormAttributes`, with a Reload button in the toolbar. An unsaved Record shows a message instead of the list.
- The list: display name over the logical name on the left; a pre-filled editor or a read-only value on the right; Draft marker with undo, required-warning badge, copy-value button. Multi-line text grows when focused. Lookup and multi-choice editors may render as their value until focused.
- Search through `TableFilter`, the five filter chips, and sort by display or logical name.
- Delete `AttributePicker`, `UpdateFieldsArea`, and `webapi.getAttributeMetadata` with its harness stub and timeout, if nothing else uses them.
- Check at 700 × 600 in the popup, the pinned window, and the side panel.

Blocked by: 01, 02
