import { Badge, type BadgeProps, makeStyles, Text, tokens } from "@fluentui/react-components";

import { bulkRunSummary } from "@/shared/lib";
import { type BulkRunOutcomeKind, type BulkRunResult } from "@/shared/types";

import { DataTable, type DataTableColumn } from "../DataTable";
import { FormStack } from "../Layout";

const OUTCOME_COLORS: Record<BulkRunOutcomeKind, BadgeProps["color"]> = {
	succeeded: "success",
	failed: "danger",
	skipped: "warning",
};

const OUTCOME_LABELS: Record<BulkRunOutcomeKind, string> = {
	succeeded: "Applied",
	failed: "Failed",
	skipped: "Never ran",
};

const useStyles = makeStyles({
	caption: {
		color: tokens.colorNeutralForeground3,
	},
});

interface BulkRunRow {
	id: string;
	label: string;
	kind: BulkRunOutcomeKind;
	message: string;
}

interface BulkRunResultViewProps<TArgs> {
	result: BulkRunResult<TArgs>;
}

export const BulkRunResultView = <TArgs,>({ result }: BulkRunResultViewProps<TArgs>) => {
	const styles = useStyles();
	const labels = new Map(result.plan.items.map((item) => [item.id, item.label]));
	const rows: BulkRunRow[] = result.outcomes.map((outcome) => ({
		id: outcome.id,
		label: labels.get(outcome.id) ?? outcome.id,
		kind: outcome.kind,
		message: outcome.message ?? "",
	}));
	const columns: DataTableColumn<BulkRunRow>[] = [
		{ id: "label", label: "Change", width: 230, render: (row) => <span title={row.label}>{row.label}</span>, sortValue: (row) => row.label },
		{
			id: "outcome",
			label: "Result",
			width: 110,
			render: (row) => (
				<Badge appearance="tint" size="small" color={OUTCOME_COLORS[row.kind]}>
					{OUTCOME_LABELS[row.kind]}
				</Badge>
			),
			sortValue: (row) => row.kind,
		},
		{ id: "message", label: "Detail", width: 260, render: (row) => <span title={row.message}>{row.message}</span>, sortValue: (row) => row.message },
	];
	return (
		<FormStack>
			<Text size={200} className={styles.caption}>
				{bulkRunSummary(result)}
			</Text>
			<DataTable items={rows} columns={columns} getRowId={(row) => row.id} maxHeight="260px" autoFitColumns={false} />
		</FormStack>
	);
};
