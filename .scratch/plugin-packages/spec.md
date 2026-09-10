# Plug-in Packages

Status: ready-for-agent
Decided: 2026-09-09 (grilling session)

## Problem

Every plug-in build ends with the same chore: open the Plugin Registration Tool, find the package, browse to the nupkg, upload. The extension already lists and toggles Plug-in Steps but knows nothing about the Packages those steps run from, and Plug-in Steps and Plug-in Traces sit in two Modules for one subject. A full registration tool rebuilt inside the extension was considered during the same session and dropped on purpose: it is a large undertaking, and registering anything new is more comfortably left to the official tool. What remains is a Utility-sized Area that updates an existing Package from a freshly built nupkg, the browser equivalent of `pac plugin push --type Nuget`.

## Vocabulary

Terms from `CONTEXT.md`: Module, Area, Connection, Gateway, Package, Assembly, Plug-in Type, Plug-in Step, Solution Layer.

## Decisions

1. **One Plug-ins Module.** Plugin Steps and Plugin Traces merge into a `Plug-ins` Module at the Traces slot (order 9) with three Areas: Steps, Packages, Traces. Labels use the "plug-in" spelling. Traces stays page-only; Steps and Packages share one Connection.
2. **Update only.** The Packages Area lists registered Packages and replaces the content of an existing one from a local `.nupkg`. Registering new packages, classic `.dll` assemblies, steps, images, and deleting anything stay out of scope. The Area is named Packages rather than Registration because it cannot register anything.
3. **Both Connections.** The page Connection and Environment Connections through the `pluginPackages` Gateway; a System Customizer Service Principal is enough.
4. **Layout.** ConnectionPicker, a search box, and a list of Packages as expandable rows: name with Managed and Active-layer badges, version, modified on and by, counts of assemblies, types, and steps, and an Update button. The expanded row lists Assemblies and Plug-in Types with the number of steps registered on each, plus the Solution Layer stack. The Update button sits beside the accordion header rather than inside it because Fluent renders the header as a button.
5. **Three goodies.** An Active-layer check that warns before uploading over a managed Package that already has an unmanaged layer; drag and drop of the nupkg onto the row or the dialog; and a remembered file location, so the next build is one click. Dropped: reading the nuspec before upload (the server rejects a mismatched id anyway), a post-update type diff (the server rejects an update that removes a type with steps), and multi-package updates.
6. **Safety.** The dialog is the confirmation; there is no extra prompt and no new setting. Managed packages warn and allow. The server's error text shows verbatim inside the dialog, and the row only changes after a refetch confirms the new modified time.
7. **Layers through the packages Gateway.** Solution layers are read by wrapping the existing `getSolutionLayers` operation with `solutionComponentName = "PluginPackage"` inside the `pluginPackages` namespace rather than borrowing the Investigate Gateway, which would create an import cycle between the two Modules.

## Packages Area

`plugins.packages`. The list comes from four Web API queries composed client-side: packages (with the modified-by name through the formatted-value annotation), assemblies with their package lookup, plug-in types with their assembly lookup, and a light step query for counts. Assemblies without a package are ignored. Layers load lazily when a row is expanded or its dialog opens. Filtering matches package, assembly, and type names and opens every matching row. Empty and error states follow the Steps Area.

## Update dialog

Opened from the row's Update button or by dropping a file on the row. Shows the package facts, a managed warning, an Active-layer warning when the layers query says so, a drop zone, a Choose file button, and an Update again from button when a file handle was remembered for this package and environment. The preflight line shows the file name, size, and build time next to the package's modified time, and an info note when the file name does not look like the package id. Confirming encodes the file to base64, sends `PATCH pluginpackages(id)` with a body of only `content`, refetches the package, invalidates the list and layers, toasts the new modified time (and the version only when it changed), and closes.

## File handling

The picker uses the File System Access API with a fixed picker id so Chrome remembers the last directory, and falls back to a hidden file input elsewhere. File handles from the picker or from a drop are stored in IndexedDB keyed by environment origin and package id, because handles are not serialisable into extension storage. Reusing a handle asks for read permission from the button click, which carries the user activation the browser requires.

## Verification

Unit tests cover package composition, the operations against a fake HTTP, base64 encoding, and the view-model helpers. The harness seeds three packages (a managed one with an Active layer, a managed one without, an unmanaged one), serves the environment-connection routes including layers, and answers PATCH by bumping the modified time. A real org is needed for the PATCH itself, for whether the server's version follows the nuspec after an update, for the payload size limit of the page Connection with a multi-megabyte nupkg, and for the remembered-file flow.

## Out of scope (v1)

Registering new packages or assemblies, classic `.dll` assemblies, registering or editing steps and images, deleting packages, reading the nuspec before upload, comparing types before and after an update, updating several packages at once, choosing a solution.

## Acceptance

- The navigation shows a Plug-ins Module with Steps, Packages, and Traces, and Table Automation's row click still lands on Steps with the step focused.
- Packages lists every registered package with version, modified on and by, and expands to its plug-in types with step counts.
- Dropping `Contoso.Plugins.1.4.1.nupkg` on the Contoso.Plugins row and confirming sends a PATCH whose body is only `content`, and the row shows the new modified time.
- A managed package with an Active layer shows the badge in the list and both warnings in the dialog before upload.
- Choosing a file through the picker remembers it, and reopening the dialog offers to update again from that file.
- Every new page command has a harness stub.
