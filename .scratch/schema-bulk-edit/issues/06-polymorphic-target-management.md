# Polymorphic Target Management

Status: needs-info
Type: research

See `../spec.md`, decision 5, and the Comments on `04`.

The owner reports that the XrmToolBox polymorphic lookup tool can add and remove target tables on an existing polymorphic lookup, so it is possible. The platform request that does it was not established, and `04` deliberately shipped create-only rather than guess at a call that deletes schema.

- Establish how a target is added to an existing polymorphic lookup. The likely mechanism is `CreateOneToMany` against the existing lookup Column rather than a second `CreatePolymorphicLookupAttribute`; confirm against a real org and record the exact request and response.
- Establish how a target is removed, and what happens to Records that already reference a table being removed. If the platform orphans or blocks, that behaviour decides whether the tool should offer removal at all.
- Check what the XrmToolBox tool actually sends, if its source is available; that is the fastest route to the answer.
- Record the findings under an `## Answer` heading here, then open an implementation ticket against `src/shared/lib/dataverse/polymorphic.ts` and `src/schema-tools/PolymorphicLookups.tsx`, which already carries a banner saying management is not implemented.

Blocked by: none
