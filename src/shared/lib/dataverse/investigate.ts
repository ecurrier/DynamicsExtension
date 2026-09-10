import { type EntitySummary, type TransportEntityMetadata } from "@/shared/types";

import { type AuditOperations, auditOperations } from "./audit";
import { type AutomationOperations, automationOperations } from "./automation";
import { type ColumnUsageOperations, columnUsageOperations } from "./columnUsage";
import { type DataverseHttp } from "./http";
import { type RecordAccessOperations, recordAccessOperations } from "./recordAccess";
import { type RecordCountOperations, recordCountOperations } from "./recordCounts";
import { type SolutionLayerOperations, solutionLayerOperations } from "./solutionLayers";
import { type TableMetadataOperations, tableMetadataOperations } from "./tableMetadata";
import { transportOperations } from "./transport";

export type InvestigateOperations = AutomationOperations &
	RecordAccessOperations &
	AuditOperations &
	SolutionLayerOperations &
	ColumnUsageOperations &
	TableMetadataOperations &
	RecordCountOperations & {
		listTables: () => Promise<EntitySummary[]>;
		getTableColumns: (request: { entityLogicalName: string }) => Promise<TransportEntityMetadata>;
	};

export const investigateOperations = (http: DataverseHttp): InvestigateOperations => ({
	...automationOperations(http),
	...recordAccessOperations(http),
	...auditOperations(http),
	...solutionLayerOperations(http),
	...columnUsageOperations(http),
	...tableMetadataOperations(http),
	...recordCountOperations(http),
	listTables: () => transportOperations(http).listEntities(),
	getTableColumns: ({ entityLogicalName }) => transportOperations(http).getEntityMetadata({ logicalName: entityLogicalName }),
});
