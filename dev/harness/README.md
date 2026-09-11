# Popup harness

Runs the built popup in a normal browser tab with the Chrome extension APIs replaced by an in-memory shim that answers every page command with sample Dataverse data. Useful for checking layout and flows without loading the extension or opening a Dynamics org.

```bash
npm run build
npm run harness
npx serve -l 5173 .output/chrome-mv3
```

Then open `http://localhost:5173/harness.html` (popup), `http://localhost:5173/harness-results.html` (results viewer), or `http://localhost:5173/harness-traces.html` (plugin trace viewer, seeded with a fake launch from tab 1).

`chrome-shim.js` seeds storage directly at the current schema version (environments, a service principal, a form preset, and a user code Template starred as the table default), so the migrations are covered by unit tests rather than by the harness.

Site access starts out ungranted so the "Allow access" banners render; add `?granted=1` to pre-grant it, and open `harness?mode=window&tabId=1` (without `.html`, because `serve` drops the query string when it redirects to the clean URL) to see the popup as a pinned window.

In the pinned-window harness the Data Transporter, Trace Viewer, and Open in viewer buttons become split buttons: the primary action fills the harness window with the Workspace and the menu still opens it in a new tab. `chrome.windows.getCurrent` reports the browser tab as a normal-state window, so the grow-to-fit call logs through `windows.update` without resizing anything.

The Code Generation module is backed by `codegen.getTableModel` (a sample table with a money column, a DateOnly date, a multi-select choice, a two-target owner lookup, a helper column, and a bookkeeping column, so the type map and system-column toggle are visible) and `codegen.getGlobalChoices`. The seeded user Template "Contoso model" wraps the built-in C# class in a namespace so Generate Table Class shows a customised default.

The Plug-ins module's Packages area is backed by three package fixtures: "Contoso.Plugins" (managed, with an Active layer on top of its solution), "Fabrikam.Integration" (managed, no unmanaged layer), and "Contoso.Workflows" (unmanaged). The `pluginPackages.*` command stubs answer the page connection and the fake `fetch` serves `pluginpackages`, `plugintypes`, and `msdyn_componentlayers` for the environment connection. A `PATCH pluginpackages(...)` logs the upload length and bumps the package's modified time without touching its version, mirroring what the real API is documented to do; the "Update again from" button needs a real file picked through the browser, so it is exercised manually.

The Admin Area's Dirty Columns card is backed by `utilities.getDirtyColumns`, which returns four sample changes on the account form: a renamed Account Name, a hidden Main Phone, a read-only Onboarding Status whose submit mode is `never`, and a Credit Limit with no control on the form. Selecting a row goes through the `utilities.revealFormColumn` stub, which only logs; the real scroll and flash need an org.
