# Web Resource Deep Link

Status: resolved
Type: task

See `../spec.md`, "Deep link".

- Add `webResourceId: string | null` to `FormLibrary` in `src/shared/types/investigate.ts:285-288`, resolved by a `webresourceset` query filtered to the parsed library names and selecting `webresourceid` and `name`; the entity set and id attribute are already mapped for component type 61 at `src/shared/lib/dataverse/columnUsage.ts:30`. Leave `src/shared/lib/formEvents.ts:21-24` parsing names only.
- Resolve the ids in the `forms.getFormDiagnostics` handler at `src/page/handlers/forms.ts:110-155` in one query for all libraries, not one per library, and leave the id null when there is no match.
- Add `webResourceUrl(cloud, environmentId, solutionId, webResourceId)` to `src/modules/utilities/lib/cloudUrls.ts` beside `controlEditorUrl`, with a test pinning the string as `cloudUrls.test.ts:21-24` does for the control editor.
- Add `webResourceUseDefaultSolution` to the extension settings with a migration, mirroring `controlEditorUseDefaultSolution`, and a toggle in the Extension settings Area.
- In `src/modules/investigate/areas/form/FormDiagnosticsArea.tsx`, add a link cell to `libraryColumns` (lines 149-161) that uses `useSolutionPicker` and `openUrl`, disabled with a tooltip when `webResourceId` is null.
- Verify the maker url shape against a real org before resolving this issue, and record the confirmed path under `## Comments`; the `e/{env}/s/{solution}/entity/...` shape is known for controls but the web resource path is not.
- Harness: extend the Form Diagnostics fixture with four libraries, one of which has no matching web resource row, and confirm the solution prompt appears and the setting skips it.

Blocked by: none

## Comments

The id comes from a `webresourceset` lookup rather than the form XML's `libraryUniqueId`. One query covers every library on the form, built from an `or` of name equalities, and the parser in `formEvents.ts` still reads names only and sets `webResourceId: null` — resolution belongs to the handler, which has HTTP, not to a pure XML parser.

The lookup is wrapped so a failure degrades to unlinkable rows rather than taking the whole Form Diagnostics query down with it; a broken link is worth losing, the rest of the diagnostics is not.

Verified in the harness: four libraries render, three carry an Open action and the fourth (a library left on the form after its web resource was deleted) reads "Not found" with a tooltip. Opening one prompts for a solution through the shared picker and produces `https://make.powerapps.com/e/<env>/s/s2/webresource/<id>`.

**Still unverified, and deliberately so: the maker URL shape.** `webResourceUrl` follows the `e/{env}/s/{solution}/...` pattern that `controlEditorUrl` uses and is pinned by a test for both commercial and sovereign clouds, but I could not confirm that `webresource/{id}` is the segment the maker portal actually accepts. Confirm against a real org and correct `webResourceUrl` if it differs; the test will tell you immediately which string changed.
