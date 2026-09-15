import { Field, makeStyles, Switch, Text, tokens } from "@fluentui/react-components";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { compareRoleMatrix, differingRows, roleCompareToText, type RoleCompareRow } from "@/modules/security/lib";
import {
	CopyButton,
	DataTable,
	type DataTableColumn,
	FormRow,
	Grow,
	PRIVILEGE_ACCESS_COLORS,
	PRIVILEGE_DEPTH_COLORS,
	TableFilter,
	useTableFilter,
	ValueChip,
} from "@/shared/components";
import { dedupeLogicalRoles } from "@/shared/lib";
import { type LogicalRole } from "@/shared/types";

import { type SecurityToolsGateway } from "./useSecurityToolsBootstrap";

const useStyles = makeStyles({ caption: { color: tokens.colorNeutralForeground3 } });

interface RoleCompareProps {
	gateway: SecurityToolsGateway;
}

export const RoleCompare = ({ gateway }: RoleCompareProps) => {
	const styles = useStyles();
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [differencesOnly, setDifferencesOnly] = useState(true);

	const allRoles = useQuery({
		queryKey: gateway.key("getSecurityRoles"),
		queryFn: () => gateway.ops.getSecurityRoles(),
		enabled: gateway.ready,
		staleTime: Infinity,
		retry: false,
	});
	const roles = useMemo(() => dedupeLogicalRoles(allRoles.data ?? []), [allRoles.data]);
	const selected = useMemo(() => roles.filter((role) => selectedIds.includes(role.id)), [roles, selectedIds]);
	const roleFilter = useTableFilter(roles, (role) => [role.name]);

	const privileges = useQuery({
		queryKey: gateway.key("getRolePrivileges", { roleIds: selectedIds }),
		queryFn: () => gateway.ops.getRolePrivileges({ roleIds: selectedIds }),
		enabled: gateway.ready && selectedIds.length >= 2,
		staleTime: Infinity,
		retry: false,
	});

	const allRows = useMemo(() => compareRoleMatrix(selected, privileges.data ?? []), [selected, privileges.data]);
	const differing = useMemo(() => differingRows(allRows, selected), [allRows, selected]);
	const shownRows = differencesOnly ? differing : allRows;
	const matrixFilter = useTableFilter(shownRows, (row) => [row.tableSchemaName, row.accessType]);

	const roleColumns: DataTableColumn<LogicalRole>[] = [
		{ id: "name", label: "Security role", width: 320, render: (role) => role.name, sortValue: (role) => role.name },
	];

	const matrixColumns: DataTableColumn<RoleCompareRow>[] = [
		{ id: "table", label: "Table", width: 160, render: (row) => row.tableSchemaName, sortValue: (row) => row.tableSchemaName },
		{
			id: "privilege",
			label: "Privilege",
			width: 120,
			render: (row) => <ValueChip value={row.accessType} palette={PRIVILEGE_ACCESS_COLORS} />,
			sortValue: (row) => row.accessType,
		},
		...selected.map<DataTableColumn<RoleCompareRow>>((role) => ({
			id: role.id,
			label: role.name,
			width: 150,
			render: (row) => <ValueChip value={row.depths[role.id] ?? "None"} palette={PRIVILEGE_DEPTH_COLORS} />,
			sortValue: (row) => row.depths[role.id] ?? "None",
		})),
	];

	const hidden = allRows.length - differing.length;

	return (
		<>
			<Field label="Security roles to compare" hint="Pick two or more. Each role is listed once and compared at its root business unit.">
				<FormRow>
					<Grow>
						<TableFilter
							query={roleFilter.query}
							onChange={roleFilter.setQuery}
							shown={roleFilter.shown}
							total={roleFilter.total}
							placeholder="Filter roles by name or prefix"
						/>
					</Grow>
				</FormRow>
				<DataTable
					items={roleFilter.filtered}
					columns={roleColumns}
					getRowId={(role) => role.id}
					selectionMode="multiselect"
					selectedIds={new Set(selectedIds)}
					onSelectionChange={(ids) => setSelectedIds([...ids].map(String))}
					maxHeight="220px"
					autoFitColumns={false}
					emptyMessage={roleFilter.query ? "No roles match that filter." : "No security roles were returned."}
				/>
			</Field>
			<FormRow>
				<Switch
					checked={differencesOnly}
					label="Differences only"
					onChange={(_, data) => {
						setDifferencesOnly(data.checked);
						matrixFilter.setQuery("");
					}}
				/>
				<Grow>
					<Text size={200} className={styles.caption}>
						{selectedIds.length < 2
							? "Pick at least two roles."
							: differencesOnly
								? `${differing.length} of ${allRows.length} privileges differ across ${selected.length} roles, ${hidden} identical rows hidden.`
								: `All ${allRows.length} privileges across ${selected.length} roles.`}
					</Text>
				</Grow>
				<CopyButton
					text={matrixFilter.filtered.length > 0 ? roleCompareToText(matrixFilter.filtered, selected) : null}
					label="Copy"
					successMessage="Comparison copied to clipboard"
				/>
			</FormRow>
			{shownRows.length > 0 ? (
				<FormRow>
					<Grow>
						<TableFilter
							query={matrixFilter.query}
							onChange={matrixFilter.setQuery}
							shown={matrixFilter.shown}
							total={matrixFilter.total}
							placeholder="Filter by table or privilege"
						/>
					</Grow>
				</FormRow>
			) : null}
			<DataTable
				items={matrixFilter.filtered}
				columns={matrixColumns}
				getRowId={(row) => row.id}
				maxHeight="420px"
				autoFitColumns={false}
				emptyMessage={
					selectedIds.length < 2
						? "Pick at least two roles to compare."
						: differencesOnly
							? "These roles have the same privileges."
							: "No privileges to show."
				}
			/>
		</>
	);
};
