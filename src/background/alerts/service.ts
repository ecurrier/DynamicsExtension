import { browser } from "wxt/browser";

import { ensurePageBridge, invoke } from "@/messaging/tab";
import { activeAlertFor, ORG_HOST_PATTERNS } from "@/shared/lib";
import { environmentsItem } from "@/shared/storage";

const ALERT_TIMEOUT_MS = 60_000;

export const shouldApplyOnUpdate = (change: { status?: string }, url: string | undefined): url is string =>
	change.status === "complete" && typeof url === "string" && url.startsWith("https://");

export const applyEnvironmentAlert = async (tabId: number, url: string): Promise<void> => {
	const match = activeAlertFor(Object.values(await environmentsItem.getValue()), url);
	if (!match) {
		return;
	}
	await ensurePageBridge(tabId);
	await invoke(tabId, "global.showEnvironmentAlert", { environmentId: match.environment.id, alert: match.alert }, { timeoutMs: ALERT_TIMEOUT_MS });
};

const applyQuietly = (tabId: number, url: string): Promise<void> => applyEnvironmentAlert(tabId, url).catch(() => undefined);

export const watchEnvironmentAlerts = (): void => {
	browser.tabs.onUpdated.addListener((tabId, change, tab) => {
		if (shouldApplyOnUpdate(change, tab.url)) {
			void applyQuietly(tabId, tab.url);
		}
	});
};

export const reconcileEnvironmentAlerts = async (): Promise<void> => {
	const tabs = await browser.tabs.query({ url: ORG_HOST_PATTERNS });
	await Promise.all(tabs.map((tab) => (tab.id !== undefined && tab.url ? applyQuietly(tab.id, tab.url) : Promise.resolve())));
};
