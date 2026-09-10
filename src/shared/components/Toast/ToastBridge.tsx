import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAppToast } from "./useAppToast";

export const ToastBridge = () => {
	const queryClient = useQueryClient();
	const toast = useAppToast();
	useEffect(
		() =>
			queryClient.getMutationCache().subscribe((event) => {
				if (event.type === "updated" && event.action.type === "error" && !event.mutation.meta?.silent) {
					toast.error("Action failed", event.action.error);
				}
			}),
		[queryClient, toast]
	);
	return null;
};
