# Admin Utilities

Status: ready-for-agent
Decided: 2026-09-11

## Problem

Nothing in the Admin Area shows what the next save will send. Makers debugging scripts and business rules ask "which fields did that change", and today they read the form monitor or diff the Record after saving. A Utility that lists every Dirty Column on the open form, with its current value and whether the save will actually send it, answers that in one click.

## Vocabulary

Terms from `CONTEXT.md`: Utility, Column, Record, Dirty, Page connection.

## Decisions

1. **Page connection only.** The Utility reads the open model-driven app form through the Page Bridge, like the rest of the Area.
2. **Read-only.** It never changes a value or a submit mode; the result is a dialog with a table and a Copy button.
3. **Submit mode is part of the answer.** A Dirty Column with submit mode `never` is the surprise worth flagging, so it sorts first and carries a red badge; `always` is shown too, since it is sent even without a change.
4. **Locate reuses Find Column.** Selecting a row calls the existing `utilities.revealFormColumn` command with `show: false`, so the page scrolls to the control without changing its visibility.

## Dirty Columns

Card on the Admin Area. The dialog caption says how many of the form's Columns changed, notes when the Record is new (every populated Column counts), and counts the Columns a `never` submit mode excludes. Rows show the display name, logical name, current value, and an "On save" cell with the submit outcome badge plus the control state badges (hidden, read-only, required), or "Not on form" for an attribute with no control. Copy writes one line per Column.

## Verification

Pure helpers in `src/modules/utilities/lib/dirtyColumns.ts` are unit tested. The dialog renders in the harness from the `utilities.getDirtyColumns` stub. `getIsDirty`, `getSubmitMode`, and the row-click scroll need a real org.

## Out of scope (v1)

Environment connection, resetting a Column to its saved value, changing submit modes, watching the form live.

## Acceptance

- Admin Area shows a Dirty Columns card in the same grid as the other Utilities.
- On a form with no changes the dialog says so and names the Column count.
- A Column with submit mode `never` sorts first and reads "Never saves".
- Copy yields one line per Column with value and state.
- The page command has a harness stub.
