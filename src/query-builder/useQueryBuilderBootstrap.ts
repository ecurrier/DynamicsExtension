import { useEffect, useState } from "react";

import { ensurePageBridge } from "@/messaging/client";
import { type ConnectionTarget } from "@/shared/connections";
import { queryBuilderLaunchItem } from "@/shared/storage";
import { useSessionStore } from "@/shared/stores";
import { type QueryBuilderLaunch } from "@/shared/types";

export type QueryBuilderBootstrapStatus = { kind: "loading" } | { kind: "missing"; reason: string } | { kind: "ready"; launch: QueryBuilderLaunch };

export const useQueryBuilderBootstrap = () => {
	const [status, setStatus] = useState<QueryBuilderBootstrapStatus>({ kind: "loading" });
	const setTab = useSessionStore((state) => state.setTab);
	const setBridgeStatus = useSessionStore((state) => state.setBridgeStatus);

	useEffect(() => {
		let active = true;
		const run = async () => {
			const launch = await queryBuilderLaunchItem.getValue().catch(() => null);
			if (!active) {
				return;
			}
			if (!launch) {
				setStatus({ kind: "missing", reason: "Open this from Query Builder in the Power Tools navigation." });
				return;
			}
			if (launch.tabId !== null) {
				try {
					await ensurePageBridge(launch.tabId);
					if (active) {
						setTab(launch.tabId, null);
						setBridgeStatus("ready");
					}
				} catch {
					if (active) {
						setBridgeStatus("unavailable");
					}
				}
			}
			if (active) {
				setStatus({ kind: "ready", launch });
			}
		};
		void run();
		return () => {
			active = false;
		};
	}, [setBridgeStatus, setTab]);

	return status;
};

export const connectionFor = (launch: QueryBuilderLaunch): ConnectionTarget =>
	launch.environmentId ? { kind: "environment", environmentId: launch.environmentId } : { kind: "page" };
