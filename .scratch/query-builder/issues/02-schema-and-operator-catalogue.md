# Fetch XML schema and operator catalogue

Status: resolved
Type: task
Phase: 1
Blocked by: 01

See `../spec.md`, decisions 3, 10, 13 and "Architecture > Query core".

Pure data and lookups in `src/shared/lib/fetchxml/`, with tests. This is what the tree, the details pane, autocomplete and validation all read, so it is written once here.

Source: the Fetch XML reference and schema on learn.microsoft.com (the element reference pages for `fetch`, `entity`, `attribute`, `all-attributes`, `order`, `filter`, `condition`, `value`, `link-entity`, and the operator reference). Fetch those pages and work from them. Do not read FetchXML Builder's source or `MarkMpn.FetchXmlToWebAPI`.

- Element catalogue: for each element, its permitted parents and children, and its attributes. Each attribute has a value kind (enumeration with its values, boolean, number, text, Table reference, Column reference, alias reference), whether it is required, a one-line plain-English description (shown as the hint in the details pane, so write it for a reader who knows Fetch XML), and a `common` flag marking the ones that also belong on the tree row; the details pane lists all of them. Each operator likewise carries a short plain-English meaning, shown as secondary text beside the literal operator name (spec decision 27).
- Cover the current schema, including: `fetch` (`top`, `count`, `page`, `paging-cookie`, `distinct`, `aggregate`, `returntotalrecordcount`, `aggregatelimit`, `datasource`, `latematerialize`, `options`, `useraworderby`), `attribute` (`alias`, `aggregate`, `groupby`, `distinct`, `dategrouping`, `usertimezone`, `rowaggregate`), `order` (`attribute`, `alias`, `descending`, `entityname`), `filter` (`type`, `hint`, the quick-find attributes), `condition` (`attribute`, `operator`, `value`, `valueof`, `entityname`, `uiname`, `uitype`), `link-entity` (`name`, `from`, `to`, `alias`, `link-type` with every documented value, `intersect`, `visible`), and `link-entity` as a child of `filter`. If the documentation and this list disagree, the documentation wins; note the difference in the issue comments.
- Operator catalogue: every documented operator with a display label, the Column types it applies to, and how many values it takes (none, one, two, a list). Column types are the Dataverse attribute types grouped as the editors need them: text, memo, whole number, decimal and money, date and time, Choice, multi-select Choice, yes/no, lookup, owner, unique identifier, state and status.
- Standard child order and placement (spec decision 29), as pure functions with tests:
  - The standard order of child kinds under each parent: under `entity` and `link-entity`, `all-attributes` and `attribute`, then `order`, then `filter`, then `link-entity`; under `filter`, `condition`, then `filter`, then `link-entity`.
  - `insertionIndex(parent, kind)`: after the last child of the same kind (switched-off ones count); when there is none, immediately before the first child of a later kind in the standard order, or at the end. Comments that sit directly above an element belong to that element, so the index never splits a comment from the element below it.
  - `tidy(tree)`: returns a new tree with every `entity`, `link-entity` and `filter` regrouped into the standard order. The sort is stable, so relative order inside a kind is unchanged. A comment or a run of comments travels with the element that follows it; trailing comments stay last. Switched-off elements are grouped by the kind of the element they hold. Elements the catalogue does not know keep their relative order and go last. A tree already in order is returned unchanged (same reference), so the caller can tell whether Tidy would do anything.
- Lookups: attributes of an element, children of an element, operators for a Column type, the definition of one operator, whether an element is known, whether an element is valid under a parent.
- With the catalogue in place, tighten issue 01's switched-off detection: a comment is a switched-off row only when its element is valid under the comment's parent.

Acceptance:

- A test asserts every element and attribute named above is present, and that each enumeration matches the documentation as fetched (list the page URLs and fetch date in a comment at the bottom of this issue file, not in code).
- Operators for a Choice Column include the list operators and exclude `like`; operators for a date Column include the relative-date operators with the right value counts.
- `insertionIndex` puts a new `attribute` after the last attribute and before the first `order`, `filter` or `link-entity`, in an entity whose children are out of order, empty, or interleaved with comments. `tidy` on an interleaved Query groups it, keeps the order of its `order` elements and of its attributes, keeps each comment above the same element, and returns the same reference for a Query already in order.
- A comment holding `<condition .../>` under a `filter` is a switched-off row; the same comment directly under `fetch` stays a comment.
- `npm run typecheck`, `npm run lint` and `npm test` pass.

## Comments

Resolved 2026-11-22. Built by an Opus worker, reviewed and verified (typecheck, lint, 916 tests, build; page and background bundles unchanged). Code in `src/shared/lib/fetchxml/`: `schema.ts`, `operators.ts`, `placement.ts`, and the tightened detection in `parse.ts`.

Sources, fetched 2026-11-22. All learn.microsoft.com pages loaded (HTTP 200). Each was also read as its raw markdown source in MicrosoftDocs/powerapps-docs (`powerapps-docs/developer/data-platform/fetchxml/reference/*.md` and the `includes/` fragments it pulls in), and the two agree; the operator page's `ms.date` is 2026-10-28.

- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/fetch
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/entity
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/attribute
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/all-attributes
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/order
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/filter
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/condition
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/value
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/link-entity
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml/reference/operators
- Supporting: `fetchxml/optimize-performance.md` (union hint), `quick-find.md` (quick find attributes take `'1'`), `fetchxml/aggregate-data.md` and `fetchxml/order-rows.md` (order by alias), `includes/cc-query-options.md` (the `options` values).
- https://learn.microsoft.com/en-us/power-apps/developer/data-platform/fetchxml-schema (the old XSD page) now redirects to the reference index; there is no published schema any more.

Differences between the documentation and this issue's list:

- `fetch`: the reference also documents `no-lock` (legacy); added. It does not document `version` or `mapping`; they are added as `documented: false` because saved views write them on almost every query.
- `filter`: the "quick-find attributes" are `isquickfindfields`, `overridequickfindrecordlimitenabled` and `overridequickfindrecordlimitdisabled`. `hint` has one documented value, `union`.
- `condition`: `uiname` and `uitype` are not in the reference. The reference index says it leaves out attributes used only by model-driven views, which these are. Kept as `documented: false`, because spec decision 13 writes them.
- `link-entity`: `visible` is not in the reference. Kept as `documented: false`. `link-type` values as documented: `inner`, `outer`, `any`, `not any`, `all`, `not all`, `exists`, `in`, `matchfirstrowusingcrossapply`.
- `link-entity` page lists only `entity` and `link-entity` as parents, but the `filter` page lists `link-entity` as a child. The catalogue allows it under `filter`, as this issue asks.
- `order.attribute` is marked required on the order page, yet the aggregate pages sort with `alias` alone. It is catalogued as not required; validation should require `attribute` or `alias`.
- Occurrence limits from the reference: one `entity` per `fetch`; at most one `all-attributes` and one `filter` per `entity`/`link-entity`; at most 500 `condition` per `filter`. They are recorded as `ChildRule.max`, and nothing enforces them yet.

Operator decisions (83 documented operators, all present):

- The reference's data types are Choice, Datetime, Hierarchical, Number, Owner, String, Unique Identifier. They map onto the twelve Column types like this: String → text, memo; Number → whole number, decimal/money; Choice → Choice, multi-select Choice, state/status; Unique Identifier → unique identifier, lookup (and owner for `eq-userid`, `ne-userid`, `eq-businessid`, `ne-businessid`); Hierarchical (`above`, `under`, `eq-or-above`, `eq-or-under`, `not-under`) → unique identifier, lookup; `eq-useroruserhierarchy(andteams)` → owner, lookup. Yes/no gets `eq`, `ne`, `null` and `not-null`.
- `not-in` is documented for Number only, though its description reads "a subquery or a list". It is given the same types as `in`, which this issue's Choice acceptance needs.
- `contain-values` and `not-contain-values` are documented under Choice. They are given to multi-select Choice only, because they test a multi-select value.
- `eq-userteams` and `eq-useroruserteams` have identical descriptions in the reference. They are written as "a team the user belongs to" and "the user or a team they belong to", following their names.
- `next-year` is described as "within the next X years" but takes no value. It is catalogued as no value.
- `neq` is documented as deprecated with data type N/A. It is in the catalogue with `deprecated: true` and no Column types, so no picker offers it.
- `eq-businessid`, `ne-businessid` and `eq-userlanguage` compare with the calling user's context and take no value.
- The Datetime note says DateOnly columns cannot use the hour and minute operators. Those four (`last-x-hours`, `next-x-hours`, `olderthan-x-hours`, `olderthan-x-minutes`) are marked `requiresTime`.

API, from `@/shared/lib/fetchxml`:

- Elements: `ELEMENTS`, `elementDefinition`, `isKnownElement`, `attributesOf`, `attributeDefinition`, `childrenOf`, `isValidChild`; types `ElementDefinition` (child limits in `ChildRule.max`), `AttributeDefinition` (`required`, `common`, `documented`, a description), `AttributeValueKind`.
- Operators: `OPERATORS`, `operatorDefinition`, `operatorsFor(columnType)`, `COLUMN_TYPES`, type `ColumnType`. Each `OperatorDefinition` has `meaning`, `columnTypes`, `values` (none, one, two, list), `valueKind`, `requiresTime`, `deprecated`. The operator's name is its label.
- Placement: `standardChildOrder`, `insertionIndex`, `tidy`.
- `parseFetchXml` now applies the catalogue (a comment is a switched-off row only when its element is valid under the comment's parent); `parseXml(text, { acceptSwitchedOff })` is the generic parser underneath.
- Counts: 9 elements, 50 attributes (5 of them `documented: false`, kept because saved views write them), 83 operators.
