import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";

import { ensurePageBridge, invoke, pageKeys } from "@/messaging/client";
import { DEFAULT_AREA, resolveArea } from "@/modules";
import { getActiveTab, getTabById, listOrgTabs, type PopupLaunch, readPopupLaunch } from "@/shared/extension";
import { isOrgUrl } from "@/shared/lib";
import { lastVisitedAreaItem, settingsItem } from "@/shared/storage";
import { useNavigationStore, useSessionStore } from "@/shared/stores";
import { type PageTarget } from "@/shared/types";

import { pageTargetChanged, type TabChoice, tabChoices } from "./lib";

interface TabSession {
	tabId: number;
	tabUrl: string | null;
	pageContext: string | null;
}

interface BoundTabHandlers {
	onLost: () => void;
	onReloaded: () => void;
	onNavigated: () => void;
}

const resolveInitialArea = async (): Promise<string> => {
	try {
		const settings = await settingsItem.getValue();
		if (!settings.openLastVisitedArea) {
			return DEFAULT_AREA;
		}
		return resolveArea(await lastVisitedAreaItem.getValue()).id;
	} catch {
		return DEFAULT_AREA;
	}
};

const connectToTabId = async (tabId: number): Promise<TabSession | null> => {
	const tab = await getTabById(tabId);
	if (!tab) {
		return null;
	}
	await ensurePageBridge(tab.id);
	const pageContext = await invoke(tab.id, "global.getPageContext", undefined);
	return { tabId: tab.id, tabUrl: tab.url, pageContext };
};

const connectToTab = async (launch: PopupLaunch): Promise<TabSession | null> => {
	if (launch.mode === "window" && launch.tabId !== null) {
		return connectToTabId(launch.tabId);
	}
	const tab = await getActiveTab();
	return tab ? connectToTabId(tab.id) : null;
};

const watchBoundTab = (tabId: number, handlers: BoundTabHandlers): (() => void) => {
	const removed = (removedTabId: number) => {
		if (removedTabId === tabId) {
			handlers.onLost();
		}
	};
	const updated = (updatedTabId: number, change: { status?: string }) => {
		if (updatedTabId === tabId && change.status === "complete") {
			handlers.onReloaded();
		}
	};
	const navigated = (details: { tabId: number; frameId: number }) => {
		if (details.tabId === tabId && details.frameId === 0) {
			handlers.onNavigated();
		}
	};
	browser.tabs.onRemoved.addListener(removed);
	browser.tabs.onUpdated.addListener(updated);
	browser.webNavigation?.onHistoryStateUpdated.addListener(navigated);
	return () => {
		browser.tabs.onRemoved.removeListener(removed);
		browser.tabs.onUpdated.removeListener(updated);
		browser.webNavigation?.onHistoryStateUpdated.removeListener(navigated);
	};
};

const useBoundTabWatcher = () => {
	const queryClient = useQueryClient();
	const tabId = useSessionStore((state) => state.tabId);
	const setTab = useSessionStore((state) => state.setTab);
	const setBridgeStatus = useSessionStore((state) => state.setBridgeStatus);

	useEffect(() => {
		if (tabId === null) {
			return;
		}
		let active = true;
		let lastTarget: PageTarget | null = null;

		const readTarget = async (): Promise<PageTarget | null> => {
			try {
				return await invoke(tabId, "utilities.getPageTarget", undefined);
			} catch {
				return null;
			}
		};

		const adoptTab = async () => {
			const tab = await getTabById(tabId);
			if (active && tab) {
				setTab(tab.id, tab.url);
			}
		};

		const refresh = async () => {
			await adoptTab();
			if (active) {
				await queryClient.invalidateQueries({ queryKey: pageKeys.tab(tabId) });
			}
		};

		const revalidate = () => {
			void readTarget().then(async (next) => {
				if (!active) {
					return;
				}
				const changed = pageTargetChanged(lastTarget, next);
				lastTarget = next;
				if (changed) {
					await refresh();
				}
			});
		};

		const reloaded = () => {
			void refresh().then(async () => {
				const next = await readTarget();
				if (active) {
					lastTarget = next;
				}
			});
		};

		void readTarget().then((target) => {
			if (active) {
				lastTarget = target;
			}
		});

		const unwatch = watchBoundTab(tabId, { onLost: () => setBridgeStatus("lost"), onReloaded: reloaded, onNavigated: revalidate });
		window.addEventListener("focus", revalidate);
		return () => {
			active = false;
			unwatch();
			window.removeEventListener("focus", revalidate);
		};
	}, [tabId, queryClient, setTab, setBridgeStatus]);
};

const useBindTab = () => {
	const queryClient = useQueryClient();
	const setTab = useSessionStore((state) => state.setTab);
	const setBridgeStatus = useSessionStore((state) => state.setBridgeStatus);

	return useCallback(
		async (tabId: number) => {
			setBridgeStatus("pending");
			let session: TabSession | null = null;
			try {
				session = await connectToTabId(tabId);
			} catch {
				session = null;
			}
			if (!session) {
				setBridgeStatus("lost");
				throw new Error("Power Tools could not connect to that tab. Open a model-driven app in it and try again.");
			}
			setTab(session.tabId, session.tabUrl);
			queryClient.setQueryData(pageKeys.command(session.tabId, "global.getPageContext", null), session.pageContext);
			setBridgeStatus("ready");
			await queryClient.invalidateQueries({ queryKey: pageKeys.tab(session.tabId) });
		},
		[queryClient, setBridgeStatus, setTab]
	);
};

export const useTabRecovery = () => {
	const rebind = useBindTab();
	const [choices, setChoices] = useState<TabChoice[]>([]);

	const refresh = useCallback(async () => {
		setChoices(tabChoices(await listOrgTabs()));
	}, []);

	return { choices, refresh, rebind };
};

const useActiveTabFollower = () => {
	const bind = useBindTab();

	useEffect(() => {
		if (readPopupLaunch().mode !== "sidepanel") {
			return;
		}
		const activated = ({ tabId }: { tabId: number }) => {
			void getTabById(tabId).then((tab) => {
				if (tab && isOrgUrl(tab.url) && useSessionStore.getState().tabId !== tab.id) {
					void bind(tab.id).catch(() => undefined);
				}
			});
		};
		browser.tabs.onActivated.addListener(activated);
		return () => {
			browser.tabs.onActivated.removeListener(activated);
		};
	}, [bind]);
};

export const useSessionBootstrap = () => {
	const queryClient = useQueryClient();
	const setTab = useSessionStore((state) => state.setTab);
	const setBridgeStatus = useSessionStore((state) => state.setBridgeStatus);
	const currentAreaId = useNavigationStore((state) => state.currentAreaId);

	useEffect(() => {
		const launch = readPopupLaunch();
		let cancelled = false;
		const run = async () => {
			const initialArea = await resolveInitialArea();
			if (!cancelled && !useNavigationStore.getState().currentAreaId) {
				useNavigationStore.setState({ currentAreaId: initialArea });
			}
			try {
				const session = await connectToTab(launch);
				if (cancelled) {
					return;
				}
				if (!session) {
					setBridgeStatus(launch.mode === "popup" ? "unavailable" : "lost");
					return;
				}
				setTab(session.tabId, session.tabUrl);
				queryClient.setQueryData(pageKeys.command(session.tabId, "global.getPageContext", null), session.pageContext);
				setBridgeStatus("ready");
			} catch {
				if (!cancelled) {
					setBridgeStatus(launch.mode === "popup" ? "unavailable" : "lost");
				}
			}
		};
		void run();
		return () => {
			cancelled = true;
		};
	}, [queryClient, setBridgeStatus, setTab]);

	useBoundTabWatcher();
	useActiveTabFollower();

	return currentAreaId !== "";
};
