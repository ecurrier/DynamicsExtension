import {
	Badge,
	type BadgeProps,
	Button,
	Dialog,
	DialogActions,
	DialogBody,
	DialogContent,
	DialogSurface,
	DialogTitle,
	makeStyles,
	Text,
	tokens,
} from "@fluentui/react-components";

import { usePageMutation } from "@/messaging/client";
import { ControlStateBadges, CopyButton, DataTable, type DataTableColumn, EmptyState, FormStack } from "@/shared/components";
import { type DirtyColumnsResult } from "@/shared/types";

import { type DirtyColumnFinding, dirtyColumnFindings, dirtyColumnsSummary, dirtyColumnsToText, SUBMIT_OUTCOME_LABELS, type SubmitOutcome } from "../lib";

const OUTCOME_COLORS: Record<SubmitOutcome, BadgeProps["color"]> = {
	saved: "success",
	always: "informative",
	skipped: "danger",
};

const useStyles = makeStyles({
	surface: {
		maxWidth: "720px",
	},
	caption: {
		color: tokens.colorNeutralForeground3,
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
	},
	badges: {
		display: "inline-flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: "4px",
	},
});

interface DirtyColumnsDialogProps {
	result: DirtyColumnsResult | null;
	onClose: () => void;
}

export const DirtyColumnsDialog = ({ result, onClose }: DirtyColumnsDialogProps) => {
	const styles = useStyles();
	const reveal = usePageMutation("utilities.revealFormColumn");
	const findings = result ? dirtyColumnFindings(result) : [];

	const columns: DataTableColumn<DirtyColumnFinding>[] = [
		{
			id: "label",
			label: "Column",
			width: 120,
			render: (finding) => <span title={finding.logicalName}>{finding.displayName}</span>,
			sortValue: (finding) => finding.displayName,
		},
		{
			id: "name",
			label: "Logical name",
			width: 125,
			render: (finding) => (
				<span className={styles.mono} title={finding.logicalName}>
					{finding.logicalName}
				</span>
			),
			sortValue: (finding) => finding.logicalName,
		},
		{
			id: "value",
			label: "Value",
			width: 170,
			render: (finding) => <span title={finding.value}>{finding.value}</span>,
			sortValue: (finding) => finding.value,
		},
		{
			id: "state",
			label: "On save",
			width: 160,
			render: (finding) => (
				<span className={styles.badges}>
					<Badge appearance="tint" size="small" color={OUTCOME_COLORS[finding.outcome]}>
						{SUBMIT_OUTCOME_LABELS[finding.outcome]}
					</Badge>
					{finding.onForm ? (
						<ControlStateBadges tags={finding.tags} />
					) : (
						<Badge appearance="tint" size="small" color="subtle">
							Not on form
						</Badge>
					)}
				</span>
			),
			sortValue: (finding) => finding.state,
		},
	];

	const locate = (finding: DirtyColumnFinding) => {
		if (finding.onForm && !reveal.isPending) {
			reveal.mutate({ logicalName: finding.logicalName, show: false });
		}
	};

	return (
		<Dialog open={!!result} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
			<DialogSurface className={styles.surface}>
				<DialogBody>
					<DialogTitle>Dirty Columns</DialogTitle>
					<DialogContent>
						{result ? (
							<FormStack>
								<Text size={200} className={styles.caption}>
									{dirtyColumnsSummary(result)}
									{findings.length > 0 ? " Select a row to scroll to it on the form." : ""}
								</Text>
								{findings.length === 0 ? (
									<EmptyState intent="info" title="No unsaved changes on this form.">
										Nothing has changed since the record was loaded or last saved.
									</EmptyState>
								) : (
									<DataTable
										items={findings}
										columns={columns}
										getRowId={(finding) => finding.logicalName}
										maxHeight="280px"
										autoFitColumns={false}
										onRowClick={locate}
									/>
								)}
							</FormStack>
						) : null}
					</DialogContent>
					<DialogActions>
						<CopyButton text={result ? dirtyColumnsToText(result) : null} label="Copy" successMessage="Unsaved changes copied to clipboard" />
						<Button appearance="primary" onClick={onClose}>
							Close
						</Button>
					</DialogActions>
				</DialogBody>
			</DialogSurface>
		</Dialog>
	);
};
