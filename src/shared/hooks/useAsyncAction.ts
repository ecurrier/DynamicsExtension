import { useCallback, useState } from "react";

import { useBanner } from "@/shared/components";

export const useAsyncAction = (failureTitle = "Action failed") => {
	const banner = useBanner();
	const [running, setRunning] = useState(false);
	const run = useCallback(
		async (action: () => Promise<void>) => {
			setRunning(true);
			try {
				await action();
			} catch (error) {
				banner.show(failureTitle, error);
			} finally {
				setRunning(false);
			}
		},
		[failureTitle, banner]
	);
	return { running, run };
};
