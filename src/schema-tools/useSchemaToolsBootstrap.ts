import { useEffect, useState } from "react";

import { ensurePageBridge } from "@/messaging/client";
import { type useSchemaGateway } from "@/modules/schema/hooks";
import { type ConnectionTarget } from "@/shared/connections";
import { schemaToolsLaunchItem } from "@/shared/storage";
import { useSessionStore } from "@/shared/stores";
import { type SchemaToolsLaunch } from "@/shared/types";

export type SchemaGateway = ReturnType<typeof useSchemaGateway>;

export type SchemaBootstrapStatus = { kind: "loading" } | { kind: "missing"; reason: string } | { kind: "ready"; launch: SchemaToolsLaunch };

export const useSchemaToolsBootstrap = () => {
	const [status, setStatus] = useState<SchemaBootstrapStatus>({ kind: "loading" });
	const setTab = useSessionStore((state) => state.setTab);
	const setBridgeStatus = useSessionStore((state) => state.setBridgeStatus);

	useEffect(() => {
		let active = true;
		const run = async () => {
			const launch = await schemaToolsLaunchItem.getValue().catch(() => null);
			if (!active) {
				return;
			}
			if (!launch) {
				setStatus({ kind: "missing", reason: "Open this from the Schema area in Power Tools." });
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

export const connectionFor = (launch: SchemaToolsLaunch): ConnectionTarget =>
	launch.environmentId ? { kind: "environment", environmentId: launch.environmentId } : { kind: "page" };
