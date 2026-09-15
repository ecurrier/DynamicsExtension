# Gatewayable Publish

Status: resolved
Type: task

See `../spec.md`, "Gatewayable publish".

- New `publishOperations(http: DataverseHttp)` in `src/shared/lib/dataverse/publish.ts` exposing `publishTables({ logicalNames })`, posting to `PublishXml` with the `ParameterXml` body from the existing `buildPublishXml` in `src/shared/lib/dataverse/systemForms.ts:16`; extend `buildPublishXml` to take several logical names.
- Change `src/page/handlers/forms.ts:48-57` so `publishEntity` calls the operation through `pageHttp()` and `runOperation` instead of `getXrm().WebApi.online.execute`, and drop the `getMetadata` thunk.
- Keep the `forms.updateFormXml` contract unchanged; only the transport moves.
- Add the publish operation to the namespace a Gateway can reach so a saved Environment can publish, following the `*Operations(http)` shape used by `src/shared/lib/dataverse/security.ts`.
- Tests in `src/shared/lib/dataverse/publish.test.ts` for the request path and the multi-Table `ParameterXml`, and extend `systemForms.test.ts` for the widened builder.
- Harness: the existing form XML flow must still publish against the stub; the real POST needs an org.

Blocked by: none

## Comments

`buildPublishXml` now takes one name or many, de-duplicates, and returns `null` when there is nothing worth publishing, so a caller that ends up with an empty set sends no request at all rather than posting empty `<entities/>`. `publishTables` returns early on that null.

`forms.updateFormXml` keeps its contract; only the transport moved, from `Xrm.WebApi.online.execute` with its `getMetadata` thunk to `runOperation(() => publishOperations(pageHttp()).publishTables(...))`. That removes the last `Xrm.WebApi`-bound write from the Forms module, so form XML editing is no longer page-only by construction.

The Gateway wiring itself is deliberately not here. `publishOperations(http)` is the gatewayable shape, and it is composed into a namespace when one exists that needs it; `schema-bulk-edit/01` creates the `schema` Gateway and is where publish gets exposed to a saved Environment. Adding a half-used namespace now would be speculative.

Tests cover one table, several tables in one request, duplicate collapsing, and the nothing-to-publish case, plus the widened builder in `systemForms.test.ts`. The real `POST PublishXml` needs an org.
