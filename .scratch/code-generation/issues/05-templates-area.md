# Code Generation Module and Templates Area

Status: resolved
Type: task

- New Module `src/modules/codegen/` registered in `src/modules/registry.ts` (label "Code Generation", icon `Code20Regular` or similar, ordered after Web API). Areas: `codegen.generate` (issue 06) and `codegen.templates` (this issue). Both `requires: 'model-driven-app'` in v1.
- Templates Area: list of built-in and user Templates grouped by kind, with star (default), clone, edit, delete (confirm), export, import.
- Editor: name, kind, language, settings table (key, label, default; add/remove rows), filename pattern, CodeMirror text editor with the Template's language highlighting, and a live preview pane rendering the Template against the open page's Table (through issue 03's view) or against a bundled sample Table and Choice when no page is connected. Unresolved paths from the engine surface as a warning list under the preview.
- Reuse `TaskCard`/`FormStack`/`CodeEditor`/`CodeBlock` and the dialog patterns already in `src/shared/components`.
- Harness: stub the new commands with the same sample Table used by Table Metadata.

Blocked by: 02, 03, 04
