import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";

import { permissionKeys } from "@/messaging/client";
import { ensureHostAccess, hasHostAccess } from "@/shared/extension";

const patternFor = (origin: string): string => `${origin}/*`;

export const useHostAccess = (origin: string | null) => {
	const queryClient = useQueryClient();
	const [requesting, setRequesting] = useState(false);
	const query = useQuery({
		queryKey: permissionKeys.host(origin),
		queryFn: () => hasHostAccess([patternFor(origin ?? "")]),
		enabled: origin !== null,
		staleTime: Infinity,
		retry: false,
	});

	useEffect(() => {
		const invalidate = () => void queryClient.invalidateQueries({ queryKey: permissionKeys.all });
		browser.permissions.onAdded.addListener(invalidate);
		browser.permissions.onRemoved.addListener(invalidate);
		return () => {
			browser.permissions.onAdded.removeListener(invalidate);
			browser.permissions.onRemoved.removeListener(invalidate);
		};
	}, [queryClient]);

	const request = useCallback(async (): Promise<boolean> => {
		if (origin === null) {
			return false;
		}
		setRequesting(true);
		try {
			const granted = await ensureHostAccess([patternFor(origin)]);
			queryClient.setQueryData(permissionKeys.host(origin), granted);
			return granted;
		} finally {
			setRequesting(false);
		}
	}, [origin, queryClient]);

	return { granted: query.data, request, requesting };
};
