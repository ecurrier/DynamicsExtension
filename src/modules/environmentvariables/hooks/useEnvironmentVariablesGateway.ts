import { type ConnectionTarget, defineGateway, useGateway } from "@/shared/connections";
import { environmentVariableOperations } from "@/shared/lib";

export const environmentVariablesGateway = defineGateway({
	namespace: "environmentVariables",
	operations: ["getDefinitions", "setValue", "clearValue"],
	factory: environmentVariableOperations,
	timeouts: { getDefinitions: 60_000, setValue: 60_000 },
});

export const useEnvironmentVariablesGateway = (connection: ConnectionTarget) => useGateway(environmentVariablesGateway, connection);
