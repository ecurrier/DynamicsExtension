import { Badge, Button, makeStyles, type TableRowId, Text, tokens } from "@fluentui/react-components";
import { ArrowReset20Regular } from "@fluentui/react-icons";
import { useMemo } from "react";

import { DataTable, type DataTableColumn, FormRow, Grow } from "@/shared/components";
import { type TransportAttribute } from "@/shared/types";

import { defaultSelection } from "../lib";

const useStyles = makeStyles({
	logical: {
		color: tokens.colorNeutralForeground3,
		fontSize: tokens.fontSizeBase200,
		marginLeft: "6px",
	},
	flags: {
		display: "inline-flex",
		gap: "4px",
	},
	hint: {
		color: tokens.colorNeutralForeground3,
	},
});

interface FieldSelectorProps {
	fields: TransportAttribute[];
	selected: Set<string>;
	onChange: (selected: Set<string>) => void;
}

export const FieldSelector = ({ fields, selected, onChange }: FieldSelectorProps) => {
	const styles = useStyles();
	const columns = useMemo<DataTableColumn<TransportAttribute>[]>(
		() => [
			{
				id: "name",
				label: "Field",
				width: 260,
				render: (field) => (
					<span>
						{field.displayName}
						<span className={styles.logical}>{field.logicalName}</span>
					</span>
				),
				sortValue: (field) => field.displayName,
			},
			{
				id: "type",
				label: "Type",
				width: 110,
				render: (field) => field.attributeType,
				sortValue: (field) => field.attributeType,
			},
			{
				id: "flags",
				label: "Writable",
				width: 150,
				render: (field) => (
					<span className={styles.flags}>
						{field.isValidForCreate ? (
							<Badge appearance="tint" size="small" color="success">
								Create
							</Badge>
						) : null}
						{field.isValidForUpdate ? (
							<Badge appearance="tint" size="small" color="brand">
								Update
							</Badge>
						) : null}
					</span>
				),
				sortValue: (field) => (field.isValidForCreate ? 2 : 0) + (field.isValidForUpdate ? 1 : 0),
			},
		],
		[styles]
	);
	const selectedIds = useMemo<Set<TableRowId>>(() => new Set<TableRowId>(selected), [selected]);

	return (
		<>
			<FormRow>
				<Grow>
					<Text size={200} className={styles.hint}>
						{selected.size} of {fields.length} fields will be written. System and audit fields are never copied; owner, state, and currency are off
						by default because their ids rarely match across environments.
					</Text>
				</Grow>
				<Button size="small" icon={<ArrowReset20Regular />} onClick={() => onChange(defaultSelection(fields))}>
					Reset to defaults
				</Button>
			</FormRow>
			<DataTable
				items={fields}
				columns={columns}
				getRowId={(field) => field.logicalName}
				fill
				selectionMode="multiselect"
				selectedIds={selectedIds}
				onSelectionChange={(ids) => onChange(new Set([...ids].map(String)))}
				emptyMessage="No writable fields from the source rows exist in the target entity"
			/>
		</>
	);
};
