# Bulk Users Selection

Status: resolved
Type: task

See `../spec.md`, "Bulk Users" and decision 2. This replaces the search-then-select model, it does not extend it.

- Load every enabled user up front rather than requiring a search: add `security.listSystemUsers` returning all users ordered by full name, paged through `getAllPages`, and a matching gateway operation.
- The users table is filtered with `TableFilter` from `01`. Ticking a row adds to a selection held outside the filtered list, so clearing or changing the filter never drops a tick. This is the point of the change: a set of ten is assembled over several searches.
- Show the running selection above the table as a count with a "Clear selection" action, and keep the selected users visible so the user can see who is in the set while the filter shows something else.
- Rework the layout so it reads top to bottom: users, then roles, then the action and the summary. The current two-column grid puts the action between its inputs.
- Pure helpers with tests in `src/modules/security/lib/userSelection.ts`: `toggleSelection`, `selectionSummary`, and a test that filtering a list then toggling leaves earlier selections intact.
- Harness: enough users that filtering is necessary, across several business units.

Blocked by: 01

## Comments

`security.listSystemUsers` pages every enabled, non-support user through `getAllPages` and is cached for five minutes, so the table is there when the Area opens rather than after a search.

The selection model is the point of the change and lives in one pure helper, `applyVisibleSelection`: it keeps every selection the current filter hides, applies the ticks for the rows that are visible, and ignores ids that are not. That is what lets a set be assembled over several filters, and it is tested as exactly that scenario rather than as three unrelated cases.

Selected users appear as dismissible tags above the table, so the set stays visible while the filter shows something else. `Add all N` merges the whole filtered page.

The old `UserSearch` component was deleted rather than extended; the search-then-select model it encoded is the thing being replaced.

Verified in the harness: filtering to alice and ticking two, then bob and ticking one, then carol and ticking one, then clearing the filter, leaves four selected and four tags showing.
