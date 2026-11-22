# Validation

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 02, 06

See `../spec.md`, decision 15.

`validate(query, metadata)` in `src/shared/lib/fetchxml/`, pure and tested, and its two displays. `metadata` is a synchronous lookup over whatever Tables are already loaded; a Table that is not loaded yet produces no diagnostics for its Columns, and the Workspace loads the Tables a Query names and validates again when they arrive.

Rules, each with a clear one-sentence message that names the Table, Column, operator or alias involved:

- Structure: an element not valid under its parent; a required attribute missing (`entity name`, `link-entity name`, and `from`/`to` where the documentation requires them, `condition operator`, `order attribute` or `alias`); an attribute value outside its enumeration; a non-numeric value where a number is required.
- An element or attribute the catalogue does not know is an information note ("not recognised, left as written"), never an error.
- Metadata: the Table does not exist on this Connection; the Column does not exist on its Table (resolving the enclosing `entity` or `link-entity`, and `entityname` on a condition or order); `from`/`to` do not exist on their Tables.
- Operators: the operator does not apply to the Column's type; the number of values does not fit the operator (none, one, two, a list); a value that cannot be a value of that type (text in a number Column, a non-GUID in a lookup).
- Aliases: duplicated; not a valid identifier; referenced by `valueof`, `entityname` or an `order alias` but not defined.
- Aggregates: with `aggregate="true"`, every `attribute` needs `aggregate` or `groupby` and an `alias`; `all-attributes` is not allowed; an `order` must use an alias. Without it, `aggregate` or `groupby` on an attribute is an error.
- Paging: `top` together with `page` or `count`.

Display:

- Tree: a row with a problem shows a severity icon whose tooltip lists its messages; a collapsed parent shows that something beneath it has a problem.
- XML pane: diagnostics underlined at the attribute or element range, with the message on hover. Add `@codemirror/lint` if it is not already resolved, and let `CodeEditor` take extra extensions if it cannot already.
- Run stays enabled when there are validation errors (the platform is the final judge, and a rule here could be wrong); the Run button shows a count of problems beside it.

Acceptance:

- One test per rule, positive and negative, plus a test that a valid complex Query produces no diagnostics.
- In the harness: misspelling a Column in the XML underlines it and flags its row; choosing `like` on a Choice Column in the tree is not offered, and typing it in the XML is flagged.
- `npm run typecheck`, `npm run lint` and `npm test` pass. Verify in the harness and include a screenshot.
