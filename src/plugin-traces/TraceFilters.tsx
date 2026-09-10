import { Button, Dropdown, Field, Input, makeStyles, Option, Switch, Tooltip } from "@fluentui/react-components";
import { ArrowClockwise20Regular, Filter20Regular } from "@fluentui/react-icons";
import { type KeyboardEvent } from "react";

import { TRACE_TOPS, type TraceQuery, type TraceTop } from "@/shared/types";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "flex-end",
		gap: "8px",
	},
	narrow: {
		width: "190px",
	},
	date: {
		width: "232px",
	},
	wide: {
		width: "240px",
		flex: "1 1 200px",
	},
	actions: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		marginLeft: "auto",
	},
});

interface TraceFiltersProps {
	draft: TraceQuery;
	loading: boolean;
	autoRefresh: boolean;
	onChange: (query: TraceQuery) => void;
	onApply: () => void;
	onRefresh: () => void;
	onAutoRefreshChange: (enabled: boolean) => void;
}

export const TraceFilters = ({ draft, loading, autoRefresh, onChange, onApply, onRefresh, onAutoRefreshChange }: TraceFiltersProps) => {
	const styles = useStyles();
	const set = <K extends keyof TraceQuery>(key: K, value: TraceQuery[K]) => onChange({ ...draft, [key]: value });
	const applyOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			onApply();
		}
	};

	return (
		<div className={styles.root}>
			<Field label="From" className={styles.date}>
				<Input type="datetime-local" value={draft.from ?? ""} onChange={(_, data) => set("from", data.value || null)} onKeyDown={applyOnEnter} />
			</Field>
			<Field label="To" className={styles.date}>
				<Input type="datetime-local" value={draft.to ?? ""} onChange={(_, data) => set("to", data.value || null)} onKeyDown={applyOnEnter} />
			</Field>
			<Field label="Type name" className={styles.wide}>
				<Input value={draft.typeName} placeholder="Contains..." onChange={(_, data) => set("typeName", data.value)} onKeyDown={applyOnEnter} />
			</Field>
			<Field label="Message" className={styles.narrow}>
				<Input
					value={draft.messageName}
					placeholder="Create, Update..."
					onChange={(_, data) => set("messageName", data.value)}
					onKeyDown={applyOnEnter}
				/>
			</Field>
			<Field label="Entity" className={styles.narrow}>
				<Input value={draft.primaryEntity} placeholder="account..." onChange={(_, data) => set("primaryEntity", data.value)} onKeyDown={applyOnEnter} />
			</Field>
			<Field label="Correlation id" className={styles.wide}>
				<Input
					value={draft.correlationId ?? ""}
					placeholder="00000000-0000-0000-0000-000000000000"
					onChange={(_, data) => set("correlationId", data.value || null)}
					onKeyDown={applyOnEnter}
				/>
			</Field>
			<Field label="Top">
				<Dropdown
					value={String(draft.top)}
					selectedOptions={[String(draft.top)]}
					style={{ minWidth: "100px" }}
					onOptionSelect={(_, data) => data.optionValue && set("top", Number(data.optionValue) as TraceTop)}>
					{TRACE_TOPS.map((top) => (
						<Option key={top} value={String(top)} text={String(top)}>
							{top}
						</Option>
					))}
				</Dropdown>
			</Field>
			<Switch label="Exceptions only" checked={draft.exceptionsOnly} onChange={(_, data) => set("exceptionsOnly", data.checked)} />
			<div className={styles.actions}>
				<Switch label="Auto-refresh" checked={autoRefresh} onChange={(_, data) => onAutoRefreshChange(data.checked)} />
				<Tooltip content="Reload with the current filters" relationship="label">
					<Button icon={<ArrowClockwise20Regular />} disabled={loading} onClick={onRefresh} aria-label="Refresh" />
				</Tooltip>
				<Button appearance="primary" icon={<Filter20Regular />} disabled={loading} onClick={onApply}>
					Apply filters
				</Button>
			</div>
		</div>
	);
};
