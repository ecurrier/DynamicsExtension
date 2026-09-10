import { browser } from "wxt/browser";

import { openExtensionPage } from "@/shared/extension";
import { resultsShareItem, traceViewerLaunchItem, transporterLaunchItem } from "@/shared/storage";
import { type WorkspaceLaunch } from "@/shared/types";

import { WORKSPACE_PAGES } from "./pages";
import { growToFit } from "./windowBounds";

const persistLaunch = (workspace: WorkspaceLaunch): Promise<void> => {
	switch (workspace.id) {
		case "data-transporter":
			return transporterLaunchItem.setValue(workspace.launch);
		case "plugin-traces":
			return traceViewerLaunchItem.setValue(workspace.launch);
		case "results-viewer":
			return resultsShareItem.setValue(workspace.share);
	}
};

export const openWorkspaceInTab = async (workspace: WorkspaceLaunch): Promise<void> => {
	await persistLaunch(workspace);
	await openExtensionPage(WORKSPACE_PAGES[workspace.id]);
};

export const fitWindowToWorkspace = async (): Promise<void> => {
	try {
		const current = await browser.windows.getCurrent();
		if (current.id === undefined || current.state !== "normal") {
			return;
		}
		const bounds = growToFit({ width: current.width ?? 0, height: current.height ?? 0 }, { width: screen.availWidth, height: screen.availHeight });
		if (bounds) {
			await browser.windows.update(current.id, bounds);
		}
	} catch {
		return;
	}
};
