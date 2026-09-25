import { useQueries } from "@tanstack/react-query";

import { editablePropertiesFor, TYPE_PROPERTIES } from "@/modules/schema/lib";
import { hasAttributeDetails } from "@/shared/lib";
import { type AttributeDetails, type AttributeMatch } from "@/shared/types";

import { type SchemaGateway } from "./useSchemaToolsBootstrap";

export type DetailsStatus = "ready" | "loading" | "error";

export const useAttributeDetails = (gateway: SchemaGateway, selected: AttributeMatch[]) => {
	const needed = editablePropertiesFor(selected.map((match) => match.attributeType)).some((property) => TYPE_PROPERTIES.includes(property));
	const targets = needed ? selected.filter((match) => hasAttributeDetails(match.attributeType)) : [];
	const results = useQueries({
		queries: targets.map((match) => ({
			queryKey: gateway.key("readAttributeDetails", { metadataId: match.metadataId }),
			queryFn: () =>
				gateway.ops.readAttributeDetails({
					tableLogicalName: match.tableLogicalName,
					metadataId: match.metadataId,
					attributeType: match.attributeType,
				}),
			enabled: gateway.ready,
			staleTime: Infinity,
			retry: false,
		})),
	});

	const details = new Map<string, AttributeDetails>();
	targets.forEach((match, index) => {
		const data = results[index]?.data;
		if (data) {
			details.set(match.metadataId, data);
		}
	});

	const status: DetailsStatus = results.some((result) => result.isLoading) ? "loading" : results.some((result) => result.isError) ? "error" : "ready";

	return {
		selected: selected.map((match) => ({ ...match, ...details.get(match.metadataId) })),
		status,
		refresh: () => results.forEach((result) => void result.refetch()),
	};
};
