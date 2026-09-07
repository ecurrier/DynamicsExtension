# Popup harness

Runs the built popup in a normal browser tab with the Chrome extension APIs replaced by an in-memory shim that answers every page command with sample Dataverse data. Useful for checking layout and flows without loading the extension or opening a Dynamics org.

```bash
npm run build
npm run harness
npx serve -l 5173 .output/chrome-mv3
```

Then open `http://localhost:5173/harness.html` (popup), `http://localhost:5173/harness-results.html` (results viewer), or `http://localhost:5173/harness-traces.html` (plugin trace viewer, seeded with a fake launch from tab 1).

`chrome-shim.js` seeds legacy-format storage keys so the one-time migration runs on first load.

Site access starts out ungranted so the "Allow access" banners render; add `?granted=1` to pre-grant it, and open `harness?mode=window&tabId=1` (without `.html`, because `serve` drops the query string when it redirects to the clean URL) to see the popup as a pinned window.
