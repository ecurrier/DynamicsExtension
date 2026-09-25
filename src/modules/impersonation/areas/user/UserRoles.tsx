import { Badge, makeStyles, Spinner, Text, tokens } from "@fluentui/react-components";

import { usePageQuery } from "@/messaging/client";
import { type SecurityRoleAssignment } from "@/shared/types";

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

interface RoleListProps {
	fullName: string;
	roles: SecurityRoleAssignment[] | null;
	loading?: boolean;
	error?: string | null;
}

export const RoleList = ({ fullName, roles, loading = false, error = null }: RoleListProps) => {
	const styles = useStyles();
	return (
		<div className={styles.root}>
			<Text size={200} className={styles.label}>
				Security roles of {fullName}
			</Text>
			{loading ? <Spinner size="tiny" label="Loading roles..." labelPosition="after" /> : null}
			{error ? (
				<Text size={200} className={styles.muted}>
					{error}
				</Text>
			) : null}
			{roles?.length === 0 ? (
				<Text size={200} className={styles.muted}>
					No security roles found, directly or through a team, so the app will not load as this user. The exception is a Microsoft Entra group team:
					its roles only show up here after the user has signed in to this environment.
				</Text>
			) : null}
			{roles && roles.length > 0 ? (
				<div className={styles.list}>
					{roles.map((role) => (
						<Badge key={`${role.id}:${role.viaTeam ?? "direct"}`} appearance="tint" color="informative">
							{role.viaTeam ? `${role.name} · via ${role.viaTeam}` : role.name}
						</Badge>
					))}
				</div>
			) : null}
		</div>
	);
};

interface UserRolesProps {
	systemUserId: string;
	fullName: string;
}

export const UserRoles = ({ systemUserId, fullName }: UserRolesProps) => {
	const roles = usePageQuery("security.getSystemUserRoles", { systemUserId });
	return (
		<RoleList
			fullName={fullName}
			roles={roles.isSuccess ? roles.data : null}
			loading={roles.isLoading}
			error={roles.isError ? `Could not load roles: ${roles.error.message}` : null}
		/>
	);
};
