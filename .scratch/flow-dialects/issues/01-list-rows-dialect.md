# Flow tab on Generate Query (List rows)

Status: wontfix
Type: task

See `../spec.md`, output 1.

- `FetchXmlDialog` gets a fourth `Tab` "Flow". Pure `fetchXmlToListRows(fetchXml, entitySetDisplayName)` in `src/modules/utilities/lib` with tests: uses `fetchXmlToOData` for `$select`, `$filter`, `$orderby`, `$expand`; when it reports `ok: false` or the query has link-entities, returns the Fetch Xml Query form instead.
- Render as labelled fields (Table name, Select columns, Filter rows, Sort by, Expand query, or Fetch Xml Query) each with its own `CopyButton`, plus the "always exact" note.
- The Table name field needs the entity set display name: extend `utilities.generateFetchXml` results with the Table's display collection name, or look it up from the page's metadata.

Blocked by: none
