import { type ConnectionRunEntry, connectionKey, connectionLabel } from "./lib";
import { MultiResultsPane } from "./MultiResultsPane";
import { type ResultsFrameProps } from "./ResultsHeader";
import { ResultsPane } from "./ResultsPane";
import { useQueryBuilder } from "./store";
import { type QueryRunControls } from "./useQueryRun";

interface ResultsAreaProps extends ResultsFrameProps {
	controls: QueryRunControls;
	environmentNames: Readonly<Record<string, { name: string } | undefined>>;
}

export const ResultsArea = ({ controls, environmentNames, ...frame }: ResultsAreaProps) => {
	const connections = useQueryBuilder((state) => state.connections);
	const runs = useQueryBuilder((state) => state.runs);
	const entries = connections.flatMap((connection): ConnectionRunEntry[] => {
		const key = connectionKey(connection);
		const run = runs[key];
		return run ? [{ key, connection, name: connectionLabel(connection, environmentNames), run }] : [];
	});
	const [first, ...rest] = entries;
	if (!first) {
		return null;
	}
	if (rest.length === 0) {
		return (
			<ResultsPane
				run={first.run}
				connection={first.connection}
				connectionName={first.name}
				{...frame}
				onNextPage={() => controls.nextPage(first.key)}
				onLoadAll={() => controls.loadAll(first.key)}
				onKeepLoading={() => controls.keepLoading(first.key)}
				onStop={() => controls.stop(first.key)}
			/>
		);
	}
	return <MultiResultsPane entries={[first, ...rest]} controls={controls} {...frame} />;
};
