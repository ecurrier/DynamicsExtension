import { Spinner, Tab, TabList } from "@fluentui/react-components";
import { useState } from "react";

import { useSchemaGateway } from "@/modules/schema/hooks";
import { AreaContainer, EmptyState } from "@/shared/components";
import { useSolutionPicker } from "@/shared/hooks";
import { type SchemaTool, type SchemaToolsLaunch } from "@/shared/types";

import { CrossTableColumns } from "./CrossTableColumns";
import { PolymorphicLookups } from "./PolymorphicLookups";
import { connectionFor, type SchemaBootstrapStatus } from "./useSchemaToolsBootstrap";

interface SchemaToolsProps {
	launch: SchemaToolsLaunch;
}

export const SchemaTools = ({ launch }: SchemaToolsProps) => {
	const [tool, setTool] = useState<SchemaTool>(launch.tool);
	const [solution, setSolution] = useState<string | null>(null);
	const pickSolution = useSolutionPicker();
	const gateway = useSchemaGateway(connectionFor(launch));

	const choose = () => {
		void pickSolution(false, "Select the solution these schema changes should be made in").then((picked) => setSolution(picked?.uniqueName ?? null));
	};

	return (
		<AreaContainer fill>
			<TabList selectedValue={tool} onTabSelect={(_, data) => setTool(data.value as SchemaTool)}>
				<Tab value="columns">Cross-Table Columns</Tab>
				<Tab value="polymorphic">Polymorphic Lookups</Tab>
			</TabList>
			{tool === "columns" ? (
				<CrossTableColumns gateway={gateway} solutionUniqueName={solution} onPickSolution={choose} />
			) : (
				<PolymorphicLookups http={null} solutionUniqueName={solution} onPickSolution={choose} />
			)}
		</AreaContainer>
	);
};

export const SchemaToolsApp = ({ status }: { status: SchemaBootstrapStatus }) => {
	if (status.kind === "loading") {
		return <Spinner style={{ padding: "24px" }} />;
	}
	if (status.kind === "missing") {
		return (
			<EmptyState title="No schema tools session" intent="warning">
				{status.reason}
			</EmptyState>
		);
	}
	return <SchemaTools launch={status.launch} />;
};
