# Polymorphic Lookups Rework

Status: resolved
Type: task

See `../spec.md`, "Polymorphic Lookups". Supersedes the create-only decision in `../../schema-bulk-edit/issues/04-polymorphic-lookup-workspace.md`.

- Implement target management against whatever the research establishes. If some part genuinely cannot be done over the Web API, say so in the UI in terms of the platform, naming the message that is missing. Never reference `.scratch` paths or repository internals in user-facing text; that leaked in the first version and reads as unfinished.
- Replace the typed table name with a picker over `investigate.listTables`.
- Replace the typed publisher prefix with a solution picker, taking the prefix from the chosen solution's publisher, and show the resulting schema name read-only beside the name field rather than making the user assemble it.
- Replace the comma-separated target list with `MultiSelectPicker` from `03` over all tables.
- Keep the create path, now fed by the pickers.

Blocked by: 03

## Comments

**The owner was right and I was wrong.** Managing targets is possible, and researching the tool they named turned up two outright bugs in the create path I had already shipped.

The first: `CreatePolymorphicLookupAttribute` requires the lookup to be typed `Microsoft.Dynamics.CRM.ComplexLookupAttributeMetadata`. I had sent `LookupAttributeMetadata`, which is the type the *add-target* call wants. Getting these the wrong way round is the likeliest way for either call to fail.

The second: that message takes the solution as a `SolutionUniqueName` **body parameter**, not the `MSCRM.SolutionUniqueName` header. I had sent the header, so the solution would have been ignored and the column would have landed in the environment default. Adding a target is the opposite, header not body. Both are now pinned by tests that say so in their names.

Adding a target is `POST RelationshipDefinitions` with an ordinary one-to-many whose `Lookup.SchemaName` matches the existing column; that match is what attaches it rather than creating a new attribute. There is no `CreateOneToMany` action, which is what I had guessed at. Removing is `DELETE RelationshipDefinitions(<MetadataId>)`.

Guards taken from the reference tool: a relationship schema name is truncated at 100 characters, and the last target cannot be removed. The removal confirmation states the data impact plainly.

Still genuinely unknown, and stated as such rather than papered over: what happens to records already pointing at a removed table. Microsoft does not document it and the reference tool does not address it. The confirmation says the stored id survives but stops resolving, which is the mechanical expectation, not a verified fact. Worth testing in a sandbox before anyone uses removal in anger.

Verified in the harness: the table is a dropdown over `investigate.listTables`, the publisher prefix comes from the chosen solution and the resulting schema name is shown read-only, targets are a searchable multi-select, and selecting a lookup lists its targets with working add and remove. No repository paths appear in any user-facing text.
