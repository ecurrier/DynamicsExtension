# Phase 1 docs and smoke-test checklist

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 05, 07, 08, 09, 10, 11, 12, 13

See `../spec.md`, "Verification" and "Acceptance".

- `dev/harness/README.md`: a section for `harness-query-builder` describing the fixtures and what each stub does, in the style of the existing sections.
- `README.md` and `docs/store-submission.md`: mention the Query Builder where the other Workspaces are listed. Query Builder adds no host permissions and no outbound requests beyond the Environments already configured; confirm that by reading `wxt.config.ts`, and say so if anything changed. `PRIVACY.md` changes only if history or Stored Queries need a line about what is kept in local storage; read it and decide.
- Remove the prototype if it is still in the working tree: `src/query-builder-prototype/`, `src/entrypoints/query-builder-prototype/`, and its line in `dev/harness/build.mjs`.
- Write `.scratch/query-builder/smoke-test-phase-1.md`: a numbered checklist the user runs by hand against a real org with the unpacked build, covering exactly what the harness cannot prove. Collect every "Needs a real org" note from issues 03, 05, 10, 12 and 13, and add:
  - Run over a Page connection and over an Environment connection.
  - Paging past the first page and Load all past 5,000 Records.
  - The Column metadata request succeeding for a Table with Choice, lookup, money and date Columns.
  - Linked-Table Columns in results, with and without an alias.
  - Opening a Record and a lookup value from each Connection kind.
  - Personal Views; the open page's grid as a starting point.
  - A Query with several hundred GUIDs.
  - The Web API URL returning the same Records as its Fetch XML.
  Each step says what to do and what to expect, so a failure can be reported as "step 7 failed, saw X".

Acceptance:

- The harness README section matches what the shim actually serves.
- The checklist exists and every "Needs a real org" note in the phase 1 issues is covered by a step.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass.
