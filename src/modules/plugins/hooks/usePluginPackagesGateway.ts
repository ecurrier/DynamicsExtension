import { type ConnectionTarget, defineGateway, useGateway } from "@/shared/connections";
import { pluginPackageOperations } from "@/shared/lib";

export const pluginPackagesGateway = defineGateway({
	namespace: "pluginPackages",
	operations: ["list", "get", "update", "getLayers"],
	factory: pluginPackageOperations,
	timeouts: { list: 90_000, update: 180_000 },
});

export const usePluginPackagesGateway = (connection: ConnectionTarget) => useGateway(pluginPackagesGateway, connection);

export type PluginPackagesGateway = ReturnType<typeof usePluginPackagesGateway>;
