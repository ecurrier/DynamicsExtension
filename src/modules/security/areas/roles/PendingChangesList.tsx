import { Badge, makeStyles, Text, tokens } from "@fluentui/react-components";

import { type SecurityRole } from "@/shared/types";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		gap: "4px",
		minWidth: "200px",
		minHeight: 0,
		overflow: "auto",
		padding: "8px",
		border: `1px solid ${tokens.colorNeutralStroke2}`,
		borderRadius: tokens.borderRadiusMedium,
		backgroundColor: tokens.colorNeutralBackground1,
	},
	row: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: "8px",
	},
	title: {
		fontWeight: tokens.fontWeightSemibold,
	},
});

interface PendingChangesListProps {
	roles: SecurityRole[];
	assignedIds: Set<string>;
	stagedIds: Set<string>;
	userSelected: boolean;
}

export const PendingChangesList = ({ roles, assignedIds, stagedIds, userSelected }: PendingChangesListProps) => {
	const styles = useStyles();
	const relevant = roles.filter((role) => assignedIds.has(role.id) || stagedIds.has(role.id));
	return (
		<div className={styles.root}>
			<Text size={200} className={styles.title}>
				Current Security Roles
			</Text>
			{!userSelected ? <Text size={200}>No user selected</Text> : null}
			{userSelected && relevant.length === 0 ? <Text size={200}>No roles assigned</Text> : null}
			{relevant.map((role) => {
				const assigned = assignedIds.has(role.id);
				const staged = stagedIds.has(role.id);
				return (
					<div key={role.id} className={styles.row}>
						<Text size={200}>{role.name}</Text>
						{staged && !assigned ? (
							<Badge color="success" appearance="tint" size="small">
								Adding
							</Badge>
						) : null}
						{assigned && !staged ? (
							<Badge color="danger" appearance="tint" size="small">
								Removing
							</Badge>
						) : null}
					</div>
				);
			})}
		</div>
	);
};
