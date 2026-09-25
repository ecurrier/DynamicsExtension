# Record Columns model

Status: resolved
Type: task

See `../spec.md`, decisions 5-8, 10, 12 and "The list".

Pure logic in `src/modules/webapi/lib/`, with tests. No UI or page commands.

- `RecordColumn` row type built from `CodegenTable` + `RecordValues` + the on-form set: logical and display name, input kind or read-only (with the reason: not valid for update, unsupported type, primary key), formatted and raw value, `onForm`, `isCustom`, `requiredLevel`. Columns with `attributeOf` are left out.
- `draftFromValue(column, values)`: pre-filled Draft for every input kind, including DateOnly, UserLocal and TimeZoneIndependent date-times, lookups (current target and id), and multi-choice.
- `isDraftChanged(column, draft, loaded)`: equality with the loaded value, so editing back removes the Draft.
- Empty means cleared: `draftToFieldValue` returns `clear` for empty text, memo, number, and date instead of a validation error. Choice, Boolean, lookup, and multi-choice clear through an explicit cleared state.
- `buildRecordPayload(columns, drafts)`: one payload from every valid Draft. Lookup clears become `"<navigationProperty>@odata.bind": null`, using the current target's navigation property for a Polymorphic Lookup.
- Validation result per Draft, plus a `requiredCleared` flag for ApplicationRequired Columns.
- Search fields (display name, logical name, formatted and raw value) for `useTableFilter`, and predicates for the _Changed_, _Has value_, _Not on form_, _Editable_, and _Custom only_ chips.
- Retire what only Update Fields used (`initialDraft`, the `clear` checkbox field, `currentLookupTarget` if unused) once 03 lands, not here.
