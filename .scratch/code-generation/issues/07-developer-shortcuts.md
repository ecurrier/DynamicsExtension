# Developer shortcuts into Generate

Status: resolved
Type: task

- Add the `Generate Table Class` Utility card to the Developer Area: reads `utilities.getPageTarget`, then navigates to `codegen.generate` pre-filled with the Table and the starred table Template so output shows immediately.
- Re-point `Generate Choice Code Snippet` the same way (kind Choice, the page's Table pre-selected, its local and the global choices listed). Delete `ChoiceCodeDialog` and the hard-coded generator once the built-in Templates cover its output (issue 04's comparison test).
- Keep the `utilities.getChoiceMetadata` command only if the Generate Area still needs it after issue 03; otherwise remove it and its harness stub.
- Update the Developer Area tooltip and README module list.

Blocked by: 06, and developer-utilities/04 for the final card layout
