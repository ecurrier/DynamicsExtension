# Phase 2 docs and smoke-test checklist

Status: resolved
Type: task
Phase: 2
Blocked by: 17

See `../spec.md`, "Verification" and "Acceptance > Phase 2".

- `dev/harness/README.md`: extend the Query Builder section with the extra Environments and how their data differs.
- `README.md` and `docs/store-submission.md`: add the Comparison to the Query Builder description.
- Write `.scratch/query-builder/smoke-test-phase-2.md`, a numbered checklist for the user to run against real Environments:
  - One Query over the open tab's Page connection and two saved Environments at once.
  - An Environment that lacks a Column the Query uses shows its own error while the others return Records.
  - A Comparison by primary key between two Environments that share transported data.
  - A Comparison by a chosen Column between two Environments whose data was created by hand, including a lookup Column.
  - A Comparison where one side has more than 5,000 Records.
  - Opening a Record from each side lands in the right Environment.
  Each step says what to do and what to expect.

Acceptance:

- The README section matches the shim.
- The checklist exists.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass.

## Comments

Resolved 2026-11-22 (Opus worker, reviewed; typecheck, lint, 1,587 tests and the build pass).

- `.scratch/query-builder/smoke-test-phase-2.md`: 18 steps, 6 marked quick (1, 3, 5, 8, 15, 16); step 10, the 50,000 confirmation, is optional. It ends with a table mapping each source note to its step.
- `dev/harness/README.md`: the several-Connections and Compare text rewritten and checked against the shim.
- `README.md`: the Query Builder line mentions comparing one Query's results across Environments.
- Unchanged: `docs/store-submission.md` (it gives only the module count, and its certification notes have about 38 characters left under their 2,000-character cap), `PRIVACY.md` (a Comparison and the added Connections are kept in memory only).
- One note has no step: "a Connection that is not ready shows its own error", because producing it means breaking a saved Service Principal.

Also fixed in review: the "Differing Columns" grid's caption said "Records" for rows that are pairs; it now says "Pairs".
