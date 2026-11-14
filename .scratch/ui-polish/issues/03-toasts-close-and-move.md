# Toasts get a close button and move out of the way

Status: ready-for-agent
Type: task

See `../spec.md`, decision 9.

The single `Toaster` sits at `position="top-end"`, which Fluent renders 16px from the top right corner — directly over the title, toolbar and search box of every Area. No toast has a close button: `useAppToast` renders only `ToastTitle` and `ToastBody`, and Fluent's `ToastContainer` offers no click-to-dismiss and no swipe, so a mouse user can only wait. The stack has no limit.

- Move the `Toaster` in `AppProviders` to `position="bottom-end"` and set `limit={3}`.
- Render a `ToastTrigger` close button in `useAppToast`, on every intent.
- Keep `pauseOnHover` and the 3 second life for success and info. The 6 second error life goes away with issue 04, which takes errors off the toaster.
- `RecordColumnsArea` pins a save bar to the bottom of the Area. Check in the harness that a bottom-right toast does not cover it; offset the toaster or move the save bar's own actions if it does.
- Verify in the harness popup at 700px and the side panel at 400px.
