import { type ConnectionTarget, defineGateway, useGateway } from "@/shared/connections";
import { pluginStepOperations } from "@/shared/lib";

export const pluginStepsGateway = defineGateway({
	namespace: "pluginSteps",
	operations: ["getSteps", "get", "setState"],
	factory: pluginStepOperations,
	timeouts: { getSteps: 90_000, setState: 120_000 },
});

export const usePluginStepsGateway = (connection: ConnectionTarget) => useGateway(pluginStepsGateway, connection);
