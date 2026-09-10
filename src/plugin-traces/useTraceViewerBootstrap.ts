import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

import { ensurePageBridge, invoke } from "@/messaging/client";
import { traceViewerLaunchItem } from "@/shared/storage";
import { useSessionStore } from "@/shared/stores";
import { type TraceViewerLaunch } from "@/shared/types";

export type ViewerStatus =
	{ kind: "loading" } | { kind: "missing" } | { kind: "lost"; launch: TraceViewerLaunch; reason: string } | { kind: "ready"; launch: TraceViewerLaunch };

const describe = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const useTraceViewerBootstrap = (): ViewerStatus => {
	const [status, setStatus] = useState<ViewerStatus>({ kind: "loading" });
	const setTab = useSessionStore((state) => state.setTab);
	const setBridgeStatus = useSessionStore((state) => state.setBridgeStatus);

	useEffect(() => {
		let cancelled = false;
		const connect = async () => {
			const launch = await traceViewerLaunchItem.getValue();
			if (!launch) {
				if (!cancelled) {
					setStatus({ kind: "missing" });
				}
				return;
			}
			try {
				await ensurePageBridge(launch.tabId);
				const context = await invoke(launch.tabId, "global.getPageContext", undefined);
				if (context !== "model-driven-app") {
					throw new Error("The source tab is no longer showing a model-driven app");
				}
				if (cancelled) {
					return;
				}
				setTab(launch.tabId, launch.orgOrigin);
				setBridgeStatus("ready");
				setStatus({ kind: "ready", launch });
			} catch (error) {
				if (!cancelled) {
					setBridgeStatus("unavailable");
					setStatus({ kind: "lost", launch, reason: describe(error) });
				}
			}
		};
		void connect();
		const onRemoved = (tabId: number) => {
			void traceViewerLaunchItem.getValue().then((launch) => {
				if (launch?.tabId === tabId) {
					setStatus({ kind: "lost", launch, reason: "The source tab was closed" });
				}
			});
		};
		browser.tabs.onRemoved.addListener(onRemoved);
		return () => {
			cancelled = true;
			browser.tabs.onRemoved.removeListener(onRemoved);
		};
	}, [setTab, setBridgeStatus]);

	return status;
};
