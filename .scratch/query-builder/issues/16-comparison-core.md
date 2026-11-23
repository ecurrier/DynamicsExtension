# Comparison core

Status: resolved
Type: task
Phase: 2

See `../spec.md`, decision 26. `CONTEXT.md`: Comparison, Match Key, Query Run.

Pure logic in a `lib/` module next to the Workspace, with tests. No UI, no requests. It can be built before issue 15 lands.

`compareQueryRuns(first, second, options)` takes the Records of two Query Runs (rows as the Web API returned them, with annotations), the result columns (from issue 05's derivation), and:

- **Match Key**: the root Table's primary key, or an ordered list of result columns.
- **Compared columns**: the result columns to compare. Columns in the Match Key are never compared.

It returns:

- Records only in the first, only in the second, in both and equal, and in both with differences; for the last, the differing columns with each side's friendly and raw value.
- **Ambiguous** groups: when a Match Key value occurs more than once on either side, those Records are set aside as a group with both sides' Records, not paired and not counted as differences.
- Records whose Match Key is empty on a chosen-columns key, set aside the same way, as "no key".
- Counts for each bucket.

Rules:

- Key matching: primary keys compare as GUIDs, case-insensitively and ignoring braces. Chosen columns compare by the rule for their type below, with text keys trimmed and case-insensitive (state this in the result so the UI can say so).
- Value comparison by type: text exact; numbers and money numerically; dates by their raw ISO value; Choice by option value; yes/no by value. A lookup compares by id when the Match Key is the primary key and by the referenced Record's formatted name when the Match Key is chosen columns, because ids differ between Environments for data created by hand. Empty equals empty.
- A column present in one Query Run's rows and absent from the other's is compared as empty against value.
- A helper suggests default compared columns: every result column except the primary key, `versionnumber`, and, when the Match Key is chosen columns, the created and modified bookkeeping Columns.
- It must stay responsive at 50,000 Records per side: index by key, no quadratic passes. Include a test that compares two 50,000-row sets within a few seconds.

Acceptance:

- Tests for: each bucket; primary-key matching with brace and case differences; a chosen-column key with differing GUIDs; a lookup equal by name but not id under each kind of Match Key; ambiguous keys on one side and on both; empty keys; each value type; a column missing on one side; and the large-set timing.
- `npm run typecheck`, `npm run lint` and `npm test` pass.

## Comments

Resolved 2026-11-22. Built by an Opus worker, reviewed and verified (30 tests; two 50,000-row comparisons in about 300 ms).

API, from `@/query-builder/lib`: `compareQueryRuns(first, second, { columns, primaryKey, matchKey, comparedColumns })`, `suggestComparedColumns(columns, primaryKey, matchKey)`, `columnLogicalName(key)`, `FORMATTED_VALUE_SUFFIX`, and the types `QueryRunRecord`, `ResultColumn` (`{ key, label, type }`), `MatchKey`, `Comparison`.

For issue 05: a lookup's result column key must be `_name_value` and its row must carry the formatted-value annotation, because comparing lookups by name reads it. Produce `ResultColumn` in this shape.

For issue 17: use `keyMatching` and `lookupsComparedBy` from the result for the explanatory text. An ambiguous group counts as one. Differences carry `{ raw, friendly }` for each side.

Decisions made here: a Match Key of several Columns is empty only when every part is empty; an empty primary key goes to "no key"; lookup names compare exactly as values but trimmed and case-insensitive as key parts; multi-select Choices compare as sets; bookkeeping Columns are recognised under link-entity aliases too.
