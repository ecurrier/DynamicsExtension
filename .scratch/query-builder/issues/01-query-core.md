# Query core: parse, serialise, edit

Status: ready-for-agent
Type: task
Phase: 1

See `../spec.md`, decisions 2, 3, 8, 11 and "Architecture > Query core". ADR 0004.

Pure logic in `src/shared/lib/fetchxml/`, with a barrel and colocated tests. No UI, no metadata, no extension APIs. Tests run in the node environment, so `DOMParser` is not available.

- A generic ordered tree: element nodes (name, attributes in source order, children), comment nodes, text nodes, each with its source range in the text it was parsed from. Nothing in this model knows which Fetch XML elements exist; that is issue 02.
- `parseFetchXml(text)`: returns the tree, or the parse errors with their ranges. Never throws. Build it on `@lezer/xml` (add it as a direct dependency at the version already resolved through `@codemirror/lang-xml`). Entity references in attribute values (`&amp;`, `&lt;`, `&quot;`, `&#45;`, and so on) are decoded on parse and encoded on serialise.
- A comment whose content parses as exactly one element is exposed as a switched-off element node (it keeps its own subtree); any other comment stays a comment node. Whether that element is valid at its position is checked later by issue 02's catalogue; here, any single well-formed element counts.
- `serializeFetchXml(tree, options)`: standard formatting (two-space indent, double quotes, attributes on one line, self-closing empty elements, comments kept in place), a minified form, and helpers that escape the result as a JavaScript string and as a C# string. A switched-off node is written as a comment holding its element, with `--` inside attribute values written as `-&#45;`.
- Edit operations that return a new tree and leave the input untouched: set or remove an attribute (a new attribute goes after the existing ones), insert a child at an index, remove a node, move a node among its siblings, switch a node off and on. Switching off a node that has switched-off descendants is refused.
- Node identity is the index path from the root. Helpers: node at path, path of a node, node at a text offset (for selection sync), and the range of a node.

Acceptance:

- For a corpus of at least fifteen queries (nested filters, link-entities three deep, aggregates, `valueof`, `<value>` lists, comments between and inside elements, an unknown element, an unknown attribute, single-quoted attributes, awkward whitespace), `serialize(parse(x))` equals `serialize(parse(serialize(parse(x))))`, and no element, attribute, attribute order, comment or text content is lost.
- A value containing `&`, `<`, `"` and `--` survives being switched off and on again.
- Malformed input (unclosed tag, stray `<`, mismatched close tag) returns errors with ranges and does not throw.
- Every edit operation has a test; none mutates its input.
- `npm run typecheck`, `npm run lint` and `npm test` pass.
