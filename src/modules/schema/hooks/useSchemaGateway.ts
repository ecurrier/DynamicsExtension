import { type ConnectionTarget, defineGateway, useGateway } from "@/shared/connections";
import { attributeSearchOperations, type DataverseHttp, polymorphicOperations, publishOperations } from "@/shared/lib";

const schemaOperations = (http: DataverseHttp) => ({ ...attributeSearchOperations(http), ...publishOperations(http), ...polymorphicOperations(http) });

export const schemaGateway = defineGateway({
	namespace: "schema",
	operations: [
		"findAttributeAcrossTables",
		"readAttributeDetails",
		"updateAttribute",
		"publishTables",
		"listPolymorphicLookups",
		"createPolymorphicLookup",
		"addPolymorphicTarget",
		"removePolymorphicTarget",
	],
	pageOnly: [],
	factory: schemaOperations,
	timeouts: {
		updateAttribute: 120_000,
		publishTables: 180_000,
		createPolymorphicLookup: 180_000,
		addPolymorphicTarget: 180_000,
		removePolymorphicTarget: 180_000,
	},
});

export const useSchemaGateway = (connection: ConnectionTarget) => useGateway(schemaGateway, connection);
