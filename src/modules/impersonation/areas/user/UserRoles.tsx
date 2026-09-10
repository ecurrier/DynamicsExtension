import { Badge, makeStyles, Spinner, Text, tokens } from "@fluentui/react-components";

import { usePageQuery } from "@/messaging/client";

const useStyles = makeStyles({
	root: {
		display: "flex",
		flexDirection: "column",
		gap: "6px",
	},
	label: {
		fontWeight: tokens.fontWeightSemibold,
	},
	list: {
		display: "flex",
		flexWrap: "wrap",
		gap: "6px",
	},
	muted: {
		color: tokens.colorNeutralForeground3,
	},
});

interface UserRolesProps {
	systemUserId: string;
	fullName: string;
}

export const UserRoles = ({ systemUserId, fullName }: UserRolesProps) => {
	const styles = useStyles();
	const roles = usePageQuery("security.getSystemUserRoles", { systemUserId });
	return (
		<div className={styles.root}>
			<Text size={200} className={styles.label}>
				Security roles of {fullName}
			</Text>
			{roles.isLoading ? <Spinner size="tiny" label="Loading roles..." labelPosition="after" /> : null}
			{roles.isError ? (
				<Text size={200} className={styles.muted}>
					Could not load roles: {roles.error.message}
				</Text>
			) : null}
			{roles.isSuccess && roles.data.length === 0 ? (
				<Text size={200} className={styles.muted}>
					No security roles are assigned, so the app will not load as this user.
				</Text>
			) : null}
			{roles.isSuccess && roles.data.length > 0 ? (
				<div className={styles.list}>
					{roles.data.map((role) => (
						<Badge key={role.id} appearance="tint" color="informative">
							{role.name}
						</Badge>
					))}
				</div>
			) : null}
		</div>
	);
};
