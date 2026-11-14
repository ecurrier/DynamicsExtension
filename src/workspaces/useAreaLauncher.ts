import { useCallback } from "react";

import { usePageQuery } from "@/messaging/client";
import { type AreaWorkspace } from "@/modules/types";
import { ensureHostAccess } from "@/shared/extension";
import { resolveOrgOrigin } from "@/shared/lib";
import { useSessionStore } from "@/shared/stores";
import { type WorkspaceTarget } from "@/shared/types";

import { areaWorkspaceLaunch } from "./areaLaunch";
import { useWorkspaceLauncher } from "./useWorkspaceLauncher";

/**
 * Opens the Workspace a `fit: "workspace"` Area stands for: in place in the pinned window, in a
 * browser tab from the popup and the side panel.
 */
export const useAreaLauncher = () => {
	const tabId = useSessionStore((state) => state.tabId);
	const tabUrl = useSessionStore((state) => state.tabUrl);
	const pageContext = usePageQuery("global.getPageContext", undefined);
	const details = usePageQuery("settings.getEnvironmentDetails", undefined);
	const workspaces = useWorkspaceLauncher();
	const { canOpenInWindow } = workspaces;

	const open = useCallback(
		async (target: AreaWorkspace, to?: WorkspaceTarget): Promise<void> => {
			const orgOrigin = resolveOrgOrigin(details.data?.modelDrivenAppUrl ?? null, tabUrl);
			const launch = areaWorkspaceLaunch(target, {
				tabId,
				orgOrigin,
				environmentName: details.data?.environmentName ?? null,
				pageReady: tabId !== null && pageContext.data === "model-driven-app",
				now: new Date().toISOString(),
			});
			if (!launch) {
				throw new Error("Open a model-driven app in the active tab first");
			}
			if (launch.id === "plugin-traces" && orgOrigin) {
				// First, so the click that opened the Workspace still counts as the gesture Chrome
				// wants for a permission prompt. The Workspace also asks again if this is refused.
				await ensureHostAccess([`${orgOrigin}/*`]);
			}
			await workspaces.open(launch, to ?? (canOpenInWindow ? "window" : "tab"));
		},
		[canOpenInWindow, details.data, pageContext.data, tabId, tabUrl, workspaces]
	);

	return { canOpenInWindow, open };
};
