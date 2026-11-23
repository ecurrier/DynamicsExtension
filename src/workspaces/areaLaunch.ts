import { type AreaWorkspace } from "@/modules/types";
import { type SchemaTool, type SecurityTool, type WorkspaceLaunch } from "@/shared/types";

export interface AreaLaunchContext {
	tabId: number | null;
	orgOrigin: string | null;
	environmentName: string | null;
	/** True when the connected tab is a model-driven app, so the page can be a source. */
	pageReady: boolean;
	now: string;
}

/**
 * Builds the launch a `fit: "workspace"` Area opens with. It returns null when the Workspace cannot
 * be opened from navigation at all, or not from the page the user has.
 */
export const areaWorkspaceLaunch = (target: AreaWorkspace, context: AreaLaunchContext): WorkspaceLaunch | null => {
	const { tabId, orgOrigin, environmentName, pageReady, now } = context;
	switch (target.id) {
		case "schema-tools":
			return { id: "schema-tools", launch: { tool: (target.tool as SchemaTool) ?? "columns", tabId, environmentId: null, launchedAt: now } };
		case "security-tools":
			return { id: "security-tools", launch: { tool: (target.tool as SecurityTool) ?? "compare", tabId, environmentId: null, launchedAt: now } };
		case "plugin-traces":
			// The viewer reads traces through the tab, so it needs both the tab and its org.
			return tabId === null || orgOrigin === null
				? null
				: { id: "plugin-traces", launch: { tabId, orgOrigin, environmentName: environmentName ?? orgOrigin, launchedAt: now } };
		case "data-transporter":
			return {
				id: "data-transporter",
				launch: {
					tabId: pageReady ? tabId : null,
					orgOrigin: pageReady ? orgOrigin : null,
					environmentName: pageReady ? (environmentName ?? orgOrigin) : null,
					launchedAt: now,
				},
			};
		case "query-builder":
			return { id: "query-builder", launch: { tabId, environmentId: null, fetchXml: null, launchedAt: now } };
		case "results-viewer":
			// Launched from the Retrieve Records results footer, never from navigation.
			return null;
	}
};
