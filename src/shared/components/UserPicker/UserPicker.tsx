import { Badge, Button, Dropdown, Field, Input, makeStyles, Option, tokens } from "@fluentui/react-components";
import { Search20Regular } from "@fluentui/react-icons";
import { useState } from "react";

import { type SystemUser } from "@/shared/types";

import { FormRow, Grow } from "../Layout";

const useStyles = makeStyles({
	option: {
		display: "flex",
		alignItems: "center",
		gap: "8px",
		minWidth: 0,
	},
	secondary: {
		color: tokens.colorNeutralForeground3,
		fontSize: tokens.fontSizeBase200,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
});

interface UserPickerProps {
	users: SystemUser[];
	selectedUser: SystemUser | null;
	searching: boolean;
	label?: string;
	onSearch: (query: string) => void;
	onSelect: (user: SystemUser) => void;
}

export const UserPicker = ({ users, selectedUser, searching, label = "Username / Email Address", onSearch, onSelect }: UserPickerProps) => {
	const styles = useStyles();
	const [query, setQuery] = useState("");
	const submit = () => {
		if (query.trim()) {
			onSearch(query.trim());
		}
	};
	return (
		<FormRow>
			<Grow>
				<Field label={label}>
					<Input
						value={query}
						placeholder="Search users..."
						contentBefore={<Search20Regular />}
						onChange={(_, data) => setQuery(data.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								submit();
							}
						}}
					/>
				</Field>
			</Grow>
			<Button disabled={searching || !query.trim()} onClick={submit}>
				{searching ? "Searching..." : "Search"}
			</Button>
			<Grow>
				<Field label="System User">
					<Dropdown
						placeholder="Select a user..."
						value={selectedUser?.fullName ?? ""}
						selectedOptions={selectedUser ? [selectedUser.id] : []}
						disabled={users.length === 0}
						onOptionSelect={(_, data) => {
							const user = users.find((candidate) => candidate.id === data.optionValue);
							if (user) {
								onSelect(user);
							}
						}}>
						{users.map((user) => (
							<Option key={user.id} value={user.id} text={user.fullName}>
								<span className={styles.option}>
									<span>{user.fullName}</span>
									{user.domainName ? <span className={styles.secondary}>{user.domainName}</span> : null}
									{user.isDisabled ? (
										<Badge size="small" appearance="tint" color="danger">
											Disabled
										</Badge>
									) : null}
								</span>
							</Option>
						))}
					</Dropdown>
				</Field>
			</Grow>
		</FormRow>
	);
};
