# Polymorphic Target Management

Status: resolved
Type: research

See `../spec.md`, decision 5, and the Comments on `04`.

The owner reports that the XrmToolBox polymorphic lookup tool can add and remove target tables on an existing polymorphic lookup, so it is possible. The platform request that does it was not established, and `04` deliberately shipped create-only rather than guess at a call that deletes schema.

- Establish how a target is added to an existing polymorphic lookup. The likely mechanism is `CreateOneToMany` against the existing lookup Column rather than a second `CreatePolymorphicLookupAttribute`; confirm against a real org and record the exact request and response.
- Establish how a target is removed, and what happens to Records that already reference a table being removed. If the platform orphans or blocks, that behaviour decides whether the tool should offer removal at all.
- Check what the XrmToolBox tool actually sends, if its source is available; that is the fastest route to the answer.
- Record the findings under an `## Answer` heading here, then open an implementation ticket against `src/shared/lib/dataverse/polymorphic.ts` and `src/schema-tools/PolymorphicLookups.tsx`, which already carries a banner saying management is not implemented.

Blocked by: none

## Answer

Confirmed against Microsoft Learn and the source of `MscrmTools.PolymorphicLookupCreator` (default branch `main`).

- **Create**: `POST /api/data/v9.2/CreatePolymorphicLookupAttribute`. `Lookup` must be `Microsoft.Dynamics.CRM.ComplexLookupAttributeMetadata`. The solution is a `SolutionUniqueName` **body parameter**, not a header. `Consistency: Strong` header.
- **Add a target**: `POST /api/data/v9.2/RelationshipDefinitions` with an `OneToManyRelationshipMetadata` whose `Lookup.SchemaName` equals the existing column's schema name; that match is what attaches it. `Lookup` is typed `LookupAttributeMetadata` here, not Complex. Solution goes in the `MSCRM.SolutionUniqueName` **header**. There is no `CreateOneToMany` action; the earlier guess was wrong.
- **Remove a target**: `DELETE /api/data/v9.2/RelationshipDefinitions(<MetadataId>)`. Find the id by filtering the `OneToManyRelationshipMetadata` cast on `ReferencingEntity` and `ReferencingAttribute`.
- **No publish needed** for any of the three. Publishing applies to updating a table or column definition.
- **Constraints**: relationship schema name max 100 characters; the reference tool blocks removing the last target; elastic referencing tables need every cascade set to `NoCascade`; error code `-2147192813` means the attribute is not a polymorphic lookup.
- **Unknown**: what happens to records referencing a removed table. Undocumented by Microsoft and unaddressed by the reference tool. Also unknown whether an ordinary single-target lookup can be extended; the tool tries optimistically and lets the platform refuse.

Implemented in `usability-pass/09-polymorphic-lookups.md`.
