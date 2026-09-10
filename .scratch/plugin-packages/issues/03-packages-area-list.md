# Packages Area list

Status: resolved
Type: task

See `../spec.md`, "Packages Area" and decision 4.

- `usePluginsConnection` extracts the Connection switch from the Steps Area so both Areas share it; store gains `packagesFilter` and `packagesOpenItems`.
- Pure helpers in `src/modules/plugins/lib/packages.ts` (`packageMatches`, `packageTypeRows`, `packageCounts`, `describeCounts`, `formatFileSize`, `formatTimestamp`, `fileNameMatchesPackage`, `isPackageFileName`, `describeUpdate`) with tests.
- `PackagesArea` with ConnectionPicker, search, reload, a sticky label row, and a `FillAccordion` of `PackageRow`s; `PackageRow` keeps the Update button beside the `AccordionHeader` and renders a `DataTable` of Plug-in Types in the panel.
- Harness: list renders three packages with counts; expanding shows the types table.

Blocked by: 01, 02
