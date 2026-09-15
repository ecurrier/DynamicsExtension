import { Button, Dropdown, Field, makeStyles, Option, Text, tokens } from "@fluentui/react-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useConnectableEnvironments } from "@/modules/settings";
import { AreaContainer, BulkRunDialog, ConnectionPicker, DataTable, type DataTableColumn, FormRow, Grow, PageRequirementGate } from "@/shared/components";
import { type ConnectionTarget } from "@/shared/connections";
import { dedupeLogicalRoles } from "@/shared/lib";
import { type BulkRunPlan, type LogicalRole, type SystemUser } from "@/shared/types";

import { UserSearch } from "./UserSearch";
import { useSecurityGateway } from "../../hooks";
import { type BulkUserChange, bulkUserPlan, bulkUserSummary, type RoleDirection } from "../../lib";

const useStyles = makeStyles({
	caption: { color: tokens.colorNeutralForeground3 },
	columns: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr)",
		gap: "12px",
		"@container (min-width: 720px)": { gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" },
	},
	container: { containerType: "inline-size" },
});

export const BulkUsersArea = () => {
	const styles = useStyles();
	const queryClient = useQueryClient();
	const { environments } = useConnectableEnvironments();
	const [connection, setConnection] = useState<ConnectionTarget>({ kind: "page" });
	const [selectedUsers, setSelectedUsers] = useState<SystemUser[]>([]);
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
	const [direction, setDirection] = useState<RoleDirection>("add");
	const [plan, setPlan] = useState<BulkRunPlan<BulkUserChange> | null>(null);
	const gateway = useSecurityGateway(connection);

	const allRoles = useQuery({
		queryKey: gateway.key("getSecurityRoles"),
		queryFn: () => gateway.ops.getSecurityRoles(),
		enabled: gateway.ready,
		staleTime: Infinity,
		retry: false,
	});

	const roles = useMemo(() => dedupeLogicalRoles(allRoles.data ?? []), [allRoles.data]);
	const selectedRoles = useMemo(() => roles.filter((role) => selectedRoleIds.includes(role.id)), [roles, selectedRoleIds]);

	const roleColumns: DataTableColumn<LogicalRole>[] = [
		{ id: "name", label: "Security role", width: 220, render: (role) => role.name, sortValue: (role) => role.name },
		{
			id: "copies",
			label: "Business units",
			width: 120,
			render: (role) => (role.copies === 1 ? "1" : `${role.copies} copies`),
			sortValue: (role) => role.copies,
		},
	];

	const execute = async (item: { args: BulkUserChange }) => {
		const { systemUserId, roleId, direction: itemDirection } = item.args;
		await gateway.ops.applySecurityRoleChanges({
			systemUserId,
			associateRoleIds: itemDirection === "add" ? [roleId] : [],
			disassociateRoleIds: itemDirection === "remove" ? [roleId] : [],
		});
	};

	const body = (
		<div className={styles.container}>
			<div className={styles.columns}>
				<UserSearch gateway={gateway} selected={selectedUsers} onChange={setSelectedUsers} />
				<Field label="Security roles">
					<DataTable
						items={roles}
						columns={roleColumns}
						getRowId={(role) => role.id}
						selectionMode="multiselect"
						selectedIds={new Set(selectedRoleIds)}
						onSelectionChange={(ids) => setSelectedRoleIds([...ids].map(String))}
						maxHeight="240px"
						autoFitColumns={false}
						emptyMessage="No security roles were returned."
					/>
				</Field>
			</div>
			<FormRow>
				<Field label="Action">
					<Dropdown
						selectedOptions={[direction]}
						value={direction === "add" ? "Add roles" : "Remove roles"}
						onOptionSelect={(_, data) => setDirection(data.optionValue === "remove" ? "remove" : "add")}>
						<Option value="add">Add roles</Option>
						<Option value="remove">Remove roles</Option>
					</Dropdown>
				</Field>
				<Grow>
					<Text size={200} className={styles.caption}>
						{bulkUserSummary(selectedUsers, selectedRoles, direction)} Roles are listed once per logical role; a change applies to the root business
						unit copy and follows its inherited copies.
					</Text>
				</Grow>
				<Button
					appearance="primary"
					disabled={selectedUsers.length === 0 || selectedRoles.length === 0}
					onClick={() => setPlan(bulkUserPlan(selectedUsers, selectedRoles, direction))}>
					Review changes
				</Button>
			</FormRow>
			<BulkRunDialog
				plan={plan}
				execute={execute}
				onClose={() => setPlan(null)}
				onFinished={() => void queryClient.invalidateQueries({ queryKey: gateway.key("getUserSecurityRoles") })}
			/>
		</div>
	);

	return (
		<AreaContainer fill>
			<FormRow>
				<Grow>
					<ConnectionPicker value={connection} environments={environments} onChange={setConnection} />
				</Grow>
			</FormRow>
			{gateway.mode === "page" ? <PageRequirementGate requires="model-driven-app">{body}</PageRequirementGate> : body}
		</AreaContainer>
	);
};
