# Save bar, Review, and saving

Status: resolved
Type: task

See `../spec.md`, decisions 8, 9, 12, 13 and "Saving".

- Save bar pinned to the bottom of the Area once there is a Draft: "N changes · Review · Discard all · Save".
- Review expands `Column: old → new` entries with undo; clicking the Column name scrolls to and focuses its row, clearing any filter that hides it.
- Invalid Drafts block Save: the bar says "N Drafts are invalid" and jumps to the first one. Cleared ApplicationRequired Columns warn but do not block.
- Save sends `webapi.saveRecord` with `buildRecordPayload`. On success: toast "Saved N columns", reload values, drop Drafts, then refresh the form, or, if `getFormState` says the form is Dirty, ask first (Refresh form / Leave form as is). On failure the server's message shows in the bar and every Draft stays.

Blocked by: 03
