# Harness coverage and documentation

Status: resolved
Type: task

- `dev/harness/chrome-shim.js`: handlers for every `codegen.*` command, seeded user Template in `local:codeTemplates` and a starred default, so both Areas render with data; the sample Table must include a DateOnly column, a money column, a multi-select choice, and a lookup with two targets so the type map is visible.
- `dev/harness/README.md` and the top-level `README.md` describe the Code Generation Module, the Template syntax with the data model table from `../spec.md`, and the Form Presets rename.
- Re-run the existing `npm run build && npm run harness` verification and record any new quirks in memory.

Blocked by: 07
