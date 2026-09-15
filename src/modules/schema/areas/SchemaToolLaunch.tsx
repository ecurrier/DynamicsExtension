import { Text } from "@fluentui/react-components";

import { AreaContainer, FormRow, Grow } from "@/shared/components";
import { useAsyncAction } from "@/shared/hooks";
import { useSessionStore } from "@/shared/stores";
import { type SchemaTool, type WorkspaceTarget } from "@/shared/types";
import { useWorkspaceLauncher, WorkspaceLaunchButton } from "@/workspaces";

interface SchemaToolLaunchProps {
	tool: SchemaTool;
	label: string;
	description: string;
}

const SchemaToolLaunch = ({ tool, label, description }: SchemaToolLaunchProps) => {
	const tabId = useSessionStore((state) => state.tabId);
	const workspaces = useWorkspaceLauncher();
	const launch = useAsyncAction(`Could not open ${label}`);

	const open = (target: WorkspaceTarget) =>
		launch.run(() => workspaces.open({ id: "schema-tools", launch: { tool, tabId, environmentId: null, launchedAt: new Date().toISOString() } }, target));

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

export const CrossTableColumnsArea = () => (
	<SchemaToolLaunch
		tool="columns"
		label="Open Cross-Table Columns"
		description="Find every table in the environment carrying a column, then change its label, description, or requirement level across the ones you pick. Matches start unselected, columns locked by a managed solution are shown but cannot be edited, and the tables that succeed are published afterwards. Opens in its own tab."
	/>
);

export const PolymorphicLookupsArea = () => (
	<SchemaToolLaunch
		tool="polymorphic"
		label="Open Polymorphic Lookups"
		description="List the polymorphic lookups on a table and create new ones against a chosen set of target tables, in the solution you pick. Opens in its own tab."
	/>
);
