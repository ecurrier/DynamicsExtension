# Query operations and Gateway

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 01

See `../spec.md`, decisions 4, 5, 16, 17, 23 and "Architecture > Operations".

Before starting, read the `## Comments` sections of issues 01 and 02: they document the Query core's API and the decisions made while building it.

`queryOperations(http)` in `src/shared/lib/dataverse/query.ts`, following the dual-Connection recipe used by Environment Variables and the Data Transporter: one args object per operation, `CommandMap` entries named `query.<operation>`, page handlers that forward through `runOperation`, and a hook built with `defineGateway` and `useGateway`. Every operation is a read. Tests with `createFakeHttp`.

- `listTables`: logical name, display name, entity set name, primary id, primary name, for Tables that can be queried.
- `getTable({ logicalName })`:
  - Columns: logical name, display name, the attribute type mapped to the Column types of issue 02's operator catalogue, Choice options (value and label, including state and status), lookup targets, and whether the Column is valid for read.
  - Relationships in both directions: for many-to-one, the lookup Column, the referenced Table and its key, and the navigation property; for one-to-many, the referencing Table and Column and the collection navigation property; for many-to-many, the intersect Table and both sides.
  - Reuse the readers in `codegen.ts`, `tableMetadata.ts` and `transport.ts` where they already return this. Column metadata `$select` stays on base properties with a typed cast per attribute type; the note "Dataverse attribute metadata $select" in project memory explains why, and the harness will not catch a mistake here.
- `runQuery({ entitySetName, fetchXml })`: sends the Fetch XML exactly as given and returns one page of results with every annotation (`Prefer: odata.include-annotations="*"`): the rows, whether more Records exist, the paging cookie for the next page (decoded, ready to be put on the next request), the total count when the Query asked for it, and the elapsed time. The operation does not parse or edit the Fetch XML, because it also runs inside the page bundle and must not pull the XML parser into it (see issue 01's comments).
- `pagedFetchXml(document, { page, pagingCookie, pageSize })` in `src/shared/lib/fetchxml/`, pure and tested: returns the Fetch XML to send for a given page, using issue 01's edit operations on a copy, never a regex on the text. The Workspace calls it and passes the result to `runQuery`. Paging follows "Page results using FetchXml" on learn.microsoft.com for the Web API: read that page and implement what it says about `page`, `count`, the paging cookie annotation and its encoding. A Query with `top` or `aggregate="true"` is a single page: `pagedFetchXml` leaves it untouched and reports that it cannot be paged. `pageSize` is applied only when the Query sets neither `count` nor `top`.
- Server errors come back as the existing `DataverseHttpError` / `DataverseOperationError` types with the platform's message intact.
- Harness: stubs for every `query.*` command in `dev/harness/chrome-shim.js` and matching routes in its fake `fetch` for the Environment connection. Fixtures: `account` and `contact` with a relationship each way, Choice and lookup Columns, and a result of at least 120 accounts served 50 at a time with a paging cookie, so Next page is reachable.
- Map Dataverse attribute types onto issue 02's exported `ColumnType`. The hierarchy operators assume unique identifier and lookup Columns, and four operators are marked `requiresTime`, so the Column metadata must also say whether a date Column is date-only.

Acceptance:

- Each operation has `createFakeHttp` tests, including the outgoing URL, the decoded paging cookie, the more-records flag, and a server error. `pagedFetchXml` has tests for page 1 and page 2, a cookie containing characters that need escaping, a Query with `top`, a Query that already sets `count`, and an aggregate Query.
- `npm run build` shows `page.js` and `background.js` no larger than before this issue by more than a few kB, and neither contains the Lezer parser.
- The Gateway hook compiles against the command contract for both Connections.
- `npm run typecheck`, `npm run lint` and `npm test` pass.

Needs a real org (list in the phase 1 smoke checklist, issue 14): paging past the first page on both Connections, and the Column metadata request.
