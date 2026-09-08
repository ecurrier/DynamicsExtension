# Logic-less template engine

Status: resolved
Type: task

Implement the Mustache-style engine from ADR-0001 in `src/modules/codegen/lib/engine.ts` (pure, no React, no extension APIs), with tests.

- Supports `{{path}}` with dotted paths, `{{#name}}...{{/name}}` sections over arrays (iterate) and truthy values (render once, push context), `{{^name}}...{{/name}}` inverted sections, `{{.}}` for the current scalar, and `{{! comment }}`. No HTML escaping; output is code.
- Standalone section tags on their own line do not leave blank lines behind (Mustache "standalone" rule), so column loops produce clean output.
- Unknown paths render as empty strings; the engine also returns a list of unresolved paths so the editor can warn.
- Rendering must never throw on user input; malformed sections produce a descriptive error result instead.

Blocked by: none
