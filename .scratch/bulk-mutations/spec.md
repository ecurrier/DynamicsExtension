# Bulk Mutations

Status: resolved
Decided: 2026-09-11

## Problem

Four requested features change many things at once in a live environment: bulk Security Role assignment, bulk privilege depth rewrites, cross-Table Column metadata edits, and polymorphic lookup management. None of them is transactional. There is no batch rollback for two hundred role disassociations or forty attribute updates followed by a publish, so a failure halfway through leaves the environment half-changed.

Written four times this produces four confirmation dialogs, four progress indicators, and four different answers to "what happened to the twelve that failed". Written once it is a single shared substrate that every bulk feature renders into.

Two platform gaps sit underneath the same work. Publishing exists only as `Xrm.WebApi.online.execute`, which cannot be gatewayed, so metadata work could not reach a saved Environment. And nothing in the codebase sends a solution header, so every metadata write would land in whichever solution the environment defaults to.

## Vocabulary

Terms from `CONTEXT.md`: Gateway, Connection, Page connection, Environment connection, Solution Layer, Table, Column, Security Role. New term this spec introduces: Bulk Run.

## Decisions

1. **One engine, four callers.** The preview, confirmation, progress and per-item result live in one shared component and one pure model. Features supply a plan and an executor.
2. **Per-item results, not a pass or fail.** Because the operations are not transactional, the result is a row per item with its own outcome, and the engine can re-run only the items that failed or never ran.
3. **Bulk Runs are bound to their surface.** A run in the side panel dies when the panel closes, and one in a Workspace tab dies when the tab closes. The engine warns before starting and relies on retry for recovery. Background-resumable runs are a separate project.
4. **The engine works at panel width and full width.** Bulk user work is an Area, so it renders in the side panel; the other three are Workspaces. One component, responsive, not two layouts.
5. **Publish becomes gatewayable.** Reimplemented as a plain `PublishXml` POST through `DataverseHttp` so it serves both Connections, and `forms.updateFormXml` moves onto it, which also frees form XML editing from being page-only.
6. **Solution scope is explicit and reuses the existing picker.** `MSCRM.SolutionUniqueName` threads through the headers bag `DataverseHttp.request` already accepts, and the solution is chosen with the `useSelectDialog` and `global.getSolutions` pattern already used by the control editor Utility.

## Bulk Run engine

A pure model: a plan is an ordered list of items, each carrying a label, the arguments for one operation, and a description of the change for the preview. Running yields an outcome per item — `succeeded`, `failed` with a message, or `skipped` — and a summary. A retry derives a new plan from the items that did not succeed.

The component renders four steps: preview the plan as a table, confirm explicitly, show progress with a running count, then show the result table with a retry action for the unfinished items. Concurrency is capped so a two-hundred-item run does not saturate the environment.

## Gatewayable publish

`publishOperations(http)` exposing `publishTables(logicalNames)`, posting to `PublishXml` with the body `buildPublishXml` already produces. `forms.updateFormXml` stops calling `Xrm.WebApi.online.execute` and calls the operation instead.

## Solution aware writes

A shared hook wrapping `useSelectDialog` and `global.getSolutions`, returning the chosen solution's unique name, and a `DataverseHttp` helper that adds `MSCRM.SolutionUniqueName` to a request's headers.

## Verification

The plan, outcome and retry-derivation helpers are unit tested, including a mixed-outcome run and a retry that excludes the successes. The component renders in the harness from a fixture with both successes and failures, at panel width and at Workspace width. The `PublishXml` POST and the solution header need a real org.

## Out of scope (v1)

Background-resumable runs. Undo. Scheduling. Progress that survives a surface closing. Batching multiple operations into one OData `$batch` request.

## Acceptance

- A feature supplies a plan and an executor and gets preview, confirm, progress and results without writing any of them.
- A run with some failures shows a row per item and offers to re-run only the unfinished ones.
- Starting a run warns that closing the surface will stop it.
- The engine is usable at side panel width.
- `forms.updateFormXml` publishes through the gatewayable operation and still works over the Page connection.
- A metadata write can be directed at a solution chosen by the user.
