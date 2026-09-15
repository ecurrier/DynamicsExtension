import { Button, Dropdown, Field, makeStyles, Option, Text, tokens } from "@fluentui/react-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { type PrivilegeCell, type PrivilegeChangeArgs, privilegeCells, privilegeDepthPlan, privilegePlanSummary } from "@/modules/security/lib";
import { BulkRunDialog, DataTable, type DataTableColumn, FormRow, Grow } from "@/shared/components";
import { dedupeLogicalRoles } from "@/shared/lib";
import { type BulkRunPlan, type LogicalRole, type PrivilegeDepth, PRIVILEGE_DEPTHS } from "@/shared/types";

import { type SecurityToolsGateway } from "./useSecurityToolsBootstrap";

const useStyles = makeStyles({ caption: { color: tokens.colorNeutralForeground3 } });

interface PrivilegeEditorProps {
	gateway: SecurityToolsGateway;
}

export const PrivilegeEditor = ({ gateway }: PrivilegeEditorProps) => {
	const styles = useStyles();
	const queryClient = useQueryClient();
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
	const [selectedCellIds, setSelectedCellIds] = useState<string[]>([]);
	const [target, setTarget] = useState<PrivilegeDepth>("BusinessUnit");
	const [plan, setPlan] = useState<BulkRunPlan<PrivilegeChangeArgs> | null>(null);

	const allRoles = useQuery({
		queryKey: gateway.key("getSecurityRoles"),
		queryFn: () => gateway.ops.getSecurityRoles(),
		enabled: gateway.ready,
		staleTime: Infinity,
		retry: false,
	});
	const roles = useMemo(() => dedupeLogicalRoles(allRoles.data ?? []), [allRoles.data]);
	const selectedRoles = useMemo(() => roles.filter((role) => selectedRoleIds.includes(role.id)), [roles, selectedRoleIds]);

	const privileges = useQuery({
		queryKey: gateway.key("getRolePrivileges", { roleIds: selectedRoleIds }),
		queryFn: () => gateway.ops.getRolePrivileges({ roleIds: selectedRoleIds }),
		enabled: gateway.ready && selectedRoleIds.length > 0,
		staleTime: Infinity,
		retry: false,
	});

	const cells = useMemo(() => privilegeCells(selectedRoles, privileges.data ?? [], []), [selectedRoles, privileges.data]);
	const selectedCells = useMemo(() => cells.filter((cell) => selectedCellIds.includes(cell.id)), [cells, selectedCellIds]);

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

	const cellColumns: DataTableColumn<PrivilegeCell>[] = [
		{ id: "role", label: "Role", width: 170, render: (cell) => cell.roleName, sortValue: (cell) => cell.roleName },
		{ id: "table", label: "Table", width: 140, render: (cell) => cell.tableSchemaName, sortValue: (cell) => cell.tableSchemaName },
		{ id: "access", label: "Privilege", width: 110, render: (cell) => cell.accessType, sortValue: (cell) => cell.accessType },
		{ id: "depth", label: "Current depth", width: 140, render: (cell) => cell.depth, sortValue: (cell) => cell.depth },
	];

	const execute = async (item: { args: PrivilegeChangeArgs }) => {
		await gateway.ops.addPrivilegesRole({ roleId: item.args.roleId, privileges: [{ privilegeId: item.args.privilegeId, depth: item.args.depth }] });
	};

	return (
		<>
			<Field label="Security roles" hint="Changes apply to the root business unit copy and follow its inherited copies.">
				<DataTable
					items={roles}
					columns={roleColumns}
					getRowId={(role) => role.id}
					selectionMode="multiselect"
					selectedIds={new Set(selectedRoleIds)}
					onSelectionChange={(ids) => setSelectedRoleIds([...ids].map(String))}
					maxHeight="180px"
					autoFitColumns={false}
					emptyMessage="No security roles were returned."
				/>
			</Field>
			<FormRow>
				<Field label="New depth">
					<Dropdown
						selectedOptions={[target]}
						value={target}
						onOptionSelect={(_, data) => setTarget((data.optionValue as PrivilegeDepth) ?? "BusinessUnit")}>
						{PRIVILEGE_DEPTHS.map((depth) => (
							<Option key={depth} value={depth}>
								{depth}
							</Option>
						))}
					</Dropdown>
				</Field>
				<Grow>
					<Text size={200} className={styles.caption}>
						{privilegePlanSummary(selectedCells, target)} Depth is written with AddPrivilegesRole, so privileges you did not select are untouched.
					</Text>
				</Grow>
				<Button appearance="primary" disabled={selectedCells.length === 0} onClick={() => setPlan(privilegeDepthPlan(selectedCells, target))}>
					Review changes
				</Button>
			</FormRow>
			<DataTable
				items={cells}
				columns={cellColumns}
				getRowId={(cell) => cell.id}
				selectionMode="multiselect"
				selectedIds={new Set(selectedCellIds)}
				onSelectionChange={(ids) => setSelectedCellIds([...ids].map(String))}
				maxHeight="380px"
				autoFitColumns={false}
				emptyMessage={selectedRoleIds.length === 0 ? "Pick one or more roles to list their privileges." : "These roles have no table privileges."}
			/>
			<BulkRunDialog
				plan={plan}
				execute={execute}
				onClose={() => setPlan(null)}
				onFinished={() => void queryClient.invalidateQueries({ queryKey: gateway.key("getRolePrivileges", { roleIds: selectedRoleIds }) })}
			/>
		</>
	);
};
