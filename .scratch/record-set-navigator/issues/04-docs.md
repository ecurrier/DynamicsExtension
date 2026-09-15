# Record Set Navigator Docs

Status: resolved
Type: task

See `../spec.md`.

- Add `Record Set` to `CONTEXT.md` under "Platform concepts" or "Extension structure": the ordered list of Records loaded from one grid or view that the user steps through, with `_Avoid_: result set, list, selection`.
- Update the `README.md` capability sentence for the new Utilities Area.
- Update `dev/harness/README.md` with the grid and row fixtures, the empty-saved-queries case, and the note that `utilities.navigateToRecord` only logs.

Blocked by: 01, 02, 03

## Comments

`CONTEXT.md` gained `Record Set` under "Platform concepts", stating that the set is rebuilt by re-running the grid's own query so the user's applied filters and sort survive — that is the design decision most likely to be undone by someone later reaching for `getRows()`.

`dev/harness/README.md` describes the view fixtures, the 120-row result, the fact that the load-more path needs a bigger fixture, and that `utilities.navigateToRecord` moves the shim's mutable page target.
