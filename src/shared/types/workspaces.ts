import { type ResultsShare } from "./results";
import { type TraceViewerLaunch } from "./traces";
import { type TransporterLaunch } from "./transport";

export type SecurityTool = "compare" | "privileges";

export interface SecurityToolsLaunch {
	tool: SecurityTool;
	tabId: number | null;
	environmentId: string | null;
	launchedAt: string;
}

export type SchemaTool = "columns" | "polymorphic";

export interface SchemaToolsLaunch {
	tool: SchemaTool;
	tabId: number | null;
	environmentId: string | null;
	launchedAt: string;
}

export type WorkspaceId = "data-transporter" | "plugin-traces" | "results-viewer" | "security-tools" | "schema-tools";

export type WorkspaceTarget = "window" | "tab";

export type WorkspaceLaunch =
	| { id: "data-transporter"; launch: TransporterLaunch }
	| { id: "plugin-traces"; launch: TraceViewerLaunch }
	| { id: "results-viewer"; share: ResultsShare }
	| { id: "security-tools"; launch: SecurityToolsLaunch }
	| { id: "schema-tools"; launch: SchemaToolsLaunch };
