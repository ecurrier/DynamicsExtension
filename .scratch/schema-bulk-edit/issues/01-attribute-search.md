# Attribute Search

Status: resolved
Type: task

See `../spec.md`, "Column search" and decision 1.

- New `attributeSearchOperations(http: DataverseHttp)` in `src/shared/lib/dataverse/attributeSearch.ts` with `findAttributeAcrossTables({ logicalName, customOnly })`, issuing one `EntityDefinitions` request that expands `Attributes` filtered to the logical name and selects `LogicalName`, `AttributeType`, `DisplayName`, `Description`, `RequiredLevel`, `IsManaged` and `IsCustomizable`.
- Types in `src/shared/types/schema.ts`: `AttributeMatch` carrying the Table logical and display name, the Column logical name, type, current label, description, requirement level, managed flag and customisable flag.
- Add `schema.findAttributeAcrossTables` to `CommandMap`, a `STALE_TIMES` entry of zero since schema changes during a session, a handler in a new `src/page/handlers/schema.ts` registered in `src/page/handlers/index.ts`, and a `schema` Gateway so a saved Environment can search.
- Reuse the metadata request conventions in `src/shared/lib/dataverse/tableMetadata.ts` rather than writing a new request style.
- Pure helpers with tests in `src/modules/schema/lib/attributeMatches.ts`: `majorityType` and `flagTypeMismatch`, `customisableGate` (reason text when `IsCustomizable` is false), `matchRows`.
- Harness: a fixture where one logical name appears on five Tables, one managed and not customisable, one with a different `AttributeType`, and one with an empty description.

Blocked by: none

## Comments

The whole environment is searched in one `EntityDefinitions` request by expanding `Attributes` with a filter on the logical name, so no per-table round trip is needed. A single quote in the column name is escaped rather than breaking the filter, which is tested.

`IsCustomizable` absent is treated as customizable and an explicit `false` as locked, because the metadata omits the property for plenty of ordinary columns and defaulting to locked would hide editable rows.
