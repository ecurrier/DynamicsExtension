import { columnOf, columnTableAt, type FetchXmlDocument, type NodePath, type QueryMetadata } from "@/shared/lib/fetchxml";
import { type QueryColumn, type QueryTable } from "@/shared/types";

export type TableScope =
	| { readonly state: "loaded"; readonly name: string; readonly table: QueryTable }
	| { readonly state: "pending"; readonly name: string }
	| { readonly state: "missing"; readonly name: string }
	| { readonly state: "none" };

export const tableScope = (document: FetchXmlDocument, path: NodePath, attributeName: string, metadata: QueryMetadata): TableScope => {
	const owner = columnTableAt(document, path, attributeName);
	if (owner.kind !== "table") {
		return { state: "none" };
	}
	const lookup = metadata(owner.tableLogicalName);
	if (lookup.state === "loaded") {
		return { state: "loaded", name: owner.tableLogicalName, table: lookup.table };
	}
	return { state: lookup.state, name: owner.tableLogicalName };
};

export const scopeColumn = (scope: TableScope, columnName: string | undefined): QueryColumn | undefined =>
	scope.state === "loaded" && columnName !== undefined ? columnOf(scope.table, columnName) : undefined;
