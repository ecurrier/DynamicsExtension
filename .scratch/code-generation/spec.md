# Code Generation

Status: ready-for-agent
Decided: 2026-09-07 (grilling session)

## Problem

The Developer Area generates C# and JavaScript choice enums from hard-coded code, and the planned Generate Table Class Utility would do the same. Teams write their model classes their own way (abstract base classes, naming conventions, namespaces, prefix stripping), so hard-coded output is copied then rewritten. Users need to author the pattern the generator fills in, so the output drops into their codebase unchanged.

## Vocabulary

Terms from `CONTEXT.md`: Template, Form Preset, Dialect, Utility, Table, Column, Choice. The existing "Templates" Module (saved form values) becomes **Form Presets** so that "Template" means code generation everywhere.

## Decisions

1. **Own Module.** A new `Code Generation` Module with two Areas: **Generate** (pick any Table or Choice plus a Template, not only what is on screen) and **Templates** (author and manage). The Developer Utilities `Generate Table Class` and `Generate Choice Code Snippet` are one-click shortcuts that open Generate pre-filled with the open page's Table; the Choice Code dialog is retired so there is one generation surface.
2. **Template language is logic-less** (ADR-0001): `{{path}}`, `{{#list}}...{{/list}}`, `{{^flag}}...{{/flag}}`, dotted paths, no escaping. Interpreted by our own engine. Every derived value a template needs is precomputed in the data model.
3. **Template properties**: `id`, `name`, `kind` (`table` | `choice`), `language` (`csharp` | `typescript` | `javascript`), `text`, `settings` (ordered list of `{ key, label, default }`, text only), `filenamePattern` (rendered with the same engine, for example `{{table.identifier}}.cs`), `builtIn` flag. JavaScript shares the TypeScript type map and typically emits no types.
4. **Fixed, metadata-driven type map**, not user-editable. Nullable value types. Lookups, Customer, Owner are always `EntityReference`. `DateOnly?` when the column's date-time behaviour is DateOnly, else `DateTime?`. Choices are `OptionSetValue`; `{{choiceName}}` and `{{choiceIdentifier}}` are exposed on the column so a Template can use the enum a choice Template generates, which we want to encourage.

   | Dataverse type | C# | TypeScript |
   |---|---|---|
   | String, Memo | `string` | `string` |
   | Integer | `int?` | `number` |
   | BigInt | `long?` | `number` |
   | Decimal | `decimal?` | `number` |
   | Double | `double?` | `number` |
   | Money | `Money` | `number` |
   | Boolean | `bool?` | `boolean` |
   | DateTime (DateOnly behaviour) | `DateOnly?` | `string` |
   | DateTime (other) | `DateTime?` | `string` |
   | Lookup, Customer, Owner | `EntityReference` | `string` |
   | Picklist, State, Status | `OptionSetValue` | `number` |
   | MultiSelectPicklist | `OptionSetValueCollection` | `number[]` |
   | Uniqueidentifier | `Guid?` | `string` |
   | Image | `byte[]` | `string` |
   | File | `Guid?` | `string` |

5. **Identifiers**: `identifier` is PascalCase of the schema name with the publisher prefix stripped when the Template's `prefix` setting matches (`new_CustomField` with prefix `new` gives `CustomField`). Also exposed: `identifierCamel`, `schemaName`, `logicalName`, `displayName`.
6. **Column set**: system columns (`importsequencenumber`, `overriddencreatedon`, `timezoneruleversionnumber`, `utcconversiontimezonecode`, `versionnumber`, `*_name`/`*yominame` companions, any `attributeOf` column) are excluded by default; Generate has a "Show system columns" toggle. Order: primary id, primary name, then alphabetical by logical name. Each column carries `isFirst`/`isLast`.
7. **Settings**: a Template declares settings with defaults; Generate shows them as prefilled inputs the user can override per run.
8. **Built-ins**: the current C# and JavaScript choice generators and a C# and a TypeScript table class ship as read-only built-in Templates that users clone to edit. They are the documentation.
9. **Defaults**: one Template per kind can be starred as the default in the Templates Area; the shortcuts use it, falling back to the first built-in.
10. **Sharing**: export and import a Template as a JSON file (`{ "kind": "power-tools-template", "version": 1, "template": {...} }`), mirroring the Form Preset file pattern.
11. **Editor**: CodeMirror with the Template's language highlighting, a settings table, and a live preview rendered against the open page's Table (or a bundled sample when no page is connected).
12. **Output**: Copy and Save file (filename from the pattern). One Table or Choice per run in v1.
13. **Connection**: Page connection only. Metadata comes through the Page Bridge.

## Data model rendered by the engine

```
table:     logicalName, schemaName, displayName, displayCollectionName, entitySetName,
           primaryIdAttribute, primaryNameAttribute, identifier, identifierCamel, isCustom
columns[]: logicalName, schemaName, displayName, identifier, identifierCamel, type (raw Dataverse),
           csType, tsType, isPrimaryId, isPrimaryName, isRequired, isCustom, isLookup, isChoice,
           isMultiChoice, isDateOnly, maxLength, precision, targets[] (entitySetName, logicalName),
           choiceName, choiceIdentifier, isFirst, isLast
choice:    name, identifier, scope (global | local), tableLogicalName, options[] (label, identifier, value, isFirst, isLast)
settings:  one key per declared setting
```

## Out of scope (v1)

Multi-table batch generation, user-editable type maps, form-script and query Template kinds, Environment connection, cloud sync of Templates.

## Acceptance

- The Templates Module is renamed to Form Presets with a storage migration and no data loss.
- A user can clone the built-in C# table Template, add an abstract base class and a namespace setting, star it, and Generate Table Class on an open Account form produces a class using both.
- A choice Template and a table Template generated for the same Table agree on enum identifiers.
- Exported Templates re-import on a fresh install.
- Harness stubs cover every new page command so Generate and Templates render with sample data.
