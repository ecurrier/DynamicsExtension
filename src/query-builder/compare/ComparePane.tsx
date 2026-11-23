import { makeStyles, Text, tokens } from "@fluentui/react-components";

import {
	chooseCompareSide,
	compareAvailability,
	comparedColumnChoices,
	comparePair,
	type ConnectionRunEntry,
	effectiveComparedColumns,
	isComparisonStale,
	isRunBusy,
	keyColumnChoices,
	type MatchKey,
	resolveCompareSetup,
} from "../lib";
import { useQueryBuilder } from "../store";
import { type QueryRunControls } from "../useQueryRun";
import { CompareProgressView } from "./CompareProgressView";
import { CompareSetupRow } from "./CompareSetupRow";
import { ComparisonView } from "./ComparisonView";
import { useCompare } from "./useCompare";
import { useCompareContext } from "./useCompareContext";

const useStyles = makeStyles({
	body: {
		display: "flex",
		flexDirection: "column",
		flexGrow: 1,
		minHeight: 0,
		rowGap: tokens.spacingVerticalXS,
		padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
		overflowY: "auto",
	},
	hint: {
		color: tokens.colorNeutralForeground3,
	},
});

interface ComparePaneProps {
	entries: readonly ConnectionRunEntry[];
	controls: QueryRunControls;
}

interface CompareWorkspaceProps extends ComparePaneProps {
	pair: readonly [string, string];
	first: ConnectionRunEntry;
	second: ConnectionRunEntry;
}

const CompareWorkspace = ({ entries, controls, pair, first, second }: CompareWorkspaceProps) => {
	const styles = useStyles();
	const setup = useQueryBuilder((state) => state.compare.setup);
	const progress = useQueryBuilder((state) => state.compare.progress);
	const result = useQueryBuilder((state) => state.compare.result);
	const bucket = useQueryBuilder((state) => state.compare.bucket);
	const text = useQueryBuilder((state) => state.text);
	const parseFailed = useQueryBuilder((state) => state.errors.length > 0);
	const runs = useQueryBuilder((state) => state.runs);
	const setCompareSetup = useQueryBuilder((state) => state.setCompareSetup);
	const selectComparisonBucket = useQueryBuilder((state) => state.selectComparisonBucket);
	const keys = entries.map((entry) => entry.key);
	const view = useCompareContext(entries, first, second);
	const actions = useCompare(controls);
	const { columns, primaryKey } = view;

	const keyChoices = keyColumnChoices(columns, primaryKey);
	const keyColumns = setup.keyColumns.filter((key) => keyChoices.some((column) => column.key === key));
	const matchKey: MatchKey = setup.matchKeyKind === "primaryKey" ? { kind: "primaryKey" } : { kind: "columns", columns: keyColumns };
	const comparedChoices = comparedColumnChoices(columns, primaryKey, matchKey);
	const compared = effectiveComparedColumns(setup, columns, primaryKey, matchKey);
	const resolution = resolveCompareSetup(setup, { keys, columns, primaryKey });
	const working = progress.kind === "running" || progress.kind === "loading" || progress.kind === "confirm";
	const canCompare = resolution.ok && !parseFailed && !working && !entries.some((entry) => isRunBusy(entry.run));
	const reason = !resolution.ok ? resolution.reason : parseFailed ? "The Fetch XML does not parse." : null;
	const stale = result !== null && isComparisonStale(result, { text, setup, pair, runs });
	const context = { tables: view.tables, names: view.names };
	const onCompare = () => void actions.compare(context);

	return (
		<div className={styles.body}>
			<CompareSetupRow
				entries={entries}
				first={first}
				second={second}
				setup={setup}
				keyChoices={keyChoices}
				keyColumns={keyColumns}
				comparedChoices={comparedChoices}
				compared={compared}
				disabled={working}
				canCompare={canCompare}
				reason={reason}
				onChooseSide={(side, key) => setCompareSetup(chooseCompareSide(setup, keys, side, key))}
				onSwap={() => setCompareSetup({ ...setup, firstKey: second.key, secondKey: first.key })}
				onSetupChange={setCompareSetup}
				onCompare={onCompare}
			/>
			<CompareProgressView
				progress={progress}
				sides={[first, second]}
				stopping={first.run.stopRequested || second.run.stopRequested}
				onStop={actions.stop}
				onKeepLoading={() => void actions.keepLoading(context)}
				onCompareLoaded={() => actions.compareLoaded(context)}
			/>
			{result ? (
				<ComparisonView
					stored={result}
					bucket={bucket}
					stale={stale}
					canCompareAgain={canCompare}
					columns={columns}
					primaryName={view.primaryName}
					appUrlOf={view.appUrlOf}
					onSelectBucket={selectComparisonBucket}
					onCompareAgain={onCompare}
				/>
			) : progress.kind === "idle" ? (
				<Text size={200} className={styles.hint}>
					Select Compare to pair the Records of the two Query Runs.
				</Text>
			) : null}
		</div>
	);
};

export const ComparePane = (props: ComparePaneProps) => {
	const styles = useStyles();
	const query = useQueryBuilder((state) => state.query);
	const setup = useQueryBuilder((state) => state.compare.setup);
	const availability = compareAvailability(query);
	const pair = comparePair(
		setup,
		props.entries.map((entry) => entry.key)
	);
	const first = props.entries.find((entry) => entry.key === pair?.[0]);
	const second = props.entries.find((entry) => entry.key === pair?.[1]);
	if (!availability.ok) {
		return (
			<div className={styles.body}>
				<Text size={200} className={styles.hint}>
					{availability.reason}
				</Text>
			</div>
		);
	}
	if (!pair || !first || !second) {
		return null;
	}
	return <CompareWorkspace {...props} pair={pair} first={first} second={second} />;
};
