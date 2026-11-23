import { type ConnectionTarget } from "@/shared/connections";

import { connectionKey, connectionLabel } from "./lib";
import { useQueryBuilder } from "./store";
import { type QueryRunRecord, useConnectionRunner } from "./useConnectionRunner";

interface ConnectionRunnerProps {
	connection: ConnectionTarget;
	connectionName: string;
	onQueryRun: (record: QueryRunRecord) => void;
}

const ConnectionRunner = ({ connection, connectionName, onQueryRun }: ConnectionRunnerProps) => {
	useConnectionRunner(connection, connectionName, onQueryRun);
	return null;
};

interface ConnectionRunnersProps {
	environmentNames: Readonly<Record<string, { name: string } | undefined>>;
	onQueryRun: (record: QueryRunRecord) => void;
}

export const ConnectionRunners = ({ environmentNames, onQueryRun }: ConnectionRunnersProps) => {
	const connections = useQueryBuilder((state) => state.connections);
	return connections.map((connection) => (
		<ConnectionRunner
			key={connectionKey(connection)}
			connection={connection}
			connectionName={connectionLabel(connection, environmentNames)}
			onQueryRun={onQueryRun}
		/>
	));
};
