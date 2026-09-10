# Active-layer check and polish

Status: resolved
Type: task

See `../spec.md`, decision 5 and decision 6.

- `usePackageLayers` wraps `pluginPackages.getLayers`; `PackageLayerBadge` and `PackageLayersLine` render the Active-layer badge and the layer stack once a row is open.
- The dialog shows the Active-layer warning and invalidates the layers query after an update, since updating a managed package creates that layer.
- Accordion header buttons carry an accessible name; the panel table uses fixed widths so it does not overflow its scroller.
- Harness: Contoso.Plugins shows the Active-layer badge and both warnings; Fabrikam.Integration shows neither.

Blocked by: 04
