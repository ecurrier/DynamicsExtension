# Working Query, history and Stored Queries

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 05, 10

See `../spec.md`, decision 20.

Three new items in `src/shared/storage/items.ts`, versioned the way the existing items are (follow `codeTemplates` and `feedbackDraft`; add a migration file only if the repo's convention requires one for a brand-new item). The list logic (cap, de-duplication, ordering, naming) is pure and tested.

- All UI text follows spec decision 31 (few words, Simplified Technical English); issue 19 lists the rules.
- **Working Query**: the XML text, saved a moment after each change. A Workspace opened without Fetch XML in its launch payload restores it; one opened with Fetch XML uses that and overwrites the slot on first edit. One slot: with two Workspace tabs open, the last edit wins, and that is accepted.
- **History**: an entry for every Query Run, successful or not: the Fetch XML, the Connection's label and kind, the time, the Record count of the first page (or the error's first line), and the elapsed time. Never any result data. Newest first, capped at 100. Running the same Fetch XML again on the same Connection moves the existing entry to the top instead of adding another. A Clear button empties it after a confirmation.
- **Stored Queries**: "Save" in the header keeps the current Query under a name (asking for one the first time, and offering to overwrite when the name exists); "My queries" lists them alphabetically with rename and delete. Opening one replaces the current Query, asking first if it has edits since it was last run or stored. The header shows the Stored Query's name when the current Query came from one, with a mark when it has changed since.
- One side panel or drawer in the Workspace with two tabs, History and My queries, each with a filter box. A history entry shows its Table, time, Connection and count; hovering or expanding shows the Fetch XML. The same lists appear on the empty state under the starting points.

Acceptance:

- Unit tests: the cap, de-duplication and ordering of history; rename and overwrite of Stored Queries.
- In the harness: edit a Query, reload the page, and it is restored; run twice and history shows one entry at the top; save, rename, reopen and delete a Stored Query; Clear empties history.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.

## Comments

2026-11-22: the non-UI half is done (Opus worker, reviewed; 38 tests). What remains is the UI: restoring on open, recording each Query Run, the Save button, the header's Stored Query name and changed mark, and the History and My queries panel.

- Storage items in `src/shared/storage/` (all version 1; no schema bump or migration was needed, matching how `codeTemplates` and `feedbackDraft` were added): `workingQueryItem` (`local:workingQuery`, `{ fetchXml, writtenAt } | null`), `queryHistoryItem` (`local:queryHistory`, a list of `{ fetchXml, connection, connectionLabel, ranAt, outcome, elapsedMs }`), `storedQueriesItem` (`local:storedQueries`, keyed by id, each `{ id, name, fetchXml, createdAt, updatedAt }`).
- Logic and hooks in `src/query-builder/remembered/` (named to stay clear of "saved query"): `recordRun`, `clearHistory`, `filterHistory`, `summarizeHistoryEntry`, `addStoredQuery`, `overwriteStoredQuery`, `renameStoredQuery`, `deleteStoredQuery`, `sortStoredQueries`, `filterStoredQueries`, `matchesStored`, `normalizeFetchXml`; hooks `useWorkingQuery`, `useQueryHistory`, `useStoredQueries`.
- "The same Fetch XML" compares the minified serialisation of the parsed XML, falling back to trimmed text when it does not parse. The same Connection is the same page host or the same Environment id.

What the UI calls and when: on open, read `useWorkingQuery().opened` once; on each edit, `write(text)` (saves 500 ms after the last change, and on unmount; `flush()` saves at once); on every Query Run, successful or not, `useQueryHistory().record(entry)`; on Save, `useStoredQueries().add(name, xml)` and, when refused with `name-taken`, offer `overwrite(name, xml)`; for the header's changed mark, `matchesStored(storedQuery, text)`.
