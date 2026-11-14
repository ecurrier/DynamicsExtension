# Trace Viewer: column picker and a smaller default

Status: resolved
Type: task

See `../spec.md`, decision 15.

Eleven columns render today. Four of them — Mode, Depth, Correlation and Step — repeat what the Summary tab already shows for the selected row.

- Default to six columns: Created On, Type Name, Message, Entity, Duration, Exception.
- Add a Columns button to the toolbar that hides and shows columns and offers "Reset to default". Remember the choice in the settings store.
- No reorder. The user can already resize a column with the mouse, and reorder is a lot of work for something set once.
- The yellow correlation highlight is colour alone in the table: with "Highlight everywhere" on, a matching row changes only its background. Add a non-colour mark so the user can tell which rows matched after scrolling away. The detail pane already pairs the yellow with a weight change.
- Keep the red row tint for exceptions. It is already paired with the "Exception" badge, so it is not colour alone.

Blocked by: 13

## Answer

- Six columns by default: Created On, Type Name, Message, Entity, Duration, Exception. `DEFAULT_TRACE_COLUMNS` holds the list, and a test holds the settings fallback to the same six, so the two cannot drift.
- `TraceColumnPicker` is a Columns button with a checkbox per column and "Reset to default". The choice is remembered in `ExtensionSettings.traceColumns`.
- No reorder: `shownTraceColumns` and `toggledTraceColumns` (both unit tested) always return the table's own order, whatever order the user ticked them in. A remembered column that no longer exists is dropped, and the last column cannot be hidden.
- The correlation highlight was colour alone in the table. It now carries a bold weight and an underline as well as the yellow, so a matching row can still be told apart after a scroll, and without colour vision.
- The red row tint for exceptions stays: it is already paired with the Exception badge.
