import { normalizeGuid } from "@/shared/lib";
import { type TransportAttribute, type TransportRow } from "@/shared/types";

const LOOKUP_TYPES: ReadonlySet<string> = new Set(["Lookup", "Customer", "Owner"]);
const UNSUPPORTED_TYPES: ReadonlySet<string> = new Set(["PartyList", "CalendarRules", "File", "Image", "ManagedProperty"]);
const LOOKUP_LOGICAL_NAME = "@Microsoft.Dynamics.CRM.lookuplogicalname";

export type PayloadMode = "create" | "update";

export interface PayloadContext {
	attributes: TransportAttribute[];
	selected: Set<string>;
	entitySets: Record<string, string>;
	primaryIdAttribute: string;
}

export interface SkippedField {
	field: string;
	reason: string;
}

export interface PayloadResult {
	payload: Record<string, unknown>;
	skipped: SkippedField[];
}

export const isLookupAttribute = (attribute: TransportAttribute): boolean => LOOKUP_TYPES.has(attribute.attributeType);

export const lookupTargetsNeeded = (attributes: TransportAttribute[], selected: Set<string>): string[] => {
	const targets = new Set<string>();
	for (const attribute of attributes) {
		if (selected.has(attribute.logicalName) && isLookupAttribute(attribute)) {
			for (const target of attribute.targets) {
				targets.add(target.logicalName);
			}
		}
	}
	return [...targets].sort();
};

const lookupBinding = (attribute: TransportAttribute, row: TransportRow, context: PayloadContext): { key: string; value: string } | SkippedField => {
	const column = `_${attribute.logicalName}_value`;
	if (!(column in row)) {
		return { field: attribute.logicalName, reason: "Not present in the source rows" };
	}
	const raw = row[column];
	if (raw === null || raw === undefined || raw === "") {
		return { field: attribute.logicalName, reason: "Empty lookup values are left unchanged" };
	}
	const targetLogicalName = (row[`${column}${LOOKUP_LOGICAL_NAME}`] as string | undefined) ?? attribute.targets[0]?.logicalName;
	const target = attribute.targets.find((candidate) => candidate.logicalName === targetLogicalName) ?? attribute.targets[0];
	const entitySet = target ? context.entitySets[target.logicalName] : undefined;
	if (!target || !entitySet) {
		return { field: attribute.logicalName, reason: `No entity set known for ${targetLogicalName ?? "the target"}` };
	}
	return { key: `${target.navigationProperty}@odata.bind`, value: `/${entitySet}(${normalizeGuid(String(raw))})` };
};

export const buildTransportPayload = (row: TransportRow, id: string, context: PayloadContext, mode: PayloadMode): PayloadResult => {
	const payload: Record<string, unknown> = {};
	const skipped: SkippedField[] = [];
	if (mode === "create") {
		payload[context.primaryIdAttribute] = id;
	}
	for (const attribute of context.attributes) {
		if (!context.selected.has(attribute.logicalName)) {
			continue;
		}
		if (!(mode === "create" ? attribute.isValidForCreate : attribute.isValidForUpdate)) {
			skipped.push({ field: attribute.logicalName, reason: `Not valid for ${mode}` });
			continue;
		}
		if (UNSUPPORTED_TYPES.has(attribute.attributeType)) {
			skipped.push({
				field: attribute.logicalName,
				reason: `${attribute.attributeType} attributes are not transported`,
			});
			continue;
		}
		if (isLookupAttribute(attribute)) {
			const binding = lookupBinding(attribute, row, context);
			if ("key" in binding) {
				payload[binding.key] = binding.value;
			} else {
				skipped.push(binding);
			}
			continue;
		}
		if (!(attribute.logicalName in row)) {
			skipped.push({ field: attribute.logicalName, reason: "Not present in the source rows" });
			continue;
		}
		const value = row[attribute.logicalName];
		if (value === null && mode === "create") {
			skipped.push({ field: attribute.logicalName, reason: "Null values are not sent on create" });
			continue;
		}
		payload[attribute.logicalName] = value;
	}
	return { payload, skipped };
};
