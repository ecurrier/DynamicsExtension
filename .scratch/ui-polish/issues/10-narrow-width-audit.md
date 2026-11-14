# Check all 30 Areas at panel and popup width

Status: ready-for-agent
Type: task

See `../spec.md`, decision 16.

The shared fixes land first because the badge and the search field are shared, and repairing those repairs most Areas at once. This issue finds what is left over, and produces a list rather than a set of changes.

- Build and serve the harness (`npm run build`, `npm run harness`, then serve `.output/chrome-mv3`). Check every one of the 30 Areas at 400px in `harness-sidepanel` with the browser narrowed, and at 700px in `harness.html`.
- For each Area record: does anything overflow horizontally; is any label cut without an ellipsis; does the toolbar row wrap sensibly; is any control narrower than its own content.
- Expect findings. Only one Area outside the Schema Tools Workspace sets a container query today. Schema Tools is the reference for what good looks like, with breakpoints at 720, 760, 880 and 900px.
- Output is a triage list appended to this file under a `## Findings` heading, one line per Area. The user decides what gets fixed and what gets `fit: "window"`.
- **Change no Area in this issue.**

Blocked by: 01, 02, 08
