import { browser } from "wxt/browser";

export const sidePanelSupported = (): boolean => browser.sidePanel !== undefined;

export const openSidePanel = async (tabId: number): Promise<void> => {
	await browser.sidePanel.open({ tabId });
};

export const applySidePanelBehavior = async (openPanelOnActionClick: boolean): Promise<void> => {
	if (!sidePanelSupported()) {
		return;
	}
	await browser.sidePanel.setPanelBehavior({ openPanelOnActionClick });
};
