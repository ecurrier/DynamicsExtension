import { useEffect, useState } from "react";
import { browser } from "wxt/browser";

import { ensurePageBridge, invoke } from "@/messaging/client";
import { transporterLaunchItem } from "@/shared/storage";
import { useSessionStore } from "@/shared/stores";
import { type TransporterLaunch } from "@/shared/types";

export type TransporterStatus = { kind: "loading" } | { kind: "ready"; launch: TransporterLaunch; pageAvailable: boolean };

const emptyLaunch = (): TransporterLaunch => ({
	tabId: null,
	orgOrigin: null,
	environmentName: null,
	launchedAt: new Date().toISOString(),
});

export const useTransporterBootstrap = (): TransporterStatus => {
	const [status, setStatus] = useState<TransporterStatus>({ kind: "loading" });
	const setTab = useSessionStore((state) => state.setTab);
	const setBridgeStatus = useSessionStore((state) => state.setBridgeStatus);

	useEffect(() => {
		let cancelled = false;
		const connect = async () => {
			const launch = (await transporterLaunchItem.getValue()) ?? emptyLaunch();
			let pageAvailable = false;
			if (launch.tabId !== null) {
				try {
					await ensurePageBridge(launch.tabId);
					const context = await invoke(launch.tabId, "global.getPageContext", undefined);
					pageAvailable = context === "model-driven-app";
				} catch {
					pageAvailable = false;
				}
			}
			if (cancelled) {
				return;
			}
			if (pageAvailable && launch.tabId !== null) {
				setTab(launch.tabId, launch.orgOrigin);
				setBridgeStatus("ready");
			} else {
				setBridgeStatus("unavailable");
			}
			setStatus({ kind: "ready", launch, pageAvailable });
		};
		void connect();
		const onRemoved = (tabId: number) => {
			setStatus((current) => (current.kind === "ready" && current.launch.tabId === tabId ? { ...current, pageAvailable: false } : current));
			if (useSessionStore.getState().tabId === tabId) {
				setBridgeStatus("unavailable");
			}
		};
		browser.tabs.onRemoved.addListener(onRemoved);
		return () => {
			cancelled = true;
			browser.tabs.onRemoved.removeListener(onRemoved);
		};
	}, [setTab, setBridgeStatus]);

	return status;
};
