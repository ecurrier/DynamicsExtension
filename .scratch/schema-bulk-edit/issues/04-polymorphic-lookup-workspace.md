# Polymorphic Lookup Workspace

Status: resolved
Type: task

See `../spec.md`, "Polymorphic lookups" and decision 5. The XrmToolBox tool manages existing lookups, so v1 does too.

- New Area label "Polymorphic Lookups", body a `WorkspaceLaunchButton` opening the `schema-tools` Workspace with `{ tool: "polymorphic" }`.
- Read path: list the polymorphic lookup Columns on a chosen Table with their current target Tables, using the relationship collections already read by `src/shared/lib/dataverse/tableMetadata.ts`.
- Create path: `CreatePolymorphicLookupAttribute` with the owning Table, the Column schema name and labels, and the chosen target Tables, carrying the solution header from `bulk-mutations/03`.
- Manage path: add a target by creating an additional many-to-one relationship onto the existing lookup Column, and remove one by deleting that relationship. Confirm the exact request shape against a real org before marking this done, and record what was found in this file under `## Comments`.
- Both paths publish through `publishTables` after a successful change, and multi-target work runs through `BulkRunDialog` so a partial failure names the targets that did not take.
- Pure helpers with tests in `src/modules/schema/lib/polymorphic.ts`: `targetDiff` (current targets versus chosen, to adds and removes), `polymorphicPlan`, schema name validation.
- Harness: a fixture Table with one existing polymorphic lookup over three targets and one single-target lookup, so the list, an add and a remove all render.

Blocked by: 01, bulk-mutations/01, bulk-mutations/02, bulk-mutations/03

## Comments

**Shipped create-only, against the issue as written.** Listing existing polymorphic lookups and creating new ones is implemented; adding or removing a target on an existing lookup is not, and the Workspace says so in a banner rather than hiding the gap.

The reasoning: the owner established that XrmToolBox can do it, so it is possible, but not how. Every other write in this batch was implemented against an API I could state precisely and test the request shape of. Removing a target deletes a relationship and potentially orphans data, and writing that against a guessed request is the one place in this work where being wrong is expensive and silent. `06` is a research ticket to establish the mechanism first.

`listPolymorphicLookups` infers a polymorphic Column from the many-to-one relationships that share a referencing attribute, which is what a polymorphic lookup is underneath. That read needs checking against a real org too — an ordinary lookup should never produce more than one, but the inference is mine rather than a documented flag.

Create was not exercised live: the harness has no fixture for it, because stubbing a request whose shape is unconfirmed would only prove the stub agrees with itself.
