# Flow Dialects

Status: wontfix
Decided: 2026-09-07 (grilling session)
Dropped: 2026-09-07, the owner decided not to pursue Flow output; kept for reference.

## Problem

Our codebases query with Fetch XML and QueryExpression, but Power Automate cloud flows lean on OData: List rows filters, `entityset(guid)` lookup bindings, and `triggerOutputs()?['body/...']` expressions. Flow authors currently look that syntax up by hand. The app should give flows first-class output without adding a separate flow tool.

## Vocabulary

Terms from `CONTEXT.md`: Dialect, Flow, Utility, Template, Column, Record, Choice.

## Decision

Add a **Flow Dialect** to the generators that already produce alternatives, rather than a dedicated flow Utility. Each output sits next to the thing it is derived from, using the tab or menu pattern the app already uses for Dialects. A dedicated "Flow Snippets" Utility is added only if something has no home after these land.

## The four outputs

1. **Generate Query, "Flow" tab**: the Dataverse **List rows** action laid out field by field: Table name (entity set display name), Select columns, Filter rows (from the existing Fetch XML to OData translator), Sort by, Expand query. When the translator cannot cope or link-entities are involved, show the **Fetch Xml Query** field instead with the Fetch XML, plus a note that it is always exact. Each field has its own copy.
2. **Record Payload, "Flow" tab**: an **Add a new row** field list: column display name, then the value as the action expects it, with lookups as `entityset(guid)`, choices as integers, dates as ISO strings. Copy per value, since flow authors fill a form rather than paste JSON. Blocked by developer-utilities/03.
3. **Column Browser, copy "Flow reference"**: for a plain column `triggerOutputs()?['body/name']` and `items('Apply_to_each')?['name']`; for lookups the `_name_value`, `_name_value@OData.Community.Display.V1.FormattedValue`, and `_name_value@Microsoft.Dynamics.CRM.lookuplogicalname` variants; for choices the value and its formatted value. Blocked by developer-utilities/01.
4. **Choice Code, built-in Flow Template**: a Template of kind `choice` and language `javascript` (JSON output) whose result is a value-to-label map ready for a Compose action or a Switch. Blocked by code-generation (Templates and built-ins).

## Out of scope (v1)

Generating whole flow definitions, Update a row bodies in Flow shape, Templates for Flow output other than the choice map, Environment connection.

## Acceptance

- Generate Query on an Account view produces List rows fields that, pasted into a flow, return the same rows as the view.
- Record Payload's Flow tab for a Contact with a parent account shows `accounts(<guid>)` for the parent.
- Column Browser copies a lookup's Flow reference with all three variants.
- The Flow choice Template is available on a fresh install and produces valid JSON.
