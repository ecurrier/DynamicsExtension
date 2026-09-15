import { Field, makeStyles, Switch, Text, tokens } from "@fluentui/react-components";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { compareRoleMatrix, differingRows, roleCompareToText, type RoleCompareRow } from "@/modules/security/lib";
import { CopyButton, DataTable, type DataTableColumn, FormRow, Grow } from "@/shared/components";
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
	const [showAll, setShowAll] = useState(false);

	const allRoles = useQuery({
		queryKey: gateway.key("getSecurityRoles"),
		queryFn: () => gateway.ops.getSecurityRoles(),
		enabled: gateway.ready,
		staleTime: Infinity,
		retry: false,
	});
	const roles = useMemo(() => dedupeLogicalRoles(allRoles.data ?? []), [allRoles.data]);
	const selected = useMemo(() => roles.filter((role) => selectedIds.includes(role.id)), [roles, selectedIds]);

	const privileges = useQuery({
		queryKey: gateway.key("getRolePrivileges", { roleIds: selectedIds }),
		queryFn: () => gateway.ops.getRolePrivileges({ roleIds: selectedIds }),
		enabled: gateway.ready && selectedIds.length >= 2,
		staleTime: Infinity,
		retry: false,
	});

	const allRows = useMemo(() => compareRoleMatrix(selected, privileges.data ?? []), [selected, privileges.data]);
	const rows = showAll ? allRows : differingRows(allRows, selected);

	const roleColumns: DataTableColumn<LogicalRole>[] = [
		{ id: "name", label: "Security role", width: 240, render: (role) => role.name, sortValue: (role) => role.name },
		{
			id: "copies",
			label: "Business units",
			width: 130,
			render: (role) => (role.copies === 1 ? "1" : `${role.copies} copies`),
			sortValue: (role) => role.copies,
		},
	];

	const matrixColumns: DataTableColumn<RoleCompareRow>[] = [
		{ id: "table", label: "Table", width: 160, render: (row) => row.tableSchemaName, sortValue: (row) => row.tableSchemaName },
		{ id: "privilege", label: "Privilege", width: 120, render: (row) => row.accessType, sortValue: (row) => row.accessType },
		...selected.map<DataTableColumn<RoleCompareRow>>((role) => ({
			id: role.id,
			label: role.name,
			width: 150,
			render: (row) => row.depths[role.id] ?? "None",
			sortValue: (row) => row.depths[role.id] ?? "None",
		})),
	];

	return (
		<>
			<Field label="Security roles to compare" hint="Pick two or more. Roles are listed once per logical role, not once per business unit copy.">
				<DataTable
					items={roles}
					columns={roleColumns}
					getRowId={(role) => role.id}
					selectionMode="multiselect"
					selectedIds={new Set(selectedIds)}
					onSelectionChange={(ids) => setSelectedIds([...ids].map(String))}
					maxHeight="200px"
					autoFitColumns={false}
					emptyMessage="No security roles were returned."
				/>
			</Field>
			<FormRow>
				<Switch checked={showAll} label="Show privileges they agree on" onChange={(_, data) => setShowAll(data.checked)} />
				<Grow>
					<Text size={200} className={styles.caption}>
						{selectedIds.length < 2
							? "Pick at least two roles."
							: `${rows.length} of ${allRows.length} privileges ${showAll ? "shown" : "differ"} across ${selected.length} roles.`}
					</Text>
				</Grow>
				<CopyButton text={rows.length > 0 ? roleCompareToText(rows, selected) : null} label="Copy" successMessage="Comparison copied to clipboard" />
			</FormRow>
			<DataTable
				items={rows}
				columns={matrixColumns}
				getRowId={(row) => row.id}
				maxHeight="420px"
				autoFitColumns={false}
				emptyMessage={selectedIds.length < 2 ? "Pick at least two roles to compare." : "These roles have the same privileges."}
			/>
		</>
	);
};
