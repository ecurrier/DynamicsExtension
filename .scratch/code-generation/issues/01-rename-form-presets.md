# Rename the Templates Module to Form Presets

Status: resolved
Type: task

Free the word "Template" for code generation (see `../spec.md`, decision 1, and `CONTEXT.md`).

- Module label "Form Presets", Area label unchanged ("Pre-populate Forms"), folder `src/modules/templates` renamed to `src/modules/formpresets`, types `Template` / `TemplatesByContext` renamed to `FormPreset` / `FormPresetsByContext`, hook `useTemplates` renamed accordingly.
- Storage key `local:templates` moves to `local:formPresets` through a schema v4 migration in `src/shared/storage` (bump `SCHEMA_VERSION`, add a migration file with tests like `migrateServicePrincipals.test.ts`). Legacy migration (`migrateLegacy.ts`) must keep working on a v1 install by chaining into v4.
- Import/export file kind string stays backward compatible: keep reading the old kind, write the new one.
- Harness seed, README, and UI copy updated. No mention of "template" remains in the Form Presets UI.

Blocked by: none
