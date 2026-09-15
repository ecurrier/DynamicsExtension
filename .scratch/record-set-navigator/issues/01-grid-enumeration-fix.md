# Grid Enumeration Fix

Status: resolved
Type: task

See `../spec.md`, "Grid selection".

- In `src/page/handlers/utilities/fetchXml.ts`, stop `retrieveSavedQueries` at line 15 throwing `PageError("NotFound", ...)` on an empty result. Return an empty list, and have `utilities.generateFetchXml` throw only when the applied-view queries are also empty, so a Table with no saved queries still offers what is on the page.
- Export a single record url builder: delete the private `buildRecordUrl` at `src/page/handlers/utilities/recordUrls.ts:14`, move `recordUrl` from `src/modules/utilities/lib/cloudUrls.ts:34` into a pure shared module both the page bundle and the UI may import, and update `cloudUrls.test.ts` to cover it in its new home.
- Confirm the move respects the import bans in `eslint.config.js`: the page bundle may import pure shared code but not UI code, so the builder cannot stay under `src/modules/`.
- Tests in `src/page/handlers/utilities/fetchXml.test.ts`: a view page with applied views and no saved queries, a view page with neither, and a form page with subgrids.
- Harness: a grid fixture for a Table with no saved queries so the empty case is reachable.

Blocked by: none

## Comments

`retrieveSavedQueries` no longer throws on an empty result; `utilities.generateFetchXml` now throws only when the applied views are empty too, so a Table with no saved queries still offers the grids that are on the page.

`recordUrl` moved to `src/shared/lib/recordUrl.ts`, which both the page bundle and the UI may import; `cloudUrls.ts` re-exports it so existing importers are unaffected, and the private duplicate in `recordUrls.ts` is gone. The eslint import bans confirm the placement: a builder under `src/modules/` would have been unreachable from the page bundle.
