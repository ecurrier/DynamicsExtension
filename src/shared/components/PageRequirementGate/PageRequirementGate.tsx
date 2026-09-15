import { Spinner } from "@fluentui/react-components";
import { type ReactNode } from "react";

import { usePageQuery } from "@/messaging/client";
import { useSessionStore } from "@/shared/stores";
import { type PageRequirement } from "@/shared/types";

import { EmptyState } from "../EmptyState";

interface PageRequirementGateProps {
	requires: PageRequirement;
	children: ReactNode;
}

export const PageRequirementGate = ({ requires, children }: PageRequirementGateProps) => {
	const bridgeStatus = useSessionStore((state) => state.bridgeStatus);
	const pageContext = usePageQuery("global.getPageContext", undefined);

	if (bridgeStatus === "pending") {
		return <Spinner label="Connecting to the page..." style={{ padding: "24px" }} />;
	}
	if (bridgeStatus === "lost") {
		return <EmptyState title="Waiting for a tab">This area reads the page you are on. Pick a tab in the banner above to carry on here.</EmptyState>;
	}
	if (bridgeStatus === "unavailable") {
		return (
			<EmptyState title="This page cannot be used with Power Tools" intent="warning">
				Open a model-driven app or Power Pages site in the active tab, then reopen the extension.
			</EmptyState>
		);
	}
	if (requires === "model-driven-app" && pageContext.isSuccess && pageContext.data !== "model-driven-app") {
		return (
			<EmptyState title="Model-driven app required" intent="warning">
				This area works on model-driven app forms and views. Open one in the active tab, then reopen the extension.
			</EmptyState>
		);
	}
	if (requires === "portal" && pageContext.isSuccess && pageContext.data !== "portal") {
		return (
			<EmptyState title="Power Pages site required" intent="warning">
				This area works on Power Pages forms. Open one in the active tab, then reopen the extension.
			</EmptyState>
		);
	}
	return <>{children}</>;
};
