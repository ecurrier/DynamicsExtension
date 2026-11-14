import { Field, Input, makeStyles, Switch } from "@fluentui/react-components";
import { type KeyboardEvent } from "react";

import { FilterPanel } from "@/shared/components";
import { type TraceQuery } from "@/shared/types";

import { activeTraceFilterCount, clearedTraceQuery } from "./lib";

const useStyles = makeStyles({
	row: {
		display: "flex",
		flexWrap: "wrap",
		gap: "8px",
	},
	half: {
		flex: "1 1 140px",
		minWidth: 0,
	},
});

interface TraceFiltersProps {
	draft: TraceQuery;
	loading: boolean;
	onChange: (query: TraceQuery) => void;
	onApply: () => void;
}

/**
 * The server filters, behind one button that says how many are set. They are the react-query key,
 * so applying them is a deliberate act; the quick filter above the table stays live.
 */
export const TraceFilters = ({ draft, loading, onChange, onApply }: TraceFiltersProps) => {
	const styles = useStyles();
	const set = <K extends keyof TraceQuery>(key: K, value: TraceQuery[K]) => onChange({ ...draft, [key]: value });
	const applyOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			onApply();
		}
	};

	return (
		<FilterPanel
			count={activeTraceFilterCount(draft)}
			onClear={() => onChange(clearedTraceQuery(draft))}
			onApply={onApply}
			applying={loading}
			applyLabel="Apply filters">
			<div className={styles.row}>
				<Field label="From" className={styles.half}>
					<Input type="datetime-local" value={draft.from ?? ""} onChange={(_, data) => set("from", data.value || null)} onKeyDown={applyOnEnter} />
				</Field>
				<Field label="To" className={styles.half}>
					<Input type="datetime-local" value={draft.to ?? ""} onChange={(_, data) => set("to", data.value || null)} onKeyDown={applyOnEnter} />
				</Field>
			</div>
			<Field label="Type name">
				<Input value={draft.typeName} placeholder="Contains..." onChange={(_, data) => set("typeName", data.value)} onKeyDown={applyOnEnter} />
			</Field>
			<div className={styles.row}>
				<Field label="Message" className={styles.half}>
					<Input
						value={draft.messageName}
						placeholder="Create, Update..."
						onChange={(_, data) => set("messageName", data.value)}
						onKeyDown={applyOnEnter}
					/>
				</Field>
				<Field label="Entity" className={styles.half}>
					<Input
						value={draft.primaryEntity}
						placeholder="account..."
						onChange={(_, data) => set("primaryEntity", data.value)}
						onKeyDown={applyOnEnter}
					/>
				</Field>
			</div>
			<Field label="Correlation id">
				<Input
					value={draft.correlationId ?? ""}
					placeholder="00000000-0000-0000-0000-000000000000"
					onChange={(_, data) => set("correlationId", data.value || null)}
					onKeyDown={applyOnEnter}
				/>
			</Field>
			<Switch label="Exceptions only" checked={draft.exceptionsOnly} onChange={(_, data) => set("exceptionsOnly", data.checked)} />
		</FilterPanel>
	);
};
