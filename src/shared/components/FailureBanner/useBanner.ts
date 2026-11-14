import { useMemo } from "react";

import { describeError } from "@/shared/lib";
import { useBannerStore } from "@/shared/stores";

/**
 * Raises a failure the user must act on. Validation belongs at the field, a success belongs in a
 * toast; this is for the rest.
 */
export const useBanner = () => {
	const showBanner = useBannerStore((state) => state.showBanner);
	const clearBanner = useBannerStore((state) => state.clearBanner);
	return useMemo(
		() => ({
			show: (title: string, error?: unknown) => showBanner(title, error === undefined ? undefined : describeError(error)),
			clear: clearBanner,
		}),
		[showBanner, clearBanner]
	);
};
