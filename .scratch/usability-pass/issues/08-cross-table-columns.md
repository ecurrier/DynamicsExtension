# Cross-Table Columns Polish

Status: resolved
Type: task

See `../spec.md`, "Cross-Table Columns" and decision 6.

- Add an explanation at the top: what the tool does, and the case it is for, which is a column repeated across tables whose label, description or requirement level have drifted apart.
- Replace the "Managed" cell text with a plain `ValueChip` reading Managed or Unmanaged. Drop "Managed, editable"; the locked reason already appears for columns that cannot be edited.
- Raise the table height so the Workspace is used.
- Extend the editable properties beyond label, description and requirement level: `MaxLength` for String, `MinValue` and `MaxValue` for Integer, Decimal, Double, Money and BigInt, and `Precision` for Decimal, Double and Money.
- Show only the controls the selected rows can accept. Derive that from the selection: when the selected rows are all one `AttributeType`, show that type's controls; when they are mixed, show only the three common properties and say why.
- Extend `UpdateAttributeRequest` and the write with the new properties, sending only what was supplied, and extend `columnEditPlan` so a property the selection cannot accept is never planned.
- Pure helpers with tests in `src/modules/schema/lib/attributeProperties.ts`: `editablePropertiesFor(types)` returning the property set for a selection, and `describeEdit` for the preview text.

Blocked by: 02

## Comments

The explanation leads with the case rather than the mechanism: the same column copied across tables whose labels and requirement levels have drifted apart.

Managed state is now a plain chip reading Managed or Unmanaged. The locked reason stays in its own column, so the fact and the consequence are separate.

The type-dependent properties turned out better than specified. Falling back to the three common properties whenever types differ is over-restrictive: String and Memo both accept a maximum length, so `editablePropertiesFor` intersects the per-type sets instead, and `mixedTypeReason` only speaks up when something was actually dropped, naming which properties and which types. `columnEditPlan` gates on the same set, so a maximum length can never be sent to a number even if the form somehow held a stale value.

Verified in the harness: selecting three String columns shows Maximum length; adding the Memo column keeps it, because both accept it; and the mixed-type note appears with the dropped property named when a String and an Integer are selected together.
