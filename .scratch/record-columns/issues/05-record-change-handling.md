# Drafts when the Record changes

Status: resolved
Type: task

See `../spec.md`, decision 14.

- When the tab moves to a different Record, reload the list for it and drop every Draft, with a notice naming how many were dropped.
- When the Record's values change on the server (the form was saved, or Reload), re-read values: drop Drafts that now equal the new value and keep the rest, re-validated against the new value.
- Detect both on the Area regaining focus and on Reload; there is no need to poll.

Blocked by: 04
