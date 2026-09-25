# Save and form-refresh page commands

Status: resolved
Type: task

See `../spec.md`, decisions 8, 13, 14 and "Saving".

- `webapi.saveRecord { payload }` (mutation): `Xrm.WebApi.updateRecord` on the open Record, guarded by `requireSavedRecord`, surfacing the server's error message verbatim.
- `webapi.getFormState` (query): `{ recordId, isDirty }` for the open form, used to spot a Record change and to decide whether to prompt before refreshing.
- `webapi.refreshForm` (mutation): `formContext.data.refresh(false)`.
- `webapi.getRecordValues` also returns the Record id it read, so the Area can tell when the tab has moved to another Record.
- Contract entries in `src/messaging/contract/commands.ts`, stale times, handlers in `src/page/handlers/webapi.ts`.
- Harness stubs in `dev/harness/chrome-shim.js`: the save stub records the last payload; form state can be toggled Dirty.
- Remove `webapi.updateField` and `webapi.clearLookup` once 03 no longer uses them.

Real org check: clearing a lookup with `@odata.bind: null` inside `updateRecord`.
