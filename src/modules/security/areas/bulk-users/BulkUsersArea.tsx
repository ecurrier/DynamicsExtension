import { Button, Dropdown, Field, makeStyles, MessageBar, MessageBarBody, Option, Tag, TagGroup, Text, tokens } from "@fluentui/react-components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { useConnectableEnvironments } from "@/modules/settings";
import {
	AreaContainer,
	BulkRunDialog,
	ConnectionPicker,
	DataTable,
	type DataTableColumn,
	FormRow,
	Grow,
	PageRequirementGate,
	TableFilter,
	useTableFilter,
} from "@/shared/components";
import { type ConnectionTarget } from "@/shared/connections";
import { dedupeLogicalRoles } from "@/shared/lib";
import { type BulkRunPlan, type LogicalRole, type SystemUser } from "@/shared/types";

import { useSecurityGateway } from "../../hooks";
import {
	applyVisibleSelection,
	type BulkUserChange,
	bulkUserPlan,
	bulkUserSummary,
	mergeSelection,
	type RoleDirection,
	selectedUsers,
	selectionSummary,
} from "../../lib";

const useStyles = makeStyles({
	caption: { color: tokens.colorNeutralForeground3 },
	chips: { paddingBottom: "4px" },
});

export const BulkUsersArea = () => {
	const styles = useStyles();
	const queryClient = useQueryClient();
	const { environments } = useConnectableEnvironments();
	const [connection, setConnection] = useState<ConnectionTarget>({ kind: "page" });
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
	const [direction, setDirection] = useState<RoleDirection>("add");
	const [plan, setPlan] = useState<BulkRunPlan<BulkUserChange> | null>(null);
	const gateway = useSecurityGateway(connection);

	const users = useQuery({
		queryKey: gateway.key("listSystemUsers"),
		queryFn: () => gateway.ops.listSystemUsers(),
		enabled: gateway.ready,
		staleTime: Infinity,
		retry: false,
	});
	const allRoles = useQuery({
		queryKey: gateway.key("getSecurityRoles"),
		queryFn: () => gateway.ops.getSecurityRoles(),
		enabled: gateway.ready,
		staleTime: Infinity,
		retry: false,
	});

	const userList = useMemo(() => users.data ?? [], [users.data]);
	const roles = useMemo(() => dedupeLogicalRoles(allRoles.data ?? []), [allRoles.data]);
	const userFilter = useTableFilter(userList, (user) => [user.fullName, user.domainName]);
	const roleFilter = useTableFilter(roles, (role) => [role.name]);

	const chosenUsers = useMemo(() => selectedUsers(userList, selectedUserIds), [userList, selectedUserIds]);
	const chosenRoles = useMemo(() => roles.filter((role) => selectedRoleIds.includes(role.id)), [roles, selectedRoleIds]);

	const userColumns: DataTableColumn<SystemUser>[] = [
		{ id: "name", label: "User", width: 220, render: (user) => user.fullName || user.domainName || user.id, sortValue: (user) => user.fullName },
		{ id: "domain", label: "Sign-in name", width: 260, render: (user) => user.domainName ?? "", sortValue: (user) => user.domainName ?? "" },
	];

	const roleColumns: DataTableColumn<LogicalRole>[] = [
		{ id: "name", label: "Security role", width: 260, render: (role) => role.name, sortValue: (role) => role.name },
		{
			id: "copies",
			label: "Business units",
			width: 130,
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
		<>
			<MessageBar intent="info" layout="multiline">
				<MessageBarBody>
					Filter to narrow the list, tick who you want, then filter again for the next few. Ticks survive the filter changing, so a set is built up
					over several searches rather than one.
				</MessageBarBody>
			</MessageBar>
			<Field label="Users">
				<FormRow>
					<Grow>
						<TableFilter
							query={userFilter.query}
							onChange={userFilter.setQuery}
							shown={userFilter.shown}
							total={userFilter.total}
							placeholder="Filter by name or sign-in name"
						/>
					</Grow>
					<Button
						appearance="subtle"
						disabled={userFilter.filtered.length === 0}
						onClick={() =>
							setSelectedUserIds(
								mergeSelection(
									selectedUserIds,
									userFilter.filtered.map((user) => user.id)
								)
							)
						}>
						Add all {userFilter.shown}
					</Button>
					<Button appearance="subtle" disabled={selectedUserIds.length === 0} onClick={() => setSelectedUserIds([])}>
						Clear selection
					</Button>
				</FormRow>
				{chosenUsers.length > 0 ? (
					<div className={styles.chips}>
						<TagGroup onDismiss={(_, data) => setSelectedUserIds(selectedUserIds.filter((id) => id !== data.value))}>
							{chosenUsers.map((user) => (
								<Tag key={user.id} value={user.id} dismissible size="small">
									{user.fullName || user.domainName || user.id}
								</Tag>
							))}
						</TagGroup>
					</div>
				) : null}
				<DataTable
					items={userFilter.filtered}
					columns={userColumns}
					getRowId={(user) => user.id}
					selectionMode="multiselect"
					selectedIds={new Set(selectedUserIds)}
					onSelectionChange={(ids) =>
						setSelectedUserIds(
							applyVisibleSelection(
								selectedUserIds,
								userFilter.filtered.map((user) => user.id),
								[...ids].map(String)
							)
						)
					}
					maxHeight="300px"
					autoFitColumns={false}
					emptyMessage={users.isLoading ? "Loading users..." : userFilter.query ? "No users match that filter." : "No users were returned."}
				/>
			</Field>
			<Field label="Security roles" hint="Listed once per role. A change applies to the root business unit copy and follows its inherited copies.">
				<FormRow>
					<Grow>
						<TableFilter
							query={roleFilter.query}
							onChange={roleFilter.setQuery}
							shown={roleFilter.shown}
							total={roleFilter.total}
							placeholder="Filter roles"
						/>
					</Grow>
				</FormRow>
				<DataTable
					items={roleFilter.filtered}
					columns={roleColumns}
					getRowId={(role) => role.id}
					selectionMode="multiselect"
					selectedIds={new Set(selectedRoleIds)}
					onSelectionChange={(ids) =>
						setSelectedRoleIds(
							applyVisibleSelection(
								selectedRoleIds,
								roleFilter.filtered.map((role) => role.id),
								[...ids].map(String)
							)
						)
					}
					maxHeight="240px"
					autoFitColumns={false}
					emptyMessage={roleFilter.query ? "No roles match that filter." : "No security roles were returned."}
				/>
			</Field>
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
						{selectionSummary(selectedUserIds)} {bulkUserSummary(chosenUsers, chosenRoles, direction)}
					</Text>
				</Grow>
				<Button
					appearance="primary"
					disabled={chosenUsers.length === 0 || chosenRoles.length === 0}
					onClick={() => setPlan(bulkUserPlan(chosenUsers, chosenRoles, direction))}>
					Review changes
				</Button>
			</FormRow>
			<BulkRunDialog
				plan={plan}
				execute={execute}
				onClose={() => setPlan(null)}
				onFinished={() => void queryClient.invalidateQueries({ queryKey: gateway.key("getUserSecurityRoles") })}
			/>
		</>
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
