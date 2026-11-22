# Working Query, history and Stored Queries

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 05, 10

See `../spec.md`, decision 20.

Three new items in `src/shared/storage/items.ts`, versioned the way the existing items are (follow `codeTemplates` and `feedbackDraft`; add a migration file only if the repo's convention requires one for a brand-new item). The list logic (cap, de-duplication, ordering, naming) is pure and tested.

- **Working Query**: the XML text, saved a moment after each change. A Workspace opened without Fetch XML in its launch payload restores it; one opened with Fetch XML uses that and overwrites the slot on first edit. One slot: with two Workspace tabs open, the last edit wins, and that is accepted.
- **History**: an entry for every Query Run, successful or not: the Fetch XML, the Connection's label and kind, the time, the Record count of the first page (or the error's first line), and the elapsed time. Never any result data. Newest first, capped at 100. Running the same Fetch XML again on the same Connection moves the existing entry to the top instead of adding another. A Clear button empties it after a confirmation.
- **Stored Queries**: "Save" in the header keeps the current Query under a name (asking for one the first time, and offering to overwrite when the name exists); "My queries" lists them alphabetically with rename and delete. Opening one replaces the current Query, asking first if it has edits since it was last run or stored. The header shows the Stored Query's name when the current Query came from one, with a mark when it has changed since.
- One side panel or drawer in the Workspace with two tabs, History and My queries, each with a filter box. A history entry shows its Table, time, Connection and count; hovering or expanding shows the Fetch XML. The same lists appear on the empty state under the starting points.

Acceptance:

- Unit tests: the cap, de-duplication and ordering of history; rename and overwrite of Stored Queries.
- In the harness: edit a Query, reload the page, and it is restored; run twice and history shows one entry at the top; save, rename, reopen and delete a Stored Query; Clear empties history.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.
