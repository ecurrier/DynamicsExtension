import { isGuid } from "@/shared/lib";

export type ODataConversion = { ok: true; query: string } | { ok: false; reason: string };

const OPERATORS: Record<string, string> = {
	eq: "eq",
	ne: "ne",
	neq: "ne",
	gt: "gt",
	ge: "ge",
	lt: "lt",
	le: "le",
};

const literal = (value: string): string => {
	if (value === "") {
		return "''";
	}
	if (isGuid(value) || /^-?\d+(\.\d+)?$/.test(value) || value === "true" || value === "false") {
		return value;
	}
	return `'${value.replace(/'/g, "''")}'`;
};

const stripWildcards = (value: string): string => value.replace(/^%+|%+$/g, "");

const conditionToOData = (condition: Element): string => {
	const attribute = condition.getAttribute("attribute") ?? "";
	const operator = (condition.getAttribute("operator") ?? "").toLowerCase();
	const rawValue = condition.getAttribute("value") ?? "";
	const values = [...condition.querySelectorAll("value")].map((value) => value.textContent ?? "");

	if (!attribute) {
		throw new Error("a condition has no column");
	}
	const simple = OPERATORS[operator];
	if (simple) {
		return `${attribute} ${simple} ${literal(rawValue)}`;
	}
	switch (operator) {
		case "null":
			return `${attribute} eq null`;
		case "not-null":
			return `${attribute} ne null`;
		case "like":
			return `contains(${attribute},${literal(stripWildcards(rawValue))})`;
		case "not-like":
			return `not contains(${attribute},${literal(stripWildcards(rawValue))})`;
		case "begins-with":
			return `startswith(${attribute},${literal(rawValue)})`;
		case "ends-with":
			return `endswith(${attribute},${literal(rawValue)})`;
		case "in": {
			if (values.length === 0) {
				throw new Error(`the "in" condition on ${attribute} has no values`);
			}
			return `(${values.map((value) => `${attribute} eq ${literal(value)}`).join(" or ")})`;
		}
		default:
			throw new Error(`the "${operator}" operator on ${attribute} has no direct OData equivalent`);
	}
};

const filterToOData = (filter: Element): string => {
	if (filter.querySelector("filter")) {
		throw new Error("nested filters are not translated");
	}
	const join = (filter.getAttribute("type") ?? "and").toLowerCase() === "or" ? " or " : " and ";
	const parts = [...filter.querySelectorAll(":scope > condition")].map(conditionToOData);
	return parts.length > 1 ? parts.join(join) : (parts[0] ?? "");
};

export const fetchXmlToOData = (fetchXml: string): ODataConversion => {
	const document = new DOMParser().parseFromString(fetchXml, "application/xml");
	if (document.querySelector("parsererror")) {
		return { ok: false, reason: "the Fetch XML is not well-formed" };
	}
	const fetch = document.documentElement;
	const entity = fetch.querySelector("entity");
	if (!entity) {
		return { ok: false, reason: "no entity element was found" };
	}
	if (fetch.getAttribute("aggregate") === "true") {
		return { ok: false, reason: "aggregate queries have no direct OData equivalent" };
	}
	if (entity.querySelector("link-entity")) {
		return { ok: false, reason: "link-entity joins need $expand, which depends on relationship names" };
	}

	const parts: string[] = [];
	const attributes = [...entity.querySelectorAll(":scope > attribute")]
		.map((attribute) => attribute.getAttribute("name") ?? "")
		.filter((name) => name.length > 0);
	if (attributes.length > 0 && !entity.querySelector(":scope > all-attributes")) {
		parts.push(`$select=${attributes.join(",")}`);
	}

	const filter = entity.querySelector(":scope > filter");
	if (filter) {
		try {
			const expression = filterToOData(filter);
			if (expression) {
				parts.push(`$filter=${expression}`);
			}
		} catch (error) {
			return { ok: false, reason: error instanceof Error ? error.message : String(error) };
		}
	}

	const orders = [...entity.querySelectorAll(":scope > order")]
		.map((order) => {
			const attribute = order.getAttribute("attribute") ?? "";
			return attribute ? `${attribute}${order.getAttribute("descending") === "true" ? " desc" : ""}` : "";
		})
		.filter((entry) => entry.length > 0);
	if (orders.length > 0) {
		parts.push(`$orderby=${orders.join(",")}`);
	}

	const top = fetch.getAttribute("top");
	if (top) {
		parts.push(`$top=${top}`);
	}

	return { ok: true, query: parts.length > 0 ? `?${parts.join("&")}` : "" };
};

export const entityNameOf = (fetchXml: string): string | null => /<entity[^>]*\sname=["']([^"']+)["']/.exec(fetchXml)?.[1] ?? null;

export const webApiSnippet = (fetchXml: string): string => {
	const entity = entityNameOf(fetchXml) ?? "account";
	const encoded = fetchXml.replace(/\s+/g, " ").trim();
	return [
		`const fetchXml = \`${encoded}\``,
		`const result = await Xrm.WebApi.retrieveMultipleRecords(`,
		`  '${entity}',`,
		"  `?fetchXml=${encodeURIComponent(fetchXml)}`,",
		")",
		"console.table(result.entities)",
	].join("\n");
};
