# Attribute Metadata Writes

Status: resolved
Type: task

See `../spec.md`, decisions 3 and 4. This is the first metadata write in the codebase; every `EntityDefinitions` call today is a read.

- Add `updateAttribute({ entityLogicalName, attributeLogicalName, label, description, requiredLevel, solutionUniqueName })` to `src/shared/lib/dataverse/attributeSearch.ts` or a sibling `attributeWrites.ts`, issuing a `PUT` to `EntityDefinitions(LogicalName='x')/Attributes(LogicalName='y')` with `MSCRM.MergeLabels` true and the solution header from `bulk-mutations/03`.
- Send only the properties the caller supplied, so an unset field is left alone rather than overwritten with a default; the request body must still carry the required `@odata.type` and `MetadataId` for the attribute type being updated.
- Refuse the write when `IsCustomizable` is false, returning a typed error the Bulk Run result can show, rather than letting the platform error surface raw.
- Add `schema.updateAttribute` to `CommandMap` as a mutation, a handler, and the operation on the `schema` Gateway.
- Tests for the partial-body construction (label only, description only, requirement level only, all three) and for the customisable refusal.
- Harness: the shim accepts the write and records it so the Bulk Run result renders; the real `PUT` and label merge need an org.

Blocked by: 01, bulk-mutations/03

## Comments

This is the first metadata write in the codebase, and it needed `PUT`, which `DataverseMethod` did not have. It was added as a first-class method rather than cast away at the call site.

The request body carries only the properties the caller supplied, plus the `@odata.type` and `MetadataId` the platform requires, so leaving a field blank leaves it alone instead of overwriting it with a default. `MSCRM.MergeLabels` is always on so a label change does not wipe other languages. Tests assert the exact key set for a single-property edit, the PUT path, the merge header, and the solution header.

The `IsCustomizable` refusal is enforced in the plan rather than in the write: `columnEditPlan` never emits an item for a locked column, so the platform error never has to be interpreted.
