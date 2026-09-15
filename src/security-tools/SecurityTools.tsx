import { Spinner, Tab, TabList } from "@fluentui/react-components";
import { useState } from "react";

import { useSecurityGateway } from "@/modules/security/hooks";
import { AreaContainer, EmptyState } from "@/shared/components";
import { type SecurityTool, type SecurityToolsLaunch } from "@/shared/types";

import { PrivilegeEditor } from "./PrivilegeEditor";
import { RoleCompare } from "./RoleCompare";
import { connectionFor } from "./useSecurityToolsBootstrap";

interface SecurityToolsProps {
	launch: SecurityToolsLaunch;
}

export const SecurityTools = ({ launch }: SecurityToolsProps) => {
	const [tool, setTool] = useState<SecurityTool>(launch.tool);
	const gateway = useSecurityGateway(connectionFor(launch));
	return (
		<AreaContainer fill>
			<TabList selectedValue={tool} onTabSelect={(_, data) => setTool(data.value as SecurityTool)}>
				<Tab value="compare">Role Compare</Tab>
				<Tab value="privileges">Privilege Editor</Tab>
			</TabList>
			{tool === "compare" ? <RoleCompare gateway={gateway} /> : <PrivilegeEditor gateway={gateway} />}
		</AreaContainer>
	);
};

export const SecurityToolsApp = ({ status }: { status: { kind: string } & Record<string, unknown> }) => {
	if (status.kind === "loading") {
		return <Spinner style={{ padding: "24px" }} />;
	}
	if (status.kind === "missing") {
		return (
			<EmptyState title="No security tools session" intent="warning">
				{String(status.reason)}
			</EmptyState>
		);
	}
	return <SecurityTools launch={status.launch as SecurityToolsLaunch} />;
};
