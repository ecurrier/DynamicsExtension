import { type ConnectionTarget, defineGateway, useGateway } from "@/shared/connections";
import { queryOperations } from "@/shared/lib";

export const queryGateway = defineGateway({
	namespace: "query",
	operations: ["listTables", "getTable", "runQuery"],
	factory: queryOperations,
	timeouts: { listTables: 90_000, getTable: 90_000, runQuery: 120_000 },
});

export const useQueryGateway = (connection: ConnectionTarget) => useGateway(queryGateway, connection);
