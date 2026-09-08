# Template storage, built-ins, defaults, import/export

Status: resolved
Type: task

- `Template` type in `src/shared/types/codegen.ts` (`id`, `name`, `kind`, `language`, `text`, `settings[]`, `filenamePattern`, `builtIn`, `updatedAt`). Storage item `local:codeTemplates` (not `local:templates`, which issue 01 migrates away and whose WXT version metadata would collide).
- Built-in Templates as code constants (`src/modules/codegen/builtins/`): C# table class, TypeScript table interface, C# choice enum, JavaScript choice object. They reproduce today's Choice Code output exactly (add a test comparing against `generateChoiceCode`). Built-ins are never stored; the list shown is built-ins plus stored user Templates.
- Starred default per kind stored in `local:codeTemplateDefaults`; resolution falls back to the first built-in of the kind.
- Export/import file `{ kind: 'power-tools-template', version: 1, template }`, mirroring `templateFile.ts` (validation, tests). Imported Templates get fresh ids and `builtIn: false`.

Blocked by: 01
