# Phase 2 docs and smoke-test checklist

Status: ready-for-agent
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
