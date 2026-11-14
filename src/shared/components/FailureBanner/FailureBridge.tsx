import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useBanner } from "./useBanner";

/**
 * Every mutation failure becomes one banner. A mutation names its own banner with
 * `meta: { failureTitle }`, and opts out altogether with `meta: { silent: true }` when it reports
 * the failure some other way. It used to raise a toast, which vanished before the user could read it.
 */
export const FailureBridge = () => {
	const queryClient = useQueryClient();
	const banner = useBanner();
	useEffect(
		() =>
			queryClient.getMutationCache().subscribe((event) => {
				if (event.type === "updated" && event.action.type === "error" && !event.mutation.meta?.silent) {
					const title = event.mutation.meta?.failureTitle;
					banner.show(typeof title === "string" ? title : "Action failed", event.action.error);
				}
			}),
		[queryClient, banner]
	);
	return null;
};
