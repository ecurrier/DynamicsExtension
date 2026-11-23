# Query operations and Gateway

Status: resolved
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

## Comments

Resolved 2026-11-22. Built by an Opus worker, reviewed and verified (typecheck, lint, 947 tests, build).

- `queryOperations(http)` in `src/shared/lib/dataverse/query.ts`, types in `src/shared/types/query.ts`, Gateway hook `useQueryGateway` / `queryGateway` in `src/query-builder/hooks/`.
  - `listTables()` returns `QueryTableSummary[]` (logical, display and entity set names, primary id, primary name, `isIntersect`; intersect Tables are kept).
  - `getTable({ logicalName })` returns `QueryTable`: `columns` (each with `columnType` or null, `dateOnly`, `isValidForRead`, `options`, `targets`), and `manyToOne`, `oneToMany`, `manyToMany` relationships. Columns come from `codegenOperations.getTableModel`.
  - `runQuery({ entitySetName, fetchXml })` returns `rows`, `moreRecords`, `pagingCookie` (decoded), `totalRecordCount`, `totalRecordCountLimitExceeded`, `elapsedMs`, `annotations`.
- `pagedFetchXml(document, { page, pagingCookie, pageSize })` and `DEFAULT_PAGE_SIZE` (50) in `src/shared/lib/fetchxml/paging.ts`. It returns `{ pageable: true, fetchXml, page, count }` or `{ pageable: false, fetchXml, reason }` for a Query with `top` or `aggregate`.
- Paging follows "Page results using FetchXml": `Prefer: odata.include-annotations="*"`; more Records exist when `@Microsoft.Dynamics.CRM.morerecords` is true; the cookie annotation is an XML element whose `pagingcookie` attribute is URL-encoded twice, so it is decoded twice and then XML-encoded by the serialiser when placed on `paging-cookie`. This is not how `transport.ts` pages (`odata.maxpagesize` and `@odata.nextLink`), which the Fetch XML paging documentation does not describe.
- Bundles: `page.js` 84.86 kB (+5.13, the operation code itself), `background.js` 21.73 kB (+0.07), no parser in either. Accepted.
- Harness: account and contact fixtures and 130 accounts served 50 at a time with double-encoded cookies, for both the page stubs and the fake fetch. The fake fetch rejects type-specific properties in the base Column `$select`. Account and contact lookup reads now come from these fixtures, which the Data Transporter's harness page shares.

For issue 04 and later:

- Errors differ by Connection: over a Page connection they arrive as `PageCommandError` named `DataverseHttpError` with the message kept and the HTTP status lost; over an Environment connection as `DataverseHttpError`. Show the message in both cases.
- Hide Columns that have `attributeOf`, and expect `columnType` to be null for Column types the operator catalogue does not cover.
- A Query too long for a URL is not handled until issue 13.

Needs a real org (for issue 14's checklist): paging past page 1 on both Connections, including a cookie containing `&`, `<` or `"`; whether a `+` ever appears in a real cookie; the Column metadata request on a real Table; the relationship request's selected properties; the total count annotations with `returntotalrecordcount`.
