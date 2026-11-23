import { makeStyles, Tab, TabList, tokens } from "@fluentui/react-components";
import { useState } from "react";

import { type ConnectionRunEntry, currentResultsView, initialResultsView, isRunBusy, type ResultsViewState, runStatusText } from "./lib";
import { ResultsBody } from "./ResultsBody";
import { type ResultsFrameProps, ResultsHeader } from "./ResultsHeader";
import { ResultsSummaryStrip } from "./ResultsSummaryStrip";
import { ResultsTabLabel } from "./ResultsTabLabel";
import { type QueryRunControls } from "./useQueryRun";

const useStyles = makeStyles({
	content: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
	},
	tabs: {
		flexShrink: 0,
		overflowX: "auto",
		paddingLeft: tokens.spacingHorizontalXS,
		paddingRight: tokens.spacingHorizontalXS,
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
	},
});

interface MultiResultsPaneProps extends ResultsFrameProps {
	entries: readonly [ConnectionRunEntry, ...ConnectionRunEntry[]];
	controls: QueryRunControls;
}

export const MultiResultsPane = ({ entries, controls, collapsed, maximised, onToggle, onMaximisedChange }: MultiResultsPaneProps) => {
	const styles = useStyles();
	const [selectedKey, setSelectedKey] = useState(entries[0].key);
	const [views, setViews] = useState<Readonly<Record<string, ResultsViewState>>>({});
	const selected = entries.find((entry) => entry.key === selectedKey) ?? entries[0];
	const stored = views[selected.key];
	const viewState = currentResultsView(stored ?? initialResultsView(selected.run.id), selected.run);
	if (viewState !== stored) {
		setViews((current) => ({ ...current, [selected.key]: viewState }));
	}
	const { key } = selected;

	return (
		<>
			<ResultsHeader
				status={runStatusText(selected.run, selected.name)}
				busy={entries.some((entry) => isRunBusy(entry.run))}
				collapsed={collapsed}
				maximised={maximised}
				onToggle={onToggle}
				onMaximisedChange={onMaximisedChange}
			/>
			{!collapsed || maximised ? (
				<div className={styles.content}>
					<ResultsSummaryStrip entries={entries} onLoadAllEverywhere={controls.loadAllEverywhere} />
					<TabList
						size="small"
						className={styles.tabs}
						aria-label="Query Run on each Connection"
						selectedValue={key}
						onTabSelect={(_, data) => setSelectedKey(String(data.value))}>
						{entries.map((entry) => (
							<Tab key={entry.key} value={entry.key}>
								<ResultsTabLabel entry={entry} />
							</Tab>
						))}
					</TabList>
					<ResultsBody
						key={key}
						run={selected.run}
						connection={selected.connection}
						maximised={maximised}
						viewState={viewState}
						onViewStateChange={(next) => setViews((current) => ({ ...current, [key]: next }))}
						onNextPage={() => controls.nextPage(key)}
						onLoadAll={() => controls.loadAll(key)}
						onKeepLoading={() => controls.keepLoading(key)}
						onStop={() => controls.stop(key)}
					/>
				</div>
			) : null}
		</>
	);
};
