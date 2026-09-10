import { type TransportAttribute, type TransportRow } from "@/shared/types";

export const SYSTEM_EXCLUDED_FIELDS: ReadonlySet<string> = new Set([
	"createdon",
	"createdby",
	"createdonbehalfby",
	"modifiedon",
	"modifiedby",
	"modifiedonbehalfby",
	"owningbusinessunit",
	"owninguser",
	"owningteam",
	"versionnumber",
	"timezoneruleversionnumber",
	"utcconversiontimezonecode",
	"importsequencenumber",
	"overriddencreatedon",
]);

export const OPTIONAL_DEFAULT_OFF: ReadonlySet<string> = new Set(["ownerid", "statecode", "statuscode", "transactioncurrencyid"]);

export const sourceColumns = (rows: TransportRow[]): Set<string> => {
	const columns = new Set<string>();
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			if (!key.includes("@")) {
				columns.add(key);
			}
		}
	}
	return columns;
};

export const isInSource = (attribute: TransportAttribute, columns: Set<string>): boolean =>
	columns.has(attribute.logicalName) || columns.has(`_${attribute.logicalName}_value`);

export const selectableFields = (attributes: TransportAttribute[], columns: Set<string>): TransportAttribute[] =>
	attributes.filter(
		(attribute) =>
			attribute.attributeOf === null &&
			!attribute.isLogical &&
			!attribute.isPrimaryId &&
			(attribute.isValidForCreate || attribute.isValidForUpdate) &&
			!SYSTEM_EXCLUDED_FIELDS.has(attribute.logicalName) &&
			isInSource(attribute, columns)
	);

export const defaultSelection = (fields: TransportAttribute[]): Set<string> =>
	new Set(fields.filter((field) => !OPTIONAL_DEFAULT_OFF.has(field.logicalName)).map((field) => field.logicalName));
