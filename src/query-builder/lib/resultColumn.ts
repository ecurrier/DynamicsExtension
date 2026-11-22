export type QueryRunRecord = Readonly<Record<string, unknown>>;

export type ResultColumnType = "text" | "number" | "date" | "choice" | "boolean" | "lookup" | "uniqueidentifier";

export interface ResultColumn {
	key: string;
	label: string;
	type: ResultColumnType;
}

export const FORMATTED_VALUE_SUFFIX = "@OData.Community.Display.V1.FormattedValue";

export const LOOKUP_LOGICAL_NAME_SUFFIX = "@Microsoft.Dynamics.CRM.lookuplogicalname";

const LOOKUP_KEY_PATTERN = /^_(.+)_value$/;

export const lookupKeyColumn = (key: string): string | null => LOOKUP_KEY_PATTERN.exec(key)?.[1] ?? null;

export const columnLogicalName = (key: string): string => {
	const column = key.slice(key.lastIndexOf(".") + 1);
	return lookupKeyColumn(column) ?? column;
};

export const isAnnotationKey = (key: string): boolean => key.includes("@");
