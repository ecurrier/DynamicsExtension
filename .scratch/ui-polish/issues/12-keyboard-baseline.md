# Keyboard baseline

Status: ready-for-agent
Type: task

See `../spec.md`, decision 13. There is no WCAG target. The bar is Tab, a visible focus ring, Escape and Enter.

An audit of the built app found several things already right and worth not disturbing: all 29 icon-only buttons carry an accessible name, there is no `tabIndex` abuse anywhere, no `outline: none` and no `:focus` override, so Fluent's focus rings are intact; dialogs and the nav drawer trap and restore focus through Fluent. Three real faults remain.

- **Table rows cannot be activated from the keyboard.** `DataTable` passes `onRowClick` to `DataGridRow`'s `onClick` and sets `cursor: pointer`, but adds no key handler. Fluent's own row handler responds only to Space, only when `selectableRows` is on, and it toggles selection rather than calling the consumer. So the user tabs to a row, presses Enter, and nothing happens. Add Enter and Space handling in `DataTable` wherever `onRowClick` is set. Six surfaces depend on it: the Trace Viewer detail pane, Environment Variables, Record History, the Data Transporter plan step, the Dirty Columns dialog and the Record Set Navigator. In the Trace Viewer, which also has `selectionMode`, Space must keep toggling selection and Enter must open the row.
- **`InfoTip` cannot be reached by keyboard.** It puts a `Tooltip relationship="description"` on a bare `Info16Regular` svg, which cannot take focus, so its help text does not exist for a keyboard user. 10 call sites. Make the trigger a focusable subtle icon button. The same fault is in `AreaBreadcrumb`'s description tip, `ColumnRow`'s read-only reason, and `ColumnMatchesCard`'s type-mismatch and locked-solution explanations.
- **Ctrl+K fires while the user is typing.** The global handler calls `preventDefault` on every Ctrl+K with no check for where focus is, so it hijacks the shortcut inside every text field in the app. Skip it when the event target is an input, a textarea or contenteditable.

Then walk every Area once in the harness: Tab reaches every control, the focus ring is always visible, Escape closes every panel, popover and dialog, and Enter submits every form.

Deliberately not fixed here, and recorded in the spec as known gaps: arrow-key navigation inside tables, a skip link, `main` and heading landmarks, and the 53 `title`-only tooltips.

Blocked by: 08
