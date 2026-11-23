export type QueryColumnType =
	| "text"
	| "memo"
	| "wholeNumber"
	| "decimalOrMoney"
	| "dateTime"
	| "choice"
	| "multiChoice"
	| "yesNo"
	| "lookup"
	| "owner"
	| "uniqueIdentifier"
	| "stateOrStatus";

export interface QueryTableSummary {
	logicalName: string;
	displayName: string;
	entitySetName: string;
	primaryIdAttribute: string;
	primaryNameAttribute: string | null;
	isIntersect: boolean;
}

export interface QueryChoiceOption {
	value: number;
	label: string;
}

export interface QueryLookupTarget {
	logicalName: string;
	navigationProperty: string;
	entitySetName: string | null;
}

export interface QueryColumn {
	logicalName: string;
	displayName: string;
	attributeType: string;
	attributeTypeName: string;
	columnType: QueryColumnType | null;
	attributeOf: string | null;
	isPrimaryId: boolean;
	isPrimaryName: boolean;
	isValidForRead: boolean;
	dateOnly: boolean;
	options: QueryChoiceOption[];
	targets: QueryLookupTarget[];
}

export interface QueryManyToOneRelationship {
	schemaName: string;
	lookupColumn: string;
	referencedTable: string;
	referencedColumn: string;
	navigationProperty: string | null;
}

export interface QueryOneToManyRelationship {
	schemaName: string;
	referencedColumn: string;
	referencingTable: string;
	referencingColumn: string;
	navigationProperty: string | null;
}

export interface QueryManyToManySide {
	table: string;
	intersectColumn: string;
	navigationProperty: string | null;
}

export interface QueryManyToManyRelationship {
	schemaName: string;
	intersectTable: string;
	first: QueryManyToManySide;
	second: QueryManyToManySide;
}

export interface QueryTable {
	logicalName: string;
	displayName: string;
	entitySetName: string;
	primaryIdAttribute: string;
	primaryNameAttribute: string | null;
	columns: QueryColumn[];
	manyToOne: QueryManyToOneRelationship[];
	oneToMany: QueryOneToManyRelationship[];
	manyToMany: QueryManyToManyRelationship[];
}

export type QueryRow = Record<string, unknown>;

export interface QueryRunRequest {
	entitySetName: string;
	fetchXml: string;
}

export type QueryViewKind = "system" | "personal";

export interface QueryView {
	id: string;
	name: string;
	kind: QueryViewKind;
	fetchXml: string;
	queryType: number;
	isDefault: boolean;
}

export interface QueryViewList {
	views: QueryView[];
	personalViewsUnavailable: string | null;
}

export interface QueryRunResult {
	rows: QueryRow[];
	moreRecords: boolean;
	pagingCookie: string | null;
	totalRecordCount: number | null;
	totalRecordCountLimitExceeded: boolean;
	elapsedMs: number;
	annotations: Record<string, unknown>;
}
