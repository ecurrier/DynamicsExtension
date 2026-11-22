# Web API Dialect and copy-as

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 02, 03, 04

See `../spec.md`, decisions 3, 21, 22.

Before starting, read the `## Comments` sections of issues 01 and 02: they document the Query core's API and the decisions made while building it.

`toWebApi(query, metadata)` in `src/shared/lib/fetchxml/`, pure and tested, returning the request path (entity set plus query options) and a list of warnings. Derive it from the Web API query documentation on learn.microsoft.com (`$select`, `$filter`, `$orderby`, `$top`, `$expand`, `$count`, `$apply`, and the Web API query function reference). Do not read `MarkMpn.FetchXmlToWebAPI` or FetchXML Builder.

- `$select` from the root Table's Columns, with lookups as `_name_value`; `all-attributes` omits `$select`.
- `$filter` from nested filters with correct `and`/`or` grouping and parentheses. Every operator in issue 02's catalogue maps to a comparison, a standard function (`contains`, `startswith`, `endswith`), or a `Microsoft.Dynamics.CRM` query function with its parameters; an operator with no Web API equivalent produces a warning naming it. Values are typed by the Column: quoted strings with quotes doubled, bare numbers and booleans, GUIDs unquoted, dates in ISO form.
- `$orderby`, `$top`, and `$count=true` for `returntotalrecordcount`.
- Link-entities: many-to-one becomes `$expand` on the single-valued navigation property with a nested `$select`; one-to-many becomes `$expand` on the collection navigation property with nested `$select`, `$filter` and `$orderby`. A filter on a linked Table that restricts the root Records (an inner join) is expressed where the Web API can (a filter on a single-valued navigation property path; `any`/`all` lambda operators on a collection) and warned about where it cannot. Navigation property names come from the metadata of issue 03.
- Aggregates: express with `$apply` where the documentation covers the case; otherwise a warning that the Query has no Web API equivalent, and no URL.
- Each warning names the node it is about, so the UI can point at it.

UI:

- The right pane gets two tabs, "Fetch XML" (the editor) and "Web API" (read-only: the full URL for the current Connection, the path alone, and the warnings, each a link that selects its node). A copy button on each.
- A "Copy as" menu on the Fetch XML tab: formatted, minified, JavaScript string, C# string (from issue 01's serialiser).
- Replace `fetchXmlToOData` and `webApiSnippet` in `src/modules/utilities/lib/fetchXmlSnippets.ts` with the shared converter. The Utilities dialog loads the metadata for the Tables the Fetch XML names through the Gateway, and shows the converter's warnings. Remove the regex implementation and its tests once nothing uses it.

Acceptance:

- Unit tests: nested `and`/`or` three deep; each operator family (comparison, string functions, list, null, relative dates, user and hierarchy operators); value typing and quote escaping; a many-to-one expand with select; a one-to-many expand with a nested filter; an inner-join filter on a lookup path; an aggregate; and a Query that cannot be expressed, which returns warnings.
- In the harness: the Web API tab updates as the Query changes; the Utilities dialog shows the same URL for the same Fetch XML, including a nested filter it used to get wrong.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.

Needs a real org (issue 14): the URL for a nested `or` filter with a many-to-one link returns the same Records as the Fetch XML.
