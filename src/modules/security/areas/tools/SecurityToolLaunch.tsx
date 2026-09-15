import { Text } from "@fluentui/react-components";

import { AreaContainer, FormRow, Grow } from "@/shared/components";
import { useAsyncAction } from "@/shared/hooks";
import { useSessionStore } from "@/shared/stores";
import { type SecurityTool, type WorkspaceTarget } from "@/shared/types";
import { useWorkspaceLauncher, WorkspaceLaunchButton } from "@/workspaces";

interface SecurityToolLaunchProps {
	tool: SecurityTool;
	label: string;
	description: string;
}

export const SecurityToolLaunch = ({ tool, label, description }: SecurityToolLaunchProps) => {
	const tabId = useSessionStore((state) => state.tabId);
	const workspaces = useWorkspaceLauncher();
	const launch = useAsyncAction(`Could not open ${label}`);

	const open = (target: WorkspaceTarget) =>
		launch.run(() => workspaces.open({ id: "security-tools", launch: { tool, tabId, environmentId: null, launchedAt: new Date().toISOString() } }, target));

	return (
		<AreaContainer>
			<Text>{description}</Text>
			<FormRow>
				<Grow>
					<WorkspaceLaunchButton label={label} canOpenInWindow={workspaces.canOpenInWindow} disabled={launch.running} onOpen={open} />
				</Grow>
			</FormRow>
		</AreaContainer>
	);
};

export const RoleCompareArea = () => (
	<SecurityToolLaunch
		tool="compare"
		label="Open Role Compare"
		description="Compare two or more security roles and see only the privileges where they differ. Roles are listed once per logical role rather than once per business unit copy. The comparison opens in its own tab."
	/>
);

export const PrivilegeEditorArea = () => (
	<SecurityToolLaunch
		tool="privileges"
		label="Open Privilege Editor"
		description="Pick a mix of security roles and tables, then move the selected privileges to a new depth in one run. Changes apply to the root business unit copy and follow its inherited copies. The editor opens in its own tab."
	/>
);
