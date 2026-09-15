import { type ConnectionTarget, defineGateway, useGateway } from "@/shared/connections";
import { attributeSearchOperations, type DataverseHttp, publishOperations } from "@/shared/lib";

const schemaOperations = (http: DataverseHttp) => ({ ...attributeSearchOperations(http), ...publishOperations(http) });

export const schemaGateway = defineGateway({
	namespace: "schema",
	operations: ["findAttributeAcrossTables", "updateAttribute", "publishTables"],
	pageOnly: [],
	factory: schemaOperations,
	timeouts: { updateAttribute: 120_000, publishTables: 180_000 },
});

export const useSchemaGateway = (connection: ConnectionTarget) => useGateway(schemaGateway, connection);
