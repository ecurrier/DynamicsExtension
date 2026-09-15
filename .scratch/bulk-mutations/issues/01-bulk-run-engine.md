# Bulk Run Engine

Status: resolved
Type: task

See `../spec.md`, "Bulk Run engine".

- Pure model in `src/shared/lib/bulkRun/` with tests: `BulkRunPlan` and `BulkRunItem` types in `src/shared/types/bulkRun.ts`; `bulkRunSummary` (counts by outcome plus a caption), `retryPlan` (derives a plan from the items that are not `succeeded`), `bulkRunProgress` (completed over total).
- Runner `runBulkPlan(plan, execute, { concurrency, signal })` in `src/shared/lib/bulkRun/run.ts`: runs items with a capped concurrency, never rejects, resolves to one outcome per item, reports progress through a callback, and honours an abort signal.
- Component `src/shared/components/BulkRun/BulkRunDialog.tsx` plus `BulkRunPreview`, `BulkRunProgress` and `BulkRunResult`, all using the existing `DataTable`. Steps are preview, confirm, run, result; the result step offers "Retry unfinished" built on `retryPlan`.
- Before the confirm step, state that closing the window or panel stops the run and that unfinished items can be retried.
- Give the components explicit column widths rather than `autoFitColumns`, since `BulkRunDialog` renders inside a dialog.
- Export from `src/shared/components/index.ts` and `src/shared/lib/index.ts`.
- Harness: a fixture plan of twelve items where three fail and one is skipped, reachable from a temporary card, so the result table and the retry path render at popup width and panel width.

Blocked by: none

## Comments

`BulkRunPlan` carries an `action` alongside `title` so the confirm button reads "Add 12" rather than a generic "Apply", which is what makes the preview step state plainly what is about to happen.

`skipped` is produced only by the runner, when an item is reached after the run was stopped. In-flight items are allowed to finish, so a stopped run is honest about what actually happened rather than guessing. `retryPlan` treats failed and skipped alike as unfinished, which is the whole point: one button re-runs everything that did not succeed and leaves successes alone.

A seventh copy of the private `describe(error)` one-liner would have been added here, so it went into `src/shared/lib/errors.ts` as `describeError` instead. The six existing copies under `src/shared/lib/dataverse/` were left alone; consolidating them is a separate cleanup.

The harness fixture was built as a temporary card on the Admin Area, used for the verification below, and then removed — `AdminArea.tsx` is byte-identical to its committed state. A permanent demo card would have shipped a developer fixture into the product, and the durable path for exercising this dialog arrives with `security-module/03`, which is its first real caller. If the engine needs re-verifying before then, re-add a card rather than shipping one.

Verified in the harness across the full cycle. Preview: twelve rows, the not-undoable warning, and an "Apply 12" button. Running: progress bar reporting "4 of 12 done" with a Stop button. Result: "9 of 12 applied, 3 failures." with per-item badges and a "Retry 3 unfinished" action. Retry: runs exactly three items, reports "0 of 3 applied, 3 failures.", and offers retry again. Stop mid-run: six applied, two failed, four "Never ran / Stopped before this ran", totalling twelve, with "Retry 6 unfinished" covering both kinds. At 400px the dialog fits the side panel with no page-level horizontal overflow.

Unit tested separately: outcome ordering, per-item failure isolation, a thrown non-error, progress firing once per item including items skipped after a stop, the concurrency cap, and an empty plan never calling the executor.
