import { useCallback, useState } from "react";

import { useAppToast } from "@/shared/components";

export const useAsyncAction = (failureTitle = "Action failed") => {
	const toast = useAppToast();
	const [running, setRunning] = useState(false);
	const run = useCallback(
		async (action: () => Promise<void>) => {
			setRunning(true);
			try {
				await action();
			} catch (error) {
				toast.error(failureTitle, error);
			} finally {
				setRunning(false);
			}
		},
		[failureTitle, toast]
	);
	return { running, run };
};
