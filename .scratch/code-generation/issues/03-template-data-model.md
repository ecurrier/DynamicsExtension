# Template data model, type map, and identifiers

Status: resolved
Type: task

Build the view that the engine renders, as pure functions in `src/modules/codegen/lib/` with tests. See `../spec.md` decisions 4, 5, 6 and the "Data model" section.

- `buildTableView(metadata, columns, options)`: applies the system-column exclusion (toggle to include), ordering (primary id, primary name, then alphabetical), `isFirst`/`isLast`, identifiers with prefix stripping, and the fixed type map for C# and TypeScript. `isDateOnly` comes from the column's DateTimeBehavior/Format.
- `buildChoiceView(choice)`: options with sanitised identifiers (reuse `sanitizeIdentifier` from utilities lib), values, `isFirst`/`isLast`.
- `identifierFor(schemaName, prefix)` and `camelCase` helpers.
- Extend the page-side metadata read (`investigate.getTableColumns` or a new `codegen.getTableColumns` command) so a column carries: schema name, attribute type, required level, max length, precision, DateTimeBehavior, lookup targets with entity set names, `attributeOf`, valid-for-create/update, option set name and options for local choices, `isCustomAttribute`. Add a `codegen.getGlobalChoices` command (or reuse `utilities.getChoiceMetadata`) for global choices.

Blocked by: 02
