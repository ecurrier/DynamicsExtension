import { useState } from "react";

import { type ConnectionTarget } from "@/shared/connections";

import { currentResultsView, initialResultsView, isRunBusy, type QueryRunState, runStatusText } from "./lib";
import { ResultsBody, type ResultsPagingActions } from "./ResultsBody";
import { type ResultsFrameProps, ResultsHeader } from "./ResultsHeader";

export interface ResultsPaneProps extends ResultsFrameProps, ResultsPagingActions {
	run: QueryRunState;
	connection: ConnectionTarget;
	connectionName: string;
}

export const ResultsPane = ({ run, connection, connectionName, collapsed, maximised, onToggle, onMaximisedChange, ...actions }: ResultsPaneProps) => {
	const [stored, setStored] = useState(() => initialResultsView(run.id));
	const viewState = currentResultsView(stored, run);
	if (viewState !== stored) {
		setStored(viewState);
	}
	return (
		<>
			<ResultsHeader
				status={runStatusText(run, connectionName)}
				busy={isRunBusy(run)}
				collapsed={collapsed}
				maximised={maximised}
				onToggle={onToggle}
				onMaximisedChange={onMaximisedChange}
			/>
			{!collapsed || maximised ? (
				<ResultsBody run={run} connection={connection} maximised={maximised} viewState={viewState} onViewStateChange={setStored} {...actions} />
			) : null}
		</>
	);
};
