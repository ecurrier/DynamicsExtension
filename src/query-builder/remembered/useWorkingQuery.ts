import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { workingQueryItem } from "@/shared/storage";

export const WORKING_QUERY_DELAY_MS = 500;

const OPENED_KEY = ["queryBuilder", "openedWorkingQuery"] as const;

export const useWorkingQuery = () => {
	const opened = useQuery({
		queryKey: OPENED_KEY,
		queryFn: () => workingQueryItem.getValue(),
		staleTime: Infinity,
		gcTime: 0,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pending = useRef<string | null>(null);

	const flush = useCallback(() => {
		if (timer.current !== null) {
			clearTimeout(timer.current);
			timer.current = null;
		}
		const fetchXml = pending.current;
		pending.current = null;
		return fetchXml === null ? Promise.resolve() : workingQueryItem.setValue({ fetchXml, writtenAt: Date.now() });
	}, []);

	const write = useCallback(
		(fetchXml: string) => {
			pending.current = fetchXml;
			if (timer.current !== null) {
				clearTimeout(timer.current);
			}
			timer.current = setTimeout(() => void flush(), WORKING_QUERY_DELAY_MS);
		},
		[flush]
	);

	useEffect(() => () => void flush(), [flush]);

	return {
		opened: opened.data ?? null,
		isLoading: opened.isLoading,
		write,
		flush,
	};
};
