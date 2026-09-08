# Generate Area

Status: resolved
Type: task

- Area `codegen.generate`: kind switch (Table / Choice); Table picker with search using `investigate.listTables`, defaulting to the open page's Table; Choice picker listing global choices and the selected Table's local choices; Template picker filtered by kind, preselecting the starred default; settings inputs prefilled from the Template's defaults; "Show system columns" toggle (Table kind); output in a `CodeBlock` with Copy and Save file (filename from the pattern, via an `a[download]` blob link, which extension pages allow).
- Generation runs synchronously in the popup from the fetched metadata; show the loading bar while metadata loads.
- Pre-fill support: the Area reads an optional launch state from the navigation store (`tableLogicalName`, `kind`, `choiceName`) set by the Developer shortcuts (issue 07), and clears it on navigation.
- Harness: verify against the sample Table with both built-in table Templates.

Blocked by: 05
