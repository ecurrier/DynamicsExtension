# Validation to the field, failures to the banner

Status: resolved
Type: task

See `../spec.md`, decisions 10, 11 and 12, and the Messages table.

Of 99 toast call sites, 17 are validation guards raised through `toast.error` and 31 are real failures. Both are in the wrong place. A red toast 292px wide in the top right corner is not where the user is looking when a form field is empty, and a failure that needs an action should not vanish after 6 seconds.

- Move the 17 validation guards to the Fluent `Field validationMessage` of the control they are about. The heaviest files are `FormPresetsArea` (5), `TemplatesArea` (5), `EnvironmentsArea` (3) and `ServicePrincipalsArea` (3). Fluent sets `role="alert"` on the message itself.
- Add a banner store feeding the `AppShell` `banner` slot, which is already wired: one banner at a time, newest wins, a close button, cleared when the area changes.
- Fluent's `MessageBar` renders `role="group"`, not a live region, so put `role="alert"` on the banner wrapper. One line, and it makes the failure announce.
- Point `ToastBridge` at the banner instead of the toaster. Audit the five mutations carrying `meta: { silent: true }` and every call site with its own `onError` toast, so one failure produces exactly one message.
- A partial failure — "2 steps enabled, 1 failed", "5 of 20 failed" — opens the run's result view where one exists (`BulkRunResultView`, the Data Transporter run step). Where none exists it goes to the banner.
- The 8 plain notices ("Results truncated", "Run cancelled", "No users matched that search") stay as toasts.
- `LoadingOverlay` is defined, exported and never rendered anywhere. Either use it for the blocking cases or delete it; do not leave it.

Blocked by: 03

## Answer

- `useBannerStore` (unit tested) holds one banner: newest wins, each one gets a new id so the same message announces again, and `navigate`, `openWorkspace` and `closeWorkspace` clear it. A banner that follows the user is only a slower toast.
- `FailureBanner` renders it with `role="alert"` on the wrapper, because Fluent's `MessageBar` is `role="group"` and announces nothing. `useBanner().show(title, error)` is the call site API.
- `ToastBridge` is now `FailureBridge`, in `shared/components/FailureBanner`. It feeds the banner, not the toaster.
- The `AppShell` banner slot shows, in order: tab recovery, then a failure, then host access. Tab recovery comes first because it is the cause of everything else that is failing.
- The five Workspaces render `<FailureBanner />` in their own layout. They run under `AppProviders` but not under `AppShell`, so without this a failure raised in a Workspace would be silent.
- All 17 validation guards now set a Fluent `Field validationMessage`. `useFieldProblem` (unit tested through `fieldMessage`) holds one problem at a time and gives the message to the field it is about. The preset, template, environment and service principal dropdowns gained a `Field` wrapper; the form XML editor did too.
- The 8 call sites that raised their own `toast.error` next to a non-silent mutation now carry `meta: { silent: true }` and raise one banner, so a failure is reported once.
- `useAsyncAction` raises a banner, which moves about 20 "Could not ..." failures at one stroke.
- Partial failures: the Data Transporter run shows a `MessageBar` above its results table, which names the count and points at the rows; `BulkRunDialog` already opens `BulkRunResultView`. The Plug-in Steps bulk toggle has no result view, so it goes to the banner.
- Four `toast.error` calls stay, on purpose: three copy failures and the host access refusal. A copy failure is a one-press retry, and two of them are raised from inside a dialog that covers the banner. The host access refusal must leave the "Grant access" banner on screen, which a failure banner in the same slot would replace.
- `LoadingOverlay` was dead code and is deleted. `LoadingBar` already reports the busy state.
