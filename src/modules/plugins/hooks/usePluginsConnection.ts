import { useConnectableEnvironments } from "@/modules/settings";
import { type ConnectionTarget, requestEnvironmentAccess } from "@/shared/connections";
import { useAsyncAction } from "@/shared/hooks";

import { usePluginsStore } from "../store";

export const usePluginsConnection = () => {
	const connection = usePluginsStore((state) => state.connection);
	const setConnection = usePluginsStore((state) => state.setConnection);
	const { environments, byId } = useConnectableEnvironments();
	const connect = useAsyncAction("Could not switch connection");
	const onConnectionChange = (target: ConnectionTarget) =>
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
	return { connection, environments, switching: connect.running, onConnectionChange };
};
