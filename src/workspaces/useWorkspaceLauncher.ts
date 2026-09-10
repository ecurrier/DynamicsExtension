import { useCallback } from "react";

import { usePopupLaunch } from "@/shared/hooks";
import { useNavigationStore } from "@/shared/stores";
import { type WorkspaceLaunch, type WorkspaceTarget } from "@/shared/types";

import { fitWindowToWorkspace, openWorkspaceInTab } from "./open";

export const useWorkspaceLauncher = () => {
	const canOpenInWindow = usePopupLaunch().mode === "window";
	const openWorkspace = useNavigationStore((state) => state.openWorkspace);
	const open = useCallback(
		async (workspace: WorkspaceLaunch, target: WorkspaceTarget): Promise<void> => {
			if (target === "window") {
				openWorkspace(workspace);
				await fitWindowToWorkspace();
				return;
			}
			await openWorkspaceInTab(workspace);
		},
		[openWorkspace]
	);
	return { canOpenInWindow, open };
};
