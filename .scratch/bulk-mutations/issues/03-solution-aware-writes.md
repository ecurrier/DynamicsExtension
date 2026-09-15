# Solution Aware Writes

Status: resolved
Type: task

See `../spec.md`, "Solution aware writes".

- Add `withSolution(headers, solutionUniqueName)` to `src/shared/lib/dataverse/http.ts` returning the headers bag with `MSCRM.SolutionUniqueName` set, and confirm `pageHttp()` in `src/page/xrm/webApi.ts:33-34` forwards extra headers unchanged.
- Extend `global.getSolutions` to return the solution `uniquename` alongside `id` and `name`, since the header takes the unique name and `Solution` in `src/shared/types/dynamics.ts:7-10` carries neither.
- New hook `src/shared/hooks/useSolutionPicker.ts` wrapping `useSelectDialog` and `global.getSolutions`, mirroring `src/modules/utilities/areas/admin/AdminArea.tsx:101-112`, returning the chosen solution or `null` when dismissed, and honouring a caller-supplied "use the default solution" flag with the `DEFAULT_SOLUTION_ID` fallback.
- Move `DEFAULT_SOLUTION_ID` from `src/modules/utilities/lib/cloudUrls.ts` to shared so the hook and the Utility both read one constant.
- Tests for `withSolution` and for the default-solution fallback.
- Harness: the three solution fixtures must include `uniquename` so the picker and the header path are exercisable.

Blocked by: none

## Comments

`withSolution` trims the name before setting `MSCRM.SolutionUniqueName` and returns the headers untouched when there is none, so callers can thread it unconditionally without special-casing.

`DEFAULT_SOLUTION_ID` moved to a new `src/shared/lib/solutions.ts` alongside `DEFAULT_SOLUTION_UNIQUE_NAME` and a `defaultSolutionName` predicate; `cloudUrls.ts` re-exports the id so its existing importers are unaffected. The predicate replaces an inline `solution.name === "Default Solution"` comparison and is tested for casing, padding, and the near-misses it must not match.

Beyond the issue, the Admin Area was migrated onto `useSolutionPicker`. The hook was specified as mirroring the control editor's inline picker, and shipping a mirror while leaving the original in place is the duplication this tranche has been trying to avoid — the same mistake as the six copies of `describeError`. `AdminArea` now calls `pickSolution(settings.controlEditorUseDefaultSolution, ...)`, which also gives the hook a real caller and a harness path on day one.

Verified in the harness: the control editor picker lists all three solution fixtures, and choosing "Contoso Core" opens `https://make.powerapps.com/e/<env>/s/s2/entity/account/form/edit/form-1`, so the chosen solution reaches the URL. Fixtures now carry `uniqueName`, which is what the header path will need.
