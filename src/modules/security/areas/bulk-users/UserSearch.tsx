import { Button, Field, Input } from "@fluentui/react-components";
import { Search20Regular } from "@fluentui/react-icons";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { DataTable, type DataTableColumn, FormRow, Grow } from "@/shared/components";
import { type SystemUser } from "@/shared/types";

interface UserSearchProps {
	gateway: { ready: boolean; ops: { searchSystemUsers: (args: { query: string }) => Promise<SystemUser[]> } };
	selected: SystemUser[];
	onChange: (users: SystemUser[]) => void;
}

export const UserSearch = ({ gateway, selected, onChange }: UserSearchProps) => {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<SystemUser[]>([]);
	const search = useMutation({ mutationFn: (term: string) => gateway.ops.searchSystemUsers({ query: term }), onSuccess: setResults });

	const columns: DataTableColumn<SystemUser>[] = [
		{ id: "name", label: "User", width: 180, render: (user) => user.fullName || user.domainName || user.id, sortValue: (user) => user.fullName },
		{ id: "domain", label: "Sign-in name", width: 200, render: (user) => user.domainName ?? "", sortValue: (user) => user.domainName ?? "" },
		{ id: "state", label: "Status", width: 90, render: (user) => (user.isDisabled ? "Disabled" : "Enabled"), sortValue: (user) => String(user.isDisabled) },
	];

	const selectedIds = new Set(selected.map((user) => user.id));

	return (
		<Field label="Users" hint={selected.length === 0 ? "Search, then tick the users to change." : `${selected.length} selected`}>
			<FormRow>
				<Grow>
					<Input
						value={query}
						placeholder="Name, email, or sign-in name"
						onChange={(_, data) => setQuery(data.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && query.trim()) {
								search.mutate(query.trim());
							}
						}}
					/>
				</Grow>
				<Button icon={<Search20Regular />} disabled={!gateway.ready || !query.trim() || search.isPending} onClick={() => search.mutate(query.trim())}>
					Search
				</Button>
				<Button appearance="subtle" disabled={results.length === 0} onClick={() => onChange(results)}>
					Select all
				</Button>
			</FormRow>
			<DataTable
				items={results}
				columns={columns}
				getRowId={(user) => user.id}
				selectionMode="multiselect"
				selectedIds={selectedIds}
				onSelectionChange={(ids) => onChange(results.filter((user) => ids.has(user.id)))}
				maxHeight="200px"
				autoFitColumns={false}
				emptyMessage="Search for users to begin."
			/>
		</Field>
	);
};
