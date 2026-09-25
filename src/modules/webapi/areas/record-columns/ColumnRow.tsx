import { Button, Field, makeStyles, mergeClasses, Text, tokens, Tooltip } from "@fluentui/react-components";
import { ArrowUndo16Regular, LockClosed16Regular } from "@fluentui/react-icons";
import { memo } from "react";

import { CopyButton, type RecordLookupServices } from "@/shared/components";

import { ColumnEditor } from "./ColumnEditor";
import { copyText, type DraftCheck, type DraftValue, readOnlyLabel, type RecordColumn } from "../../lib";

const useStyles = makeStyles({
	row: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr) 56px",
		gridTemplateAreas: '"name value actions"',
		alignItems: "start",
		columnGap: "12px",
		rowGap: "4px",
		padding: "6px 8px 6px 10px",
		borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
		borderLeft: "3px solid transparent",
		contentVisibility: "auto",
		containIntrinsicSize: "auto 44px",
		"@container (max-width: 480px)": {
			gridTemplateColumns: "minmax(0, 1fr) 56px",
			gridTemplateAreas: '"name actions" "value value"',
		},
	},
	changed: {
		borderLeft: `3px solid ${tokens.colorBrandStroke1}`,
		backgroundColor: tokens.colorBrandBackground2,
	},
	invalid: {
		borderLeft: `3px solid ${tokens.colorPaletteRedBorder2}`,
	},
	name: {
		gridArea: "name",
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
		paddingTop: "2px",
	},
	logical: {
		color: tokens.colorNeutralForeground3,
		fontFamily: tokens.fontFamilyMonospace,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	value: {
		gridArea: "value",
		minWidth: 0,
	},
	readOnly: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		minHeight: "24px",
		color: tokens.colorNeutralForeground2,
		minWidth: 0,
	},
	readOnlyText: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	lock: {
		flexShrink: 0,
		color: tokens.colorNeutralForeground3,
	},
	empty: {
		color: tokens.colorNeutralForeground4,
	},
	actions: {
		gridArea: "actions",
		display: "flex",
		justifyContent: "flex-end",
		gap: "2px",
	},
});

export interface ColumnRowProps {
	row: RecordColumn;
	value: DraftValue | null;
	changed: boolean;
	check: DraftCheck | null;
	requiredCleared: boolean;
	lookupServices: RecordLookupServices;
	register: (logicalName: string, element: HTMLDivElement | null) => void;
	onChange: (row: RecordColumn, value: DraftValue) => void;
	onUndo: (logicalName: string) => void;
}

export const ColumnRow = memo(({ row, value, changed, check, requiredCleared, lookupServices, register, onChange, onUndo }: ColumnRowProps) => {
	const styles = useStyles();
	const invalid = check !== null && !check.ok;
	const validationMessage = invalid ? check.message : requiredCleared ? "This column is required, and saving will leave it empty" : undefined;

	return (
		<div
			ref={(element) => register(row.logicalName, element)}
			className={mergeClasses(styles.row, changed && styles.changed, invalid && styles.invalid)}
			data-column={row.logicalName}>
			<div className={styles.name}>
				<Text size={200} weight="semibold" truncate wrap={false} title={row.displayName}>
					{row.displayName}
				</Text>
				<Text size={100} className={styles.logical} title={row.logicalName}>
					{row.logicalName}
				</Text>
			</div>
			<div className={styles.value}>
				{row.editor !== null && value !== null ? (
					<Field size="small" validationState={invalid ? "error" : requiredCleared ? "warning" : "none"} validationMessage={validationMessage}>
						<ColumnEditor row={row} value={value} lookupServices={lookupServices} onChange={(next) => onChange(row, next)} />
					</Field>
				) : (
					<div className={styles.readOnly}>
						<Tooltip content={readOnlyLabel(row.readOnlyReason ?? "unsupported")} relationship="label">
							<LockClosed16Regular className={styles.lock} />
						</Tooltip>
						<Text
							size={200}
							className={mergeClasses(styles.readOnlyText, row.displayValue === null && styles.empty)}
							title={row.displayValue ?? undefined}>
							{row.displayValue ?? "—"}
						</Text>
					</div>
				)}
			</div>
			<div className={styles.actions}>
				{changed ? (
					<Tooltip content="Undo change" relationship="label">
						<Button appearance="subtle" size="small" icon={<ArrowUndo16Regular />} onClick={() => onUndo(row.logicalName)} />
					</Tooltip>
				) : null}
				<CopyButton text={copyText(row)} label="Copy value" appearance="subtle" size="small" iconOnly />
			</div>
		</div>
	);
});

ColumnRow.displayName = "ColumnRow";
