import { makeStyles, Text, tokens } from "@fluentui/react-components";

import { useConnectableEnvironments } from "@/modules/settings";
import { ConnectionPicker, FormRow, Grow } from "@/shared/components";
import { type ConnectionTarget, requestEnvironmentAccess } from "@/shared/connections";
import { useAsyncAction } from "@/shared/hooks";

import { useInvestigateStore } from "../store";

const useStyles = makeStyles({
	caption: {
		color: tokens.colorNeutralForeground3,
	},
});

export const InvestigateConnection = () => {
	const styles = useStyles();
	const { environments, byId } = useConnectableEnvironments();
	const connection = useInvestigateStore((state) => state.connection);
	const setConnection = useInvestigateStore((state) => state.setConnection);
	const connect = useAsyncAction("Could not switch connection");

	const onChange = (target: ConnectionTarget) =>
		connect.run(async () => {
			if (target.kind === "environment") {
				const environment = byId[target.environmentId];
				if (!environment) {
					throw new Error("The selected environment no longer exists");
				}
				if (!(await requestEnvironmentAccess(environment))) {
					throw new Error("Power Tools needs permission to contact the environment and the Microsoft login service");
				}
			}
			setConnection(target);
		});

	const selected = connection.kind === "environment" ? byId[connection.environmentId] : null;

	return (
		<>
			<FormRow>
				<Grow>
					<ConnectionPicker value={connection} environments={environments} disabled={connect.running} onChange={(target) => void onChange(target)} />
				</Grow>
			</FormRow>
			{selected ? (
				<Text size={200} className={styles.caption}>
					Reading {selected.name} as the configured application user.
				</Text>
			) : null}
		</>
	);
};
