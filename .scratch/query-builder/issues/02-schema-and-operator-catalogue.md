# Fetch XML schema and operator catalogue

Status: ready-for-agent
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
