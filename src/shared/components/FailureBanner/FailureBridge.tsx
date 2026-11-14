import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useBanner } from "./useBanner";

/**
 * Every mutation failure that the call site does not report itself (`meta: { silent: true }`)
 * becomes one banner. It used to raise a toast, which vanished before the user could read it.
 */
export const FailureBridge = () => {
	const queryClient = useQueryClient();
	const banner = useBanner();
	useEffect(
		() =>
			queryClient.getMutationCache().subscribe((event) => {
				if (event.type === "updated" && event.action.type === "error" && !event.mutation.meta?.silent) {
					banner.show("Action failed", event.action.error);
				}
			}),
		[queryClient, banner]
	);
	return null;
};
