import { Spinner } from "@fluentui/react-components";
import { lazy, Suspense } from "react";

import { usePageQuery } from "@/messaging/client";
import { PageRequirementGate } from "@/shared/components";
import { useSessionStore } from "@/shared/stores";
import { type TransporterLaunch, type WorkspaceLaunch } from "@/shared/types";

const DataTransporter = lazy(() => import("@/data-transporter").then((module) => ({ default: module.DataTransporter })));
const TraceViewer = lazy(() => import("@/plugin-traces").then((module) => ({ default: module.TraceViewer })));
const ResultsViewer = lazy(() => import("@/results-viewer").then((module) => ({ default: module.ResultsViewer })));
const SecurityTools = lazy(() => import("@/security-tools").then((module) => ({ default: module.SecurityTools })));
const SchemaTools = lazy(() => import("@/schema-tools").then((module) => ({ default: module.SchemaTools })));

interface HostedTransporterProps {
	launch: TransporterLaunch;
}

const HostedTransporter = ({ launch }: HostedTransporterProps) => {
	const bridgeStatus = useSessionStore((state) => state.bridgeStatus);
	const pageContext = usePageQuery("global.getPageContext", undefined, { enabled: launch.tabId !== null });
	const pageAvailable = launch.tabId !== null && bridgeStatus === "ready" && pageContext.data === "model-driven-app";
	return <DataTransporter launch={launch} pageAvailable={pageAvailable} />;
};

interface WorkspaceOutletProps {
	workspace: WorkspaceLaunch;
}

export const WorkspaceOutlet = ({ workspace }: WorkspaceOutletProps) => (
	<Suspense fallback={<Spinner style={{ padding: "24px" }} />}>
		{workspace.id === "data-transporter" ? <HostedTransporter launch={workspace.launch} /> : null}
		{workspace.id === "plugin-traces" ? (
			<PageRequirementGate requires="model-driven-app">
				<TraceViewer launch={workspace.launch} />
			</PageRequirementGate>
		) : null}
		{workspace.id === "results-viewer" ? <ResultsViewer share={workspace.share} /> : null}
		{workspace.id === "security-tools" ? <SecurityTools launch={workspace.launch} /> : null}
		{workspace.id === "schema-tools" ? <SchemaTools launch={workspace.launch} hosted /> : null}
	</Suspense>
);
