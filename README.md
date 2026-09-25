# Power Tools for Power Platform / Dynamics 365

Browser extension (Manifest V3) with productivity utilities for model-driven apps and Power Pages.

**Do things:** admin shortcuts, Fetch XML and URL generation, a column browser, find-column-on-form, Web API record payloads, code generation from your own Templates (classes and enums for tables and choices), form presets, viewing and editing every column of the open record through the Web API, Fetch XML queries, security role management, plug-in step and package management, environment variable management, and record transport between environments.

**Understand things:** read-only investigation tools that answer _why_ the platform is behaving as it is — what automation runs on a table, why a user can or cannot see a record, what changed on a record and when, which solution layer is winning, what depends on a column (including cloud flows), and which scripts and control states are in play on the open form.

Built with [WXT](https://wxt.dev), React, TypeScript, Fluent UI v9, TanStack Query, Zustand, and CodeMirror 6.

## Development

```bash
npm install
npm run dev
```

`npm run dev` builds to `.output/chrome-mv3-dev` and launches a Chrome profile with the extension loaded and hot reload enabled.

To load a production build manually:

```bash
npm run build
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3`.

Other scripts:

| Script              | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run typecheck` | TypeScript project check         |
| `npm run lint`      | ESLint                           |
| `npm test`          | Vitest unit tests                |
| `npm run zip`       | Store-ready archive in `.output` |

## Code generation

The Code Generation module renders a **Template** against a table or a choice read from the open environment. Templates are logic-less and Mustache-style: `{{path}}` inserts a value, `{{#list}}...{{/list}}` repeats a block per item (or once for a truthy value), `{{^flag}}...{{/flag}}` renders when a value is false or empty, and `{{! text }}` is a comment. Built-in Templates (C# early-bound class, TypeScript interface, C# enum, JavaScript object) are read-only; clone one under Code Generation > Templates, edit it with the live preview, star it as the default for its kind, and export the JSON to share it. The Developer utilities Generate Table Class and Generate Choice Code Snippet open Generate with the current table selected.

Data available to a table Template:

| Path                                                                                                                                                                                           | Meaning                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table.logicalName`, `table.schemaName`, `table.displayName`, `table.displayCollectionName`, `table.entitySetName`, `table.primaryIdAttribute`, `table.primaryNameAttribute`, `table.isCustom` | Table metadata                                                                                                                                                              |
| `table.identifier`, `table.identifierCamel`                                                                                                                                                    | PascalCase and camelCase names from the schema name, minus the `prefix` setting (one or more publisher prefixes, comma separated)                                           |
| `columns[]`                                                                                                                                                                                    | One entry per column: primary id, primary name, then alphabetical; helper and bookkeeping columns are excluded unless Show system columns is on                             |
| `logicalName`, `schemaName`, `displayName`, `identifier`, `identifierCamel`                                                                                                                    | Column names                                                                                                                                                                |
| `type`, `csType`, `tsType`, `kind`, `attributeType`                                                                                                                                            | `type` follows the Template language; the map is fixed: lookups are `EntityReference`, choices `OptionSetValue`, DateOnly-behaviour dates `DateOnly?`, value types nullable |
| `isPrimaryId`, `isPrimaryName`, `isRequired`, `isCustom`, `isLookup`, `isChoice`, `isMultiChoice`, `isDateOnly`, `isValidForCreate`, `isValidForUpdate`, `isFirst`, `isLast`                   | Flags for sections                                                                                                                                                          |
| `maxLength`, `precision`, `targets[]` (`logicalName`, `navigationProperty`, `entitySetName`, `identifier`), `choiceName`, `choiceIdentifier`                                                   | Type-specific details                                                                                                                                                       |
| `settings.<key>`                                                                                                                                                                               | The Template's settings, prefilled with their defaults in Generate                                                                                                          |

A choice Template sees `choice.name`, `choice.displayName`, `choice.identifier`, `choice.identifierCamel`, `choice.identifierPlural`, `choice.scope`, `choice.tableLogicalName`, `choice.options[]` (`label`, `identifier`, `identifierUnderscored`, `value`, `isFirst`, `isLast`), and `settings`. `choiceIdentifier` on a column matches `choice.identifier` for the same choice, so a table class can reference the enum a choice Template generates.

## Project layout

```
src/
  entrypoints/      popup, side panel, results viewer page, and the page bundle injected into Dynamics tabs
  app/              shell, providers, session bootstrap, tab binding
  messaging/        typed command contract, page bridge, popup client and TanStack hooks
  page/             code that runs inside the Dynamics page (Xrm access), no React
  modules/          one folder per module: module.ts registration, areas/, lib/, hooks/
  shared/           components, storage schema and migration, stores, theme, pure helpers
```

### Adding a module

1. Create `src/modules/<name>/` with a `module.ts` exporting a `ModuleDefinition` (id, label, icon, areas).
2. Put each area under `areas/<area>/` with its component, and pure logic under `lib/`.
3. Register the module in `src/modules/registry.ts`.

Navigation, breadcrumbs, page-context gating, and last-visited persistence derive from the registry.

Three shared components exist so screens behave the same way. Filter a long table with `TableFilter` and `useTableFilter`; selection is held by the caller, so filtering narrows what is shown and never what is picked, which is how a set is assembled over several searches. Render a value from a fixed set with `ValueChip` and a palette from `ValueChip/palettes.ts`, so the same privilege depth is the same colour everywhere. Pick from a long list with `MultiSelectPicker`. And never ask the user to type something the environment knows: tables come from `investigate.listTables`, solutions and publisher prefixes from `global.getSolutions`.

Power Tools now writes metadata. Attribute updates go through `src/shared/lib/dataverse/attributeSearch.ts` and must send only the properties being changed, carry `MSCRM.MergeLabels`, and be published afterwards for the tables that actually succeeded. Bulk, non-transactional changes go through the Bulk Run engine in `src/shared/lib/bulkRun/` and `src/shared/components/BulkRun/`: supply a plan and an executor and you get preview, confirm, progress, a per-item result, and retry of whatever did not succeed. Do not hand-roll a confirmation dialog for a multi-item write.

Areas render in all three Surfaces (popup, pinned window, side panel), so an area has to be usable at about 400px. Layout that adapts to the Surface must use a container query, not a media query: the popup has a fixed 700px root inside a viewport of any size, so a media query reads the viewport and gets it wrong. `TaskGrid` is the worked example. Keep a stylesheet in the entrypoint that needs it rather than anywhere reachable from the `@/app` barrel, or it is bundled into the Workspace pages too. See `docs/adr/0002-extension-surfaces.md`.

### Adding a page command

1. Add the command to `CommandMap` in `src/messaging/contract/commands.ts`.
2. Implement the handler in `src/page/handlers/<module>.ts`; the exhaustive `HandlerMap` fails to compile until it exists.
3. Call it from the popup with `usePageQuery` (reads) or `usePageMutation` (actions).
