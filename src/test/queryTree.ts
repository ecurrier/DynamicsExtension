import { type FetchXmlDocument, metadataFrom, parseFetchXml, type QueryMetadata } from "@/shared/lib/fetchxml";
import { type QueryColumn, type QueryTable } from "@/shared/types";

export const parse = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors[0]?.message);
	}
	return result.document;
};

const column = (logicalName: string, displayName: string, extra: Partial<QueryColumn> = {}): QueryColumn => ({
	logicalName,
	displayName,
	attributeType: "String",
	attributeTypeName: "StringType",
	columnType: "text",
	attributeOf: null,
	isPrimaryId: false,
	isPrimaryName: false,
	isValidForRead: true,
	dateOnly: false,
	options: [],
	targets: [],
	...extra,
});

export const ACCOUNT: QueryTable = {
	logicalName: "account",
	displayName: "Account",
	entitySetName: "accounts",
	primaryIdAttribute: "accountid",
	primaryNameAttribute: "name",
	columns: [
		column("accountid", "Account", { isPrimaryId: true, columnType: "uniqueIdentifier" }),
		column("name", "Account Name", { isPrimaryName: true }),
		column("statecode", "Status", {
			columnType: "stateOrStatus",
			options: [
				{ value: 0, label: "Active" },
				{ value: 1, label: "Inactive" },
			],
		}),
		column("primarycontactid", "Primary Contact", { columnType: "lookup" }),
	],
	manyToOne: [
		{
			schemaName: "account_primary_contact",
			lookupColumn: "primarycontactid",
			referencedTable: "contact",
			referencedColumn: "contactid",
			navigationProperty: "primarycontactid",
		},
	],
	oneToMany: [],
	manyToMany: [],
};

export const CONTACT: QueryTable = {
	logicalName: "contact",
	displayName: "Contact",
	entitySetName: "contacts",
	primaryIdAttribute: "contactid",
	primaryNameAttribute: "fullname",
	columns: [column("contactid", "Contact", { isPrimaryId: true, columnType: "uniqueIdentifier" }), column("fullname", "Full Name", { isPrimaryName: true })],
	manyToOne: [],
	oneToMany: [],
	manyToMany: [],
};

export const LOADED: QueryMetadata = metadataFrom([ACCOUNT, CONTACT]);

export const PENDING: QueryMetadata = metadataFrom([]);
