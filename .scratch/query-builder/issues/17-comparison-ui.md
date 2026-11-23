# Comparison UI

Status: resolved
Type: task
Phase: 2
Blocked by: 15, 16

See `../spec.md`, decision 26.

A "Compare" tab in the results pane, shown when the Workspace has two or more Connections.

- All UI text follows spec decision 31 (few words, Simplified Technical English); issue 19 lists the rules.
- Setup row: pick the two Query Runs to compare (defaulting to the first two Connections); pick the Match Key, "Primary key" or "Columns I choose" with a multi-select of the Query's root-Table result columns; and a "Columns compared" multi-select, pre-filled with issue 16's suggestion. A "Compare" button.
- Compare loads every remaining page of both Query Runs first, with progress, a Stop button, and the same confirmation past 50,000 Records as Load all. If either side stops at the cap or is stopped by the user, the result carries a banner: "Partial: only the first N Records of X were compared", and the "only in" lists are labelled as unreliable.
- A Comparison is not possible for a Query with `aggregate="true"` or `top`; the tab says why. If a Match Key column is not in the Query's result columns it cannot be chosen; the hint suggests adding the Column to the Query.
- Result: a summary of counts (only in the first, only in the second, different, same, ambiguous, no key), each a filter. Below it, one list for the selected bucket:
  - Only in one side: the Records, in the phase 1 grid.
  - Different: one row per pair showing the Match Key and the number of differing Columns; expanding shows each differing Column with both values side by side, friendly value first and raw value beneath when they differ. A toggle shows only the differing Columns across the grid.
  - Ambiguous and no key: the groups, with a one-line explanation of why they were not compared.
- Every Record in any list opens in its own Environment.
- The summary states how keys were matched (for example "matched on name, ignoring case and surrounding spaces").
- Changing the Query, running again, or changing the setup marks the result stale with a "Compare again" action instead of silently showing old results.
- The setup is remembered for the session, per Workspace tab. Nothing is stored.

Acceptance:

- In the harness, with the differing Environments from issue 15: a Comparison by primary key shows non-zero counts in "only in" each side and in "different", and expanding a different pair shows the changed value on both sides; switching the Match Key to the name Column pairs Records whose GUIDs differ; a lookup pointing at same-named Records is not listed as different under the chosen-column key.
- An aggregate Query shows the explanation instead of the setup.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.

## Comments

Resolved 2026-11-22. Built by an Opus worker, reviewed and verified (typecheck, lint, 1,587 tests, build; the Compare tab's result checked from the worker's screenshot).

- Pure logic: `lib/compareSetup.ts`, `lib/compareFlow.ts`, `lib/compareView.ts`. Components: `src/query-builder/compare/` (14 files, with `useCompare.ts` running a Comparison). The store holds the setup, progress, result and selected bucket in memory. `MultiResultsPane.tsx` adds "Compare" as the last tab with two or more Connections.
- The screen: one setup row; a row of counts that are also the filter, naming the Connections; a line saying how Records were matched; then the selected bucket. "Different" has two views: pairs that open to show each differing Column with both values, and a "Differing Columns" grid of only the Columns that differ.
- Partial: a banner "Partial. Compared the first N Records of each Connection.", and an "only in" button is marked not reliable when the other side is partial. Out of date: a banner with "Compare again" and the old result dimmed, whenever the Query text, a Query Run, a Connection or the setup changes.
- Harness, current page against Contoso Test: by primary key, 34 only in the current page, 27 only in Contoso Test, 22 different, 74 the same; by the `name` Column, 13, 4, 21 and 95, with 1 ambiguous and 1 with no key. "Query Account 005", whose ids differ and whose primary contacts share a name, is in Same under the `name` Match Key. Fixture `?queryFetchXml=aggregate`.

Decisions made here: Compare re-runs the Query on every Connection when its text has changed since the last Run. A Query Run that has already failed is reported, not re-run. The Match Key choices leave out the primary key Column. With a primary-key Match Key, a pair also shows the first text Column, because a GUID alone is hard to read. The "Differing Columns" grid reuses the results grid, so its caption still says "Records" though its rows are pairs.

Not verified in a browser (unit-tested only): the 50,000 confirmation, the "No Records share a primary key" hint, and a Query with `top`. Nothing was run against a real org.
