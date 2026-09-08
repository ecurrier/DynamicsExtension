# Column Browser Utility

Status: resolved
Type: task

See `../spec.md`, "Column Browser".

- Card on the Developer Area (`DatabaseSearch20Regular` is taken by Table Metadata; pick a distinct icon). Action reads `utilities.getPageTarget` for the Table, then loads columns through the metadata command extended in code-generation/03 (schema name, type, required level, max length, precision, targets, choice name). Do not block on code-generation: if that issue has not landed, extend `investigate.getTableColumns` here with the same fields and let code-generation reuse it.
- Dialog `ColumnBrowserDialog` in `src/modules/utilities/dialogs`: search input filtering on display, logical, and schema name (case-insensitive substring); `DataTable` with display name, logical name, schema name, type, required, extra; per-row `Menu` with Copy logical / schema / display name (reuse `copyText` from shared lib); row action "Find on form" that closes the dialog and opens Find Column on Form (issue 02) pre-filled, disabled when the column is not on the open form (the form's attribute list comes from issue 02's command).
- Pure helpers (`filterColumns`, `columnExtra`) in `src/modules/utilities/lib` with tests.
- Harness: stub returns the sample Table's columns.

Blocked by: none (02 only for the hand-off action)
