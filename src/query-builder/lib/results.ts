import { type FetchXmlDocument, type XmlElement, type XmlNode } from "@/shared/lib/fetchxml";
import { type QueryColumn, type QueryColumnType, type QueryRow, type QueryTable } from "@/shared/types";

import { FORMATTED_VALUE_SUFFIX, isAnnotationKey, lookupKeyColumn, type ResultColumn, type ResultColumnType } from "./resultColumn";

export interface ResultGridColumn extends ResultColumn {
	table: string | null;
	column: string | null;
	primaryKey: boolean;
}

export type ResultTables = Readonly<Record<string, QueryTable | undefined>>;

export type ValueMode = "friendly" | "raw";

interface LinkScope {
	prefix: string;
	pattern: RegExp | null;
	table: string;
}

interface PlannedColumn {
	candidates: string[];
	pattern: RegExp | null;
	suffixes: string[];
	table: string;
	column: string | null;
	aggregate: string | null;
	dateGrouping: boolean;
}

interface QueryPlan {
	root: string | null;
	aggregate: boolean;
	links: LinkScope[];
	columns: PlannedColumn[];
}

const isActiveElement = (node: XmlNode): node is XmlElement => node.kind === "element" && !node.excluded;

const attributeValue = (element: XmlElement, name: string): string | null => {
	const value = element.attributes.find((attribute) => attribute.name === name)?.value.trim() ?? "";
	return value.length > 0 ? value : null;
};

const isTrue = (value: string | null): boolean => value !== null && ["true", "1"].includes(value.toLowerCase());

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findColumn = (tables: ResultTables, table: string | null, column: string | null): QueryColumn | null => {
	if (!table || !column) {
		return null;
	}
	const wanted = column.toLowerCase();
	return tables[table.toLowerCase()]?.columns.find((candidate) => candidate.logicalName.toLowerCase() === wanted) ?? null;
};

const isLookupType = (type: QueryColumnType | null | undefined): boolean => type === "lookup" || type === "owner";

const COLUMN_TYPES: Record<QueryColumnType, ResultColumnType> = {
	text: "text",
	memo: "text",
	wholeNumber: "number",
	decimalOrMoney: "number",
	dateTime: "date",
	choice: "choice",
	multiChoice: "choice",
	yesNo: "boolean",
	lookup: "lookup",
	owner: "lookup",
	uniqueIdentifier: "uniqueidentifier",
	stateOrStatus: "choice",
};

const columnCandidates = (prefix: string | null, name: string, lookup: boolean): string[] => {
	const plain = prefix ? `${prefix}.${name}` : name;
	const wrapped = prefix ? `${prefix}._${name}_value` : `_${name}_value`;
	return lookup ? [wrapped, plain] : [plain, wrapped];
};

const planQuery = (document: FetchXmlDocument | null, tables: ResultTables): QueryPlan => {
	const plan: QueryPlan = { root: null, aggregate: false, links: [], columns: [] };
	if (!document || document.root.name !== "fetch") {
		return plan;
	}
	plan.aggregate = isTrue(attributeValue(document.root, "aggregate"));
	const entity = document.root.children.filter(isActiveElement).find((child) => child.name === "entity");
	const root = entity ? attributeValue(entity, "name") : null;
	if (!entity || !root) {
		return plan;
	}
	plan.root = root;
	let linkCount = 0;
	const walk = (element: XmlElement, table: string, scope: LinkScope | null) => {
		for (const child of element.children.filter(isActiveElement)) {
			if (child.name === "attribute") {
				const name = attributeValue(child, "name");
				const alias = attributeValue(child, "alias");
				const aggregate = plan.aggregate ? attributeValue(child, "aggregate") : null;
				const lookup = isLookupType(findColumn(tables, table, name)?.columnType);
				if (alias && (plan.aggregate || !scope)) {
					plan.columns.push({
						candidates: [alias],
						pattern: null,
						suffixes: [],
						table,
						column: name,
						aggregate,
						dateGrouping: attributeValue(child, "dategrouping") !== null,
					});
				} else if (alias && scope) {
					plan.columns.push({
						candidates: [alias, `${scope.prefix}.${alias}`],
						pattern: scope.pattern,
						suffixes: [alias],
						table,
						column: name,
						aggregate,
						dateGrouping: false,
					});
				} else if (name) {
					plan.columns.push({
						candidates: columnCandidates(scope?.prefix ?? null, name, lookup),
						pattern: scope?.pattern ?? null,
						suffixes: [name, `_${name}_value`],
						table,
						column: name,
						aggregate,
						dateGrouping: false,
					});
				}
			} else if (child.name === "link-entity") {
				const name = attributeValue(child, "name");
				linkCount += 1;
				if (!name) {
					continue;
				}
				const alias = attributeValue(child, "alias");
				const link: LinkScope = alias
					? { prefix: alias, pattern: null, table: name }
					: { prefix: `${name}${linkCount}`, pattern: new RegExp(`^${escapeRegExp(name)}\\d+$`, "i"), table: name };
				plan.links.push(link);
				walk(child, name, link);
			} else if (child.name === "filter") {
				walk(child, table, scope);
			}
		}
	};
	walk(entity, root, null);
	return plan;
};

const resolveKey = (planned: PlannedColumn, rowKeys: ReadonlySet<string>, claimed: ReadonlySet<string>): string => {
	const available = (key: string) => rowKeys.has(key) && !claimed.has(key);
	const direct = planned.candidates.find(available);
	if (direct) {
		return direct;
	}
	if (planned.pattern) {
		for (const key of rowKeys) {
			const dot = key.lastIndexOf(".");
			if (dot > 0 && !claimed.has(key) && planned.pattern.test(key.slice(0, dot)) && planned.suffixes.includes(key.slice(dot + 1))) {
				return key;
			}
		}
	}
	return planned.candidates[0] ?? "";
};

export const keyLabel = (key: string): string => {
	const dot = key.lastIndexOf(".");
	const last = key.slice(dot + 1);
	const column = lookupKeyColumn(last) ?? last;
	return dot >= 0 ? `${key.slice(0, dot)}.${column}` : column;
};

const typeFor = (metadata: QueryColumn | null, key: string, aggregate: string | null, dateGrouping: boolean): ResultColumnType => {
	if (dateGrouping || aggregate === "count" || aggregate === "countcolumn" || aggregate === "sum" || aggregate === "avg") {
		return "number";
	}
	if (metadata?.columnType) {
		return COLUMN_TYPES[metadata.columnType];
	}
	if (aggregate === "min" || aggregate === "max") {
		return "number";
	}
	return lookupKeyColumn(key.slice(key.lastIndexOf(".") + 1)) ? "lookup" : "text";
};

const isPrimaryKey = (tables: ResultTables, table: string | null, column: string | null): boolean => {
	if (!table || !column) {
		return false;
	}
	const metadata = tables[table.toLowerCase()];
	return (metadata ? metadata.primaryIdAttribute : `${table}id`).toLowerCase() === column.toLowerCase();
};

const scopeOf = (plan: QueryPlan, key: string): { table: string | null; column: string } => {
	const dot = key.lastIndexOf(".");
	const last = key.slice(dot + 1);
	const column = lookupKeyColumn(last) ?? last;
	if (dot < 0) {
		return { table: plan.root, column };
	}
	const prefix = key.slice(0, dot);
	const link = plan.links.find((candidate) => candidate.prefix === prefix) ?? plan.links.find((candidate) => candidate.pattern?.test(prefix));
	return { table: link?.table ?? null, column };
};

const rowKeysInOrder = (rows: readonly QueryRow[]): string[] => {
	const seen = new Set<string>();
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			if (!isAnnotationKey(key)) {
				seen.add(key);
			}
		}
	}
	return [...seen];
};

export const queryTableNames = (document: FetchXmlDocument | null): string[] => {
	const plan = planQuery(document, {});
	const names = [plan.root, ...plan.links.map((link) => link.table)].filter((name): name is string => name !== null).map((name) => name.toLowerCase());
	return [...new Set(names)];
};

export const deriveResultColumns = (document: FetchXmlDocument | null, rows: readonly QueryRow[], tables: ResultTables): ResultGridColumn[] => {
	const plan = planQuery(document, tables);
	const ordered = rowKeysInOrder(rows);
	const rowKeys = new Set(ordered);
	const claimed = new Set<string>();
	const columns: ResultGridColumn[] = [];
	for (const planned of plan.columns) {
		const key = resolveKey(planned, rowKeys, claimed);
		if (!key || claimed.has(key)) {
			continue;
		}
		claimed.add(key);
		const metadata = findColumn(tables, planned.table, planned.column);
		columns.push({
			key,
			label: keyLabel(key),
			type: typeFor(metadata, key, planned.aggregate, planned.dateGrouping),
			table: planned.table,
			column: planned.column,
			primaryKey: !plan.aggregate && isPrimaryKey(tables, planned.table, planned.column),
		});
	}
	for (const key of ordered) {
		if (claimed.has(key)) {
			continue;
		}
		claimed.add(key);
		const scope = plan.aggregate ? { table: null, column: key } : scopeOf(plan, key);
		columns.push({
			key,
			label: keyLabel(key),
			type: typeFor(findColumn(tables, scope.table, scope.column), key, null, false),
			table: scope.table,
			column: scope.table ? scope.column : null,
			primaryKey: !plan.aggregate && isPrimaryKey(tables, scope.table, scope.column),
		});
	}
	return columns;
};

export const cellText = (value: unknown): string => {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
};

export const formattedValue = (row: QueryRow, key: string): string | null => {
	const value = row[`${key}${FORMATTED_VALUE_SUFFIX}`];
	return typeof value === "string" ? value : null;
};

export const cellValueText = (row: QueryRow, key: string, mode: ValueMode): string =>
	(mode === "friendly" ? formattedValue(row, key) : null) ?? cellText(row[key]);
