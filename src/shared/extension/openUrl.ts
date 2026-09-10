import { browser } from "wxt/browser";

export const openUrl = async (url: string): Promise<void> => {
	await browser.tabs.create({ url });
};

export const openExtensionPage = async (path: string): Promise<void> => {
	await browser.tabs.create({ url: browser.runtime.getURL(path as never) });
};
