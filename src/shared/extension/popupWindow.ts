import { browser } from "wxt/browser";

import { pinnedWindowsItem } from "@/shared/storage";

export type PopupMode = "popup" | "window";

export interface PopupLaunch {
	mode: PopupMode;
	tabId: number | null;
}

const WINDOW_WIDTH = 720;
const WINDOW_HEIGHT = 660;

export const readPopupLaunch = (): PopupLaunch => {
	const params = new URLSearchParams(globalThis.location?.search ?? "");
	const tabId = Number(params.get("tabId"));
	if (params.get("mode") === "window" && Number.isInteger(tabId) && tabId > 0) {
		return { mode: "window", tabId };
	}
	return { mode: "popup", tabId: null };
};

const focusWindow = async (windowId: number): Promise<boolean> => {
	try {
		await browser.windows.update(windowId, { focused: true });
		return true;
	} catch {
		return false;
	}
};

export const openPinnedWindow = async (tabId: number): Promise<void> => {
	const pinned = await pinnedWindowsItem.getValue();
	const existing = pinned[String(tabId)];
	if (existing !== undefined && (await focusWindow(existing))) {
		return;
	}
	const created = await browser.windows.create({
		url: browser.runtime.getURL(`/popup.html?mode=window&tabId=${tabId}` as never),
		type: "popup",
		width: WINDOW_WIDTH,
		height: WINDOW_HEIGHT,
	});
	if (created?.id !== undefined) {
		await pinnedWindowsItem.setValue({ ...pinned, [String(tabId)]: created.id });
	}
};
