# Developer Utilities

Status: ready-for-agent
Decided: 2026-09-07 (grilling session)

## Problem

The Developer Area has four Utilities (Generate Query, Table Metadata, Open Web API URL, Generate Choice Code Snippet) against Admin's nine. Developers working on an open form or table still leave the extension for "what is this column's logical name", "where is this field on the form", "give me this record as a request body", and "give me a class for this table". Four more Utilities round the page out at eight.

## Vocabulary

Terms from `CONTEXT.md`: Utility, Table, Column, Record, Choice, Dialect, Template, Page connection.

## Decisions

1. **Page connection only.** Every Utility acts on the open model-driven app page, like the rest of the Area.
2. **One click, simple input.** The card stays a single action; its dialog may take a search box or a value, nothing heavier.
3. **The four**: Column Browser, Find Column on Form, Generate Table Class, Record Payload. An OData request composer was considered and dropped; the Web API query Dialect already exists on Generate Query and the Flow Dialects carry the OData emphasis.
4. **Generate Table Class** is a shortcut into the Code Generation Module (see `.scratch/code-generation/spec.md`) with the open page's Table selected and the starred table Template applied. It is blocked on that feature. Generate Choice Code Snippet becomes the same kind of shortcut.

## Column Browser

Dialog for the open page's Table. Search box matches display, logical, and schema name. Rows show display name, logical name, schema name, type, required level, and the type-specific extra: max length, precision, lookup targets, or choice name. Per-row copy menu: logical name, schema name, display name, and (later, flow-dialects) the Flow reference. Row action "Find on form" hands off to Find Column on Form when the column is on the open form. Current Table only; cross-table browsing is Investigate's job.

## Find Column on Form

Dialog with a logical-name input and autocomplete from the form's attributes. On match the page scrolls to the control, opens its tab and section when collapsed, and flashes an outline for a few seconds. The dialog shows tab, section, control type, visible, required level, disabled, and the current value. When the control is hidden, a "Show" button makes it visible for the session (the surgical version of Admin Mode). When the column exists on the Table but not on the form, say so.

## Record Payload

Dialog showing a JSON body for the open Record in the Web API Dialect: valid-for-create columns with a value; lookups as `"column@odata.bind": "/entityset(guid)"`; choices as integers; money as the number; dates as ISO strings; nulls omitted; read-only and system columns excluded. A Create / Update toggle: Create omits the primary id; Update keeps only columns valid for update. Copy. Deliberately the raw Web API shape so it drops into Postman or a test unchanged.

## Verification

Column Browser and Record Payload render from metadata and record values and are verifiable in the harness with stubbed commands. Find Column on Form is Xrm-only: stub it in the harness for layout, and test it live in a real org.

## Out of scope (v1)

Environment connection, cross-table browsing, editing values from the Column Browser, a raw Web API request composer.

## Acceptance

- Developer Area shows eight Utilities in the same grid density as Admin.
- Column Browser finds `new_customfield` by typing "custom" and copies its schema name.
- Find Column on Form on a hidden control shows it and scrolls to it.
- Record Payload for an Account with a parent account yields a body that creates a valid copy through the Web API.
- Every new page command has a harness stub.
