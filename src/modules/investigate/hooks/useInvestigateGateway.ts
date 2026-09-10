import { type ConnectionTarget, defineGateway, useGateway } from "@/shared/connections";
import { investigateOperations } from "@/shared/lib";

export const investigateGateway = defineGateway({
	namespace: "investigate",
	operations: [
		"getTableAutomation",
		"getRecordAccess",
		"getRecordHistory",
		"getAuditDetail",
		"getSolutionLayers",
		"getColumnUsage",
		"getTableMetadata",
		"getRecordCounts",
		"listTables",
		"getTableColumns",
	],
	factory: investigateOperations,
	timeouts: {
		getTableAutomation: 90_000,
		getRecordAccess: 90_000,
		getRecordHistory: 90_000,
		getColumnUsage: 180_000,
		getRecordCounts: 120_000,
		listTables: 90_000,
		getTableColumns: 90_000,
	},
});

export const useInvestigateGateway = (connection: ConnectionTarget) => useGateway(investigateGateway, connection);
