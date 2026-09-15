# Record Set Navigator

Status: resolved
Type: task

See `../spec.md`, "Record Set Navigator" and decision 5.

- Rename the Area: id stays `utilities.records`, label and breadcrumb become "Record Set Navigator".
- Default the view picker to the first entry rather than opening with nothing chosen.
- Take the displayed columns from the chosen view, not from the returned row keys: parse the `<attribute name="..."/>` list out of the chosen FetchXML in order, and resolve display names through the table metadata read so headers read "Account Name", not `name`.
- Prefer the formatted value when the row carries one: a key of `<attribute>@OData.Community.Display.V1.FormattedValue` is what should be shown for lookups, choices, dates and money.
- Add a short statement of what the screen is for and two numbered steps, placed below the toolbar and above the table so it reads before the table does.
- Pure helpers with tests in `src/modules/utilities/lib/recordSet.ts`: `fetchXmlAttributes` (ordered attribute names from FetchXML, ignoring link-entity attributes), `displayValue` (formatted value, then raw, then empty).
- Harness: a fixture whose rows carry formatted values and whose FetchXML names three attributes, so the column derivation is visible.

Blocked by: none

## Comments

Two real bugs surfaced while verifying this, neither of which the original version could have worked around.

A view names `<attribute name="ownerid" />` but the OData response returns `_ownerid_value`. The first version looked up the key verbatim, so every lookup column would have rendered blank against a real org. `displayValue` now tries the formatted value, then the `_x_value` form, then the raw value, for both spellings. The harness fixture was corrected to name `ownerid` as a real view does, so the case is actually exercised.

Column display names come from `codegen.getTableModel`, which already returns logical and display names for any table and is cached forever. Reaching into the codegen namespace from a Utilities Area is slightly odd, but it is the right data and adding a parallel command to avoid the awkwardness would have been worse.

`SelectOptions` gained `defaultToFirst`, used only here. The solution picker deliberately does not set it: pre-selecting where a schema write lands is worth one extra click.

Verified in the harness: the picker opens on the first view, headers read "Account Name" for the resolved column, the link-entity's `fullname` is correctly excluded, money and lookups show their formatted values, and the record filter appears once rows load.
