import { AccordionHeader, Badge, Button, makeStyles, mergeClasses, Text, tokens } from "@fluentui/react-components";
import { ArrowUpload20Regular } from "@fluentui/react-icons";
import { type DragEvent, type ReactNode, useMemo, useState } from "react";

import { DataTable, type DataTableColumn, FillAccordionItem, FillAccordionPanel } from "@/shared/components";
import { type PluginPackage } from "@/shared/types";

import { describeCounts, formatTimestamp, packageCounts, type PackageTypeRow, packageTypeRows } from "../../lib";

export const PACKAGE_GRID = "minmax(160px, 2fr) 72px 150px minmax(80px, 1fr)";

const useStyles = makeStyles({
	row: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		paddingRight: "8px",
		borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
	},
	dropping: {
		outline: `2px dashed ${tokens.colorBrandStroke1}`,
		outlineOffset: "-2px",
		backgroundColor: tokens.colorBrandBackground2,
	},
	header: {
		flex: 1,
		minWidth: 0,
	},
	grid: {
		display: "grid",
		gridTemplateColumns: PACKAGE_GRID,
		gap: "8px",
		alignItems: "center",
		width: "100%",
		minWidth: 0,
	},
	cell: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		minWidth: 0,
	},
	name: {
		display: "flex",
		flexDirection: "column",
		minWidth: 0,
	},
	title: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		minWidth: 0,
	},
	caption: {
		color: tokens.colorNeutralForeground3,
		fontSize: tokens.fontSizeBase200,
	},
	mono: {
		fontFamily: tokens.fontFamilyMonospace,
		fontSize: tokens.fontSizeBase200,
	},
	panel: {
		paddingLeft: "12px",
		paddingRight: "8px",
		gap: "8px",
	},
});

export interface PackageRowProps {
	package: PluginPackage;
	updateDisabled: boolean;
	badges?: ReactNode;
	details?: ReactNode;
	onUpdate: (pkg: PluginPackage) => void;
	onDropFile: (pkg: PluginPackage, transfer: DataTransfer) => void;
}

const hasFiles = (transfer: DataTransfer): boolean => Array.from(transfer.types).includes("Files");

export const PackageRow = ({ package: pkg, updateDisabled, badges, details, onUpdate, onDropFile }: PackageRowProps) => {
	const styles = useStyles();
	const [dropping, setDropping] = useState(false);
	const rows = useMemo(() => packageTypeRows(pkg), [pkg]);
	const counts = useMemo(() => describeCounts(packageCounts(pkg)), [pkg]);
	const columns = useMemo<DataTableColumn<PackageTypeRow>[]>(
		() => [
			{
				id: "assembly",
				label: "Assembly",
				width: 170,
				render: (row) => (
					<span title={row.assemblyName}>
						{row.assemblyName}
						{row.assemblyVersion ? ` ${row.assemblyVersion}` : ""}
					</span>
				),
				sortValue: (row) => row.assemblyName,
			},
			{
				id: "type",
				label: "Plug-in type",
				width: 280,
				render: (row) => (
					<span className={styles.mono} title={row.typeName}>
						{row.typeName}
					</span>
				),
				sortValue: (row) => row.typeName,
			},
			{
				id: "friendly",
				label: "Friendly name",
				width: 160,
				render: (row) => row.friendlyName ?? "",
				sortValue: (row) => row.friendlyName ?? "",
			},
			{
				id: "steps",
				label: "Steps",
				width: 70,
				render: (row) => row.stepCount,
				sortValue: (row) => row.stepCount,
			},
		],
		[styles.mono]
	);

	const onDragOver = (event: DragEvent<HTMLDivElement>) => {
		if (!hasFiles(event.dataTransfer)) {
			return;
		}
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
		setDropping(true);
	};

	const onDrop = (event: DragEvent<HTMLDivElement>) => {
		setDropping(false);
		if (!hasFiles(event.dataTransfer)) {
			return;
		}
		event.preventDefault();
		onDropFile(pkg, event.dataTransfer);
	};

	return (
		<FillAccordionItem value={pkg.id}>
			<div
				className={mergeClasses(styles.row, dropping && styles.dropping)}
				onDragOver={onDragOver}
				onDragLeave={() => setDropping(false)}
				onDrop={onDrop}>
				<AccordionHeader size="small" expandIconPosition="start" className={styles.header} button={{ "aria-label": `${pkg.name} details` }}>
					<div className={styles.grid}>
						<div className={styles.name}>
							<span className={styles.title}>
								<span className={styles.cell} title={pkg.uniqueName}>
									{pkg.name}
								</span>
								{pkg.isManaged ? (
									<Badge appearance="outline" size="small">
										Managed
									</Badge>
								) : null}
								{badges}
							</span>
							<span className={mergeClasses(styles.cell, styles.caption)}>{counts}</span>
						</div>
						<span className={styles.cell} title={pkg.version ?? undefined}>
							{pkg.version ?? ""}
						</span>
						<span className={styles.cell} title={pkg.modifiedOn ?? undefined}>
							{formatTimestamp(pkg.modifiedOn)}
						</span>
						<span className={styles.cell} title={pkg.modifiedBy ?? undefined}>
							{pkg.modifiedBy ?? ""}
						</span>
					</div>
				</AccordionHeader>
				<Button size="small" icon={<ArrowUpload20Regular />} disabled={updateDisabled} onClick={() => onUpdate(pkg)}>
					Update
				</Button>
			</div>
			<FillAccordionPanel className={styles.panel}>
				{details}
				<DataTable
					items={rows}
					columns={columns}
					getRowId={(row) => `${row.assemblyName}/${row.typeName}`}
					autoFitColumns={false}
					maxHeight="240px"
					emptyMessage="No plug-in types in this package"
				/>
				{rows.length > 0 ? (
					<Text size={200} className={styles.caption}>
						Step counts include every registered step, enabled or disabled.
					</Text>
				) : null}
			</FillAccordionPanel>
		</FillAccordionItem>
	);
};
