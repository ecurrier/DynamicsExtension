# Package data layer, Gateway, and harness fixtures

Status: resolved
Type: task

See `../spec.md`, "Packages Area" and decision 7.

- Types in `src/shared/types/pluginPackages.ts`: `PluginPackage`, `PackageAssembly`, `PackageType`, `PluginPackageUpdate`, `PluginPackageUpdateResult`, `PLUGIN_PACKAGE_COMPONENT_NAME`.
- `pluginPackageOperations(http)` in `src/shared/lib/dataverse/pluginPackages.ts` with `list`, `get`, `update`, `getLayers`, and the pure `composePluginPackages`; tests against `createFakeHttp`.
- Contract entries `pluginPackages.list|get|update|getLayers`, `STALE_TIMES`, `COMMAND_TIMEOUTS` (update 180 s), page handler `src/page/handlers/pluginPackages.ts`, and `usePluginPackagesGateway`.
- Harness: three package fixtures with layers, `packageId` on the assembly fixtures, `_plugintypeid_value` on step records, fetch routes for `pluginpackages`, `plugintypes`, `msdyn_componentlayers` (PluginPackage), a PATCH branch that bumps `modifiedon`, and `pluginPackages.*` command stubs.

Blocked by: 01
