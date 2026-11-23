import { attributeValue, columnTableAt, type Diagnostic, type FetchXmlDocument, nodeAtPath, resolveValueOf, type XmlElement } from "@/shared/lib/fetchxml";
import { type QueryTableSummary } from "@/shared/types";

import { findTable } from "./rootTable";

export const LACKS_SHOWN = 3;

export const LACKS_RULES: readonly Diagnostic["rule"][] = ["missing-table", "missing-column"];

export const missingTables = (names: readonly string[], list: readonly QueryTableSummary[]): readonly string[] =>
	names.filter((name) => findTable(list, name) === null);

const elementAt = (document: FetchXmlDocument, diagnostic: Diagnostic): XmlElement | null => {
	const node = nodeAtPath(document, diagnostic.path);
	return node?.kind === "element" ? node : null;
};

const missingColumn = (document: FetchXmlDocument, diagnostic: Diagnostic, element: XmlElement): { column: string; table: string } | null => {
	const attribute = diagnostic.attribute;
	if (attribute === undefined) {
		return null;
	}
	const reference = attributeValue(element, attribute)?.trim() ?? "";
	if (reference === "") {
		return null;
	}
	if (attribute === "valueof") {
		const resolved = resolveValueOf(document, diagnostic.path, reference);
		return resolved.kind === "column" ? { column: resolved.columnLogicalName, table: resolved.tableLogicalName } : null;
	}
	const owner = columnTableAt(document, diagnostic.path, attribute);
	return owner.kind === "table" ? { column: reference, table: owner.tableLogicalName } : null;
};

const lackSentence = (document: FetchXmlDocument, diagnostic: Diagnostic, connectionName: string): string | null => {
	const element = elementAt(document, diagnostic);
	if (!element) {
		return null;
	}
	if (diagnostic.rule === "missing-table") {
		const table = attributeValue(element, "name")?.trim() ?? "";
		return table === "" ? null : `Table ${table} does not exist in ${connectionName}.`;
	}
	const missing = missingColumn(document, diagnostic, element);
	return missing ? `Column ${missing.column} does not exist on Table ${missing.table} in ${connectionName}.` : null;
};

export const connectionLacks = (document: FetchXmlDocument, diagnostics: readonly Diagnostic[], connectionName: string): string | null => {
	const sentences = [
		...new Set(
			diagnostics
				.filter((diagnostic) => LACKS_RULES.includes(diagnostic.rule))
				.map((diagnostic) => lackSentence(document, diagnostic, connectionName))
				.filter((sentence): sentence is string => sentence !== null)
		),
	];
	if (sentences.length === 0) {
		return null;
	}
	const shown = sentences.slice(0, LACKS_SHOWN);
	const more = sentences.length - shown.length;
	const rest =
		more > 0 ? [`The Query uses ${more} more ${more === 1 ? "Table or Column" : "Tables or Columns"} that do not exist in ${connectionName}.`] : [];
	return [...shown, ...rest, "Power Tools did not send the Query to this Connection."].join("\n");
};
