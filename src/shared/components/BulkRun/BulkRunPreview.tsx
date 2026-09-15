import { makeStyles, MessageBar, MessageBarBody, Text, tokens } from "@fluentui/react-components";

import { type BulkRunItem, type BulkRunPlan } from "@/shared/types";

import { DataTable, type DataTableColumn } from "../DataTable";
import { FormStack } from "../Layout";

const useStyles = makeStyles({
	caption: {
		color: tokens.colorNeutralForeground3,
	},
});

interface BulkRunPreviewProps<TArgs> {
	plan: BulkRunPlan<TArgs>;
	warning?: string;
}

export const BulkRunPreview = <TArgs,>({ plan, warning }: BulkRunPreviewProps<TArgs>) => {
	const styles = useStyles();
	const columns: DataTableColumn<BulkRunItem<TArgs>>[] = [
		{ id: "label", label: "Change", width: 240, render: (item) => <span title={item.label}>{item.label}</span>, sortValue: (item) => item.label },
		{ id: "detail", label: "What happens", width: 280, render: (item) => <span title={item.detail}>{item.detail}</span>, sortValue: (item) => item.detail },
	];
	return (
		<FormStack>
			<Text size={200} className={styles.caption}>
				{plan.items.length === 1 ? "1 change will be applied." : `${plan.items.length} changes will be applied.`} Nothing has been written yet.
			</Text>
			<MessageBar intent="warning" layout="multiline">
				<MessageBarBody>
					These changes are applied one at a time and cannot be undone as a batch. Keep this window open until the run finishes; if it stops early,
					anything unfinished can be retried.
					{warning ? ` ${warning}` : ""}
				</MessageBarBody>
			</MessageBar>
			<DataTable items={plan.items} columns={columns} getRowId={(item) => item.id} maxHeight="260px" autoFitColumns={false} />
		</FormStack>
	);
};
