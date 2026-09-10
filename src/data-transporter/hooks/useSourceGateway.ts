import { type ConnectionTarget, defineGateway, PAGE_CONNECTION, useGateway } from "@/shared/connections";
import { transportOperations } from "@/shared/lib";

export const transportGateway = defineGateway({
	namespace: "transport",
	operations: ["listEntities", "listViews", "getEntityMetadata", "retrievePage"],
	factory: transportOperations,
	timeouts: { listEntities: 90_000, getEntityMetadata: 90_000, retrievePage: 120_000 },
});

export const useSourceGateway = (source: ConnectionTarget | null) => {
	const gateway = useGateway(transportGateway, source ?? PAGE_CONNECTION);
	return { ...gateway, ready: gateway.ready && source !== null };
};
