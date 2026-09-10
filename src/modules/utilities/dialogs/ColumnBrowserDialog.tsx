import {
	Button,
	Dialog,
	DialogActions,
	DialogBody,
	DialogContent,
	DialogSurface,
	DialogTitle,
	Input,
	makeStyles,
	Menu,
	MenuButton,
	MenuDivider,
	MenuItem,
	MenuList,
	MenuPopover,
	MenuTrigger,
	Text,
	tokens,
} from "@fluentui/react-components";
import { Copy20Regular, Eye20Regular, MoreHorizontal20Regular, Search20Regular } from "@fluentui/react-icons";
import { useCallback, useMemo, useState } from "react";

import { DataTable, type DataTableColumn, FormStack, useAppToast } from "@/shared/components";
import { copyToClipboard } from "@/shared/lib";
import { type CodegenColumn, type CodegenTable } from "@/shared/types";

import { columnExtra, columnTypeLabel, filterColumns, REQUIRED_LABELS } from "../lib";

const useStyles = makeStyles({
	surface: {
		maxWidth: "900px",
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
	},
	caption: {
		color: tokens.colorNeutralForeground3,
	},
});

interface ColumnBrowserDialogProps {
	open: boolean;
	table: CodegenTable | null;
	formAttributes: Set<string> | null;
	onClose: () => void;
	onFindOnForm: (logicalName: string) => void;
}

export const ColumnBrowserDialog = ({ open, table, formAttributes, onClose, onFindOnForm }: ColumnBrowserDialogProps) => {
	const styles = useStyles();
	const toast = useAppToast();
	const [filter, setFilter] = useState("");
	const rows = useMemo(() => filterColumns(table?.columns ?? [], filter), [table, filter]);

	const copy = useCallback(
		async (label: string, value: string) => {
			try {
				await copyToClipboard(value);
				toast.success(`${label} copied`, value);
			} catch (error) {
				toast.error(`Could not copy the ${label.toLowerCase()}`, error);
			}
		},
		[toast]
	);

	const columns = useMemo<DataTableColumn<CodegenColumn>[]>(
		() => [
			{
				id: "actions",
				label: "",
				width: 48,
				render: (row) => {
					const onForm = formAttributes?.has(row.logicalName) ?? false;
					return (
						<Menu>
							<MenuTrigger disableButtonEnhancement>
								<MenuButton appearance="subtle" size="small" icon={<MoreHorizontal20Regular />} aria-label={`Actions for ${row.logicalName}`} />
							</MenuTrigger>
							<MenuPopover>
								<MenuList>
									<MenuItem icon={<Copy20Regular />} onClick={() => void copy("Logical name", row.logicalName)}>
										Copy logical name
									</MenuItem>
									<MenuItem icon={<Copy20Regular />} onClick={() => void copy("Schema name", row.schemaName)}>
										Copy schema name
									</MenuItem>
									<MenuItem icon={<Copy20Regular />} onClick={() => void copy("Display name", row.displayName)}>
										Copy display name
									</MenuItem>
									<MenuDivider />
									<MenuItem
										icon={<Eye20Regular />}
										disabled={!onForm}
										title={formAttributes === null ? "Open a record form to locate columns on it" : undefined}
										onClick={() => onFindOnForm(row.logicalName)}>
										Find on form
									</MenuItem>
								</MenuList>
							</MenuPopover>
						</Menu>
					);
				},
			},
			{
				id: "display",
				label: "Display name",
				width: 170,
				render: (row) => row.displayName,
				sortValue: (row) => row.displayName,
			},
			{
				id: "logical",
				label: "Logical name",
				width: 170,
				render: (row) => <span className={styles.mono}>{row.logicalName}</span>,
				sortValue: (row) => row.logicalName,
			},
			{
				id: "schema",
				label: "Schema name",
				width: 170,
				render: (row) => <span className={styles.mono}>{row.schemaName}</span>,
				sortValue: (row) => row.schemaName,
			},
			{
				id: "type",
				label: "Type",
				width: 110,
				render: (row) => columnTypeLabel(row),
				sortValue: (row) => columnTypeLabel(row),
			},
			{
				id: "required",
				label: "Required",
				width: 110,
				render: (row) => REQUIRED_LABELS[row.requiredLevel],
				sortValue: (row) => REQUIRED_LABELS[row.requiredLevel],
			},
			{
				id: "extra",
				label: "Details",
				width: 180,
				render: (row) => columnExtra(row),
				sortValue: (row) => columnExtra(row),
			},
		],
		[copy, formAttributes, onFindOnForm, styles.mono]
	);

	return (
		<Dialog open={open} onOpenChange={(_, data) => (data.open ? undefined : onClose())}>
			<DialogSurface className={styles.surface}>
				<DialogBody>
					<DialogTitle>{table ? `${table.displayName} columns (${table.logicalName})` : "Column Browser"}</DialogTitle>
					<DialogContent>
						<FormStack>
							<Input
								contentBefore={<Search20Regular />}
								placeholder="Search by display, logical, or schema name..."
								value={filter}
								onChange={(_, data) => setFilter(data.value)}
							/>
							<Text size={200} className={styles.caption}>
								{rows.length} of {table?.columns.length ?? 0} columns
								{formAttributes === null ? ". Open a record form to locate a column on it." : ""}
							</Text>
							<DataTable
								items={rows}
								columns={columns}
								getRowId={(row) => row.logicalName}
								pageSize={50}
								maxHeight="400px"
								autoFitColumns={false}
								emptyMessage="No columns match the search"
							/>
						</FormStack>
					</DialogContent>
					<DialogActions>
						<Button appearance="secondary" onClick={onClose}>
							Close
						</Button>
					</DialogActions>
				</DialogBody>
			</DialogSurface>
		</Dialog>
	);
};
