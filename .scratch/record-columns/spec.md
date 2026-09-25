# Record Columns

Status: resolved
Decided: 2026-09-24 (grilling session)

## Problem

Web API › Update Fields edits one Column at a time: pick it from a list, type a value into an empty input, submit, then search again for the next one. Users have also started using it just to _read_ values, because the form usually shows a small part of a Table's Columns, and one value at a time is a slow way to look around. Three asks:

1. See every Column of the open Record in one searchable, filterable list, like Level Up's "All fields".
2. Edit several Columns inline in that list and save them together.
3. Start each editor with the current value, so changing a long name means editing it rather than retyping it.

## Vocabulary

Terms from `CONTEXT.md`: Module, Area, Surface, Record, Table, Column, Choice, Polymorphic Lookup, Requirement Level, Dirty, Draft (new, added in this session), Automation, Bulk Run.

## Decisions

1. **Replace, not add.** One Area replaces Update Fields; editing a single Column is just the list used for one row. The picker Area and its `AttributePicker` go away.
2. **Name.** The Area is **Record Columns**, id `webapi.record-columns`, breadcrumb Web API › Record Columns. A remembered `webapi.update-fields` resolves to the new id through the registry's legacy Area aliases.
3. **The open Record only.** Same Page Requirement as today (`model-driven-app`, page Connection). A Record that has not been saved yet shows a message instead of the list. Typing in a Table and GUID, or using an Environment connection, is out of scope.
4. **An Area, not a Workspace.** Rows are laid out for the 700 px popup and also work in the pinned window and side panel. A pop-out Workspace can come later without changing the design.
5. **Every Column is shown.** Columns that cannot be updated (`IsValidForUpdate` false, calculated and rollup, system columns such as `createdon` and `versionnumber`) and types the editor does not support (primary key, PartyList, EntityName, Image, File, other Virtual types) appear as read-only rows with their value. Columns with `AttributeOf` set are left out, because the Web API folds them into their parent's annotations.
6. **Pre-filled Drafts.** Each editor starts with the Column's current value. A row has a Draft only while its value differs from the loaded one; editing it back removes the Draft. Each Draft row has an undo that restores the loaded value.
7. **Empty means cleared.** Emptying a text, memo, number, or date editor clears the Column; date editors also have a ✕. Choice and Boolean editors are native selects with an empty "—" option, and lookup and multi-choice editors have a ✕. The "Clear field" checkbox goes away.
8. **One request, all or nothing.** Save sends one update containing every Draft. If the platform rejects it (a validation error, a plug-in exception), nothing is written, every Draft stays, and the server's error is shown. Clearing a lookup goes into the same request as `"<navigationProperty>@odata.bind": null` instead of today's separate `$ref` DELETE. This is not a Bulk Run: Automation runs once, against the whole change.
9. **Save bar and Review.** Once there is at least one Draft, a bar pinned to the bottom of the Area reads "N changes · Review · Discard all · Save". Review expands a compact list of `Column: old → new`. Each entry has an undo, and clicking the Column name scrolls to its row and focuses it. Save asks for no further confirmation.
10. **Search, filters, sort.** Search matches display name, logical name, and the current value as displayed (formatted value, and the raw value or GUID). Filter chips: _Changed_ (rows with a Draft), _Has value_, _Not on form_, _Editable_, _Custom only_. Sort by display name (default) or logical name. There is no type filter in v1.
11. **Loads on open.** The list loads as soon as the Area opens, with a Reload button in the toolbar. The Table's Column metadata is cached per Table after the first load.
12. **Validation.** A Draft that cannot be sent (non-numeric text in a number Column, a fraction in a whole-number Column, an invalid date) marks its row and blocks Save; the bar says "N Drafts are invalid" and jumps to the first one. Clearing a Column whose Requirement Level is ApplicationRequired shows a warning badge on the row but is allowed, because the Web API allows it.
13. **Refresh the form after save.** After a successful save, the open form's data is refreshed so it shows the new values. If the form has Dirty Columns, the user is warned and chooses between refreshing (losing the form's unsaved edits) and leaving the form alone.
14. **Drafts belong to one Record.** They last while the Area is open. If the tab moves to another Record, the list reloads for it and the Drafts are dropped, with a notice. If the Record's values change on the server (the user saves the form), the current values reload: Drafts that now equal the new value are dropped, and the rest stay.

## The list

Data comes from three sources that already exist in the code:

- **Column metadata:** `codegen.getTableModel` (`CodegenColumn`). It already has `isValidForUpdate`, `isCustom`, `requiredLevel`, `dateTimeFormat`, `dateTimeBehavior`, lookup targets with entity set names, and option sets. This replaces `webapi.getAttributeMetadata`.
- **Values:** `webapi.getRecordValues`, which reads the saved Record from the server with every Column and its annotations.
- **On-form flag:** `utilities.getFormAttributes`, reduced to the logical names of attributes that have at least one control, so a column the form loads without showing counts as not on the form.

Each row shows the display name, with the logical name under it in a smaller muted style, on the left. The editor is on the right, or the formatted value for read-only rows. Row markers: a Draft marker with undo, a required-warning badge, a read-only indicator, and a copy-value button. Multi-line text grows when focused.

Editors by type: text and memo use the existing inputs; number uses a numeric input with the raw value; DateOnly uses a date input; DateAndTime uses a date-time input. Choice, Boolean, and State/Status use a dropdown, and multi-choice uses the multi-select dropdown. Lookups use `RecordLookup`, starting at the current target, and a Polymorphic Lookup keeps the current target Table preselected. Rows are memoised and use `content-visibility: auto`, so a keystroke re-renders one row and off-screen rows are not laid out; `DataTable` has no virtualization, so the list is its own component. Every editor mounts directly.

Date-time pre-fill: for `UserLocal` columns, the server's UTC value is shown in browser local time; `TimeZoneIndependent` and `DateOnly` values are shown as stored.

## Saving

The Area builds one payload from every valid Draft (`nav@odata.bind` for lookups, comma-joined multi-choice, `null` for cleared) and `webapi.saveRecord` sends it as a raw Web API `PATCH` with `If-Match: *`, guarded by `requireSavedRecord`. The raw request keeps `@odata.bind: null` away from any client-side processing in `Xrm.WebApi`, and `If-Match: *` stops a `PATCH` against a deleted record from creating it. On success: toast "Saved N columns", reload values, drop every Draft, then read `webapi.getFormState` and refresh the form with `webapi.refreshForm`, asking first when the form is Dirty (decision 13). On failure: the server's message appears in the save bar and nothing else changes.

## Record changes

The Area refetches the Record's values whenever its window regains focus and on Reload; the app already refetches every page query when the tab moves to another Record. Drafts are stored with the Record id they belong to. A different id hides them and shows the dropped notice; a new set of values for the same id prunes the Drafts that now equal the loaded value.

## Verification

Unit tests cover building the rows (editable and read-only classification, value display, on-form flag), pre-filling Drafts from values for every type, Draft equality with the loaded value, empty-means-cleared, the combined payload including lookup clears on single-target and Polymorphic Lookups, search matching on values, and each filter chip. The harness serves a Table model with read-only, unsupported, custom, required, and polymorphic columns, record values with annotations, and form attributes that cover only part of the Table, and records the last save payload. A real org is needed for: clearing a lookup through `@odata.bind: null` in `updateRecord`; the form refresh and its Dirty prompt; date-time pre-fill across time zones; and the error text from a failing plug-in.

## Out of scope (v1)

Records other than the open one, Environment connections, create forms, a Workspace pop-out, a type filter, editing PartyList, Image, and File Columns, bulk edits across Records, If-Match concurrency checks, and keeping Drafts after the Area closes.

## Acceptance

- Web API shows **Record Columns** in place of Update Fields, and a user whose remembered Area was Update Fields lands on Record Columns.
- Opening the Area on an account form lists every Column, including ones not on the form and read-only system Columns such as `createdon`, each showing its current value.
- Searching the Record's parent account GUID finds `parentaccountid`; the _Not on form_ chip narrows the list to Columns the form does not show.
- Changing `name` (pre-filled), emptying `telephone1`, and clearing `primarycontactid` shows "3 changes"; Review lists all three as old → new; Save sends one request whose body has `name`, `telephone1: null`, and `primarycontactid@odata.bind: null`; the form then shows the new values.
- Typing "abc" into a number Column blocks Save and the bar jumps to that row.
- With a Dirty Column on the form, saving warns before refreshing the form.
- Every new or changed page command has a harness stub.
