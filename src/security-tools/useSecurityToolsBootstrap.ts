import { useEffect, useState } from "react";

import { ensurePageBridge } from "@/messaging/client";
import { type useSecurityGateway } from "@/modules/security/hooks";
import { type ConnectionTarget } from "@/shared/connections";
import { securityToolsLaunchItem } from "@/shared/storage";
import { useSessionStore } from "@/shared/stores";
import { type SecurityToolsLaunch } from "@/shared/types";

export type SecurityToolsGateway = ReturnType<typeof useSecurityGateway>;

export type BootstrapStatus = { kind: "loading" } | { kind: "missing"; reason: string } | { kind: "ready"; launch: SecurityToolsLaunch };

export const useSecurityToolsBootstrap = () => {
	const [status, setStatus] = useState<BootstrapStatus>({ kind: "loading" });
	const setTab = useSessionStore((state) => state.setTab);
	const setBridgeStatus = useSessionStore((state) => state.setBridgeStatus);

	useEffect(() => {
		let active = true;
		const run = async () => {
			const launch = await securityToolsLaunchItem.getValue().catch(() => null);
			if (!active) {
				return;
			}
			if (!launch) {
				setStatus({ kind: "missing", reason: "Open this from the Security area in Power Tools." });
				return;
			}
			if (launch.tabId === null) {
				setStatus({ kind: "ready", launch });
				return;
			}
			try {
				await ensurePageBridge(launch.tabId);
				if (!active) {
					return;
				}
				setTab(launch.tabId, null);
				setBridgeStatus("ready");
			} catch {
				if (active) {
					setBridgeStatus("unavailable");
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

export const connectionFor = (launch: SecurityToolsLaunch): ConnectionTarget =>
	launch.environmentId ? { kind: "environment", environmentId: launch.environmentId } : { kind: "page" };
