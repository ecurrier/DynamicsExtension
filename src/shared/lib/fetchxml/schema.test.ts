import { describe, expect, it } from "vitest";

import { OPERATORS } from "./operators";
import { attributeDefinition, attributesOf, childrenOf, ELEMENTS, elementDefinition, isKnownElement, isValidChild } from "./schema";

const DOCUMENTED_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
	fetch: [
		"top",
		"count",
		"page",
		"paging-cookie",
		"distinct",
		"aggregate",
		"returntotalrecordcount",
		"aggregatelimit",
		"datasource",
		"latematerialize",
		"no-lock",
		"options",
		"useraworderby",
	],
	entity: ["name"],
	"all-attributes": [],
	attribute: ["name", "alias", "aggregate", "groupby", "distinct", "dategrouping", "usertimezone", "rowaggregate"],
	order: ["attribute", "alias", "descending", "entityname"],
	filter: ["type", "hint", "isquickfindfields", "overridequickfindrecordlimitenabled", "overridequickfindrecordlimitdisabled"],
	condition: ["attribute", "operator", "value", "valueof", "entityname"],
	value: [],
	"link-entity": ["name", "from", "to", "alias", "link-type", "intersect"],
};

const UNDOCUMENTED_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
	fetch: ["version", "mapping"],
	condition: ["uiname", "uitype"],
	"link-entity": ["visible"],
};

const enumerationOf = (element: string, attribute: string): readonly string[] => {
	const value = attributeDefinition(element, attribute)?.value;
	return value?.kind === "enumeration" ? value.values.map((each) => each.value) : [];
};

describe("element catalogue", () => {
	it("has every documented element and only those", () => {
		expect(ELEMENTS.map((element) => element.name).sort()).toEqual(Object.keys(DOCUMENTED_ATTRIBUTES).sort());
	});

	it("has every documented attribute of every element, plus the view attributes marked undocumented", () => {
		for (const [element, names] of Object.entries(DOCUMENTED_ATTRIBUTES)) {
			const extra = UNDOCUMENTED_ATTRIBUTES[element] ?? [];
			expect(
				attributesOf(element)
					.map((attribute) => attribute.name)
					.sort()
			).toEqual([...names, ...extra].sort());
			expect(
				attributesOf(element)
					.filter((attribute) => attribute.documented)
					.map((attribute) => attribute.name)
			).toEqual(expect.arrayContaining([...names]));
			for (const name of extra) {
				expect(attributeDefinition(element, name)?.documented).toBe(false);
			}
		}
	});

	it("matches the documented enumerations", () => {
		expect(enumerationOf("link-entity", "link-type")).toEqual([
			"inner",
			"outer",
			"any",
			"not any",
			"all",
			"not all",
			"exists",
			"in",
			"matchfirstrowusingcrossapply",
		]);
		expect(enumerationOf("attribute", "aggregate")).toEqual(["avg", "count", "countcolumn", "max", "min", "sum"]);
		expect(enumerationOf("attribute", "dategrouping")).toEqual(["day", "week", "month", "quarter", "year", "fiscal-period", "fiscal-year"]);
		expect(enumerationOf("attribute", "rowaggregate")).toEqual(["CountChildren"]);
		expect(enumerationOf("filter", "type")).toEqual(["and", "or"]);
		expect(enumerationOf("filter", "hint")).toEqual(["union"]);
		expect(enumerationOf("fetch", "datasource")).toEqual(["retained", "bin"]);
		expect(enumerationOf("fetch", "options")).toEqual([
			"ForceOrder",
			"DisableRowGoal",
			"EnableOptimizerHotfixes",
			"LoopJoin",
			"MergeJoin",
			"HashJoin",
			"NO_PERFORMANCE_SPOOL",
			"ENABLE_HIST_AMENDMENT_FOR_ASC_KEYS",
		]);
		expect(attributeDefinition("fetch", "options")?.value).toMatchObject({ multiple: true });
		expect(enumerationOf("condition", "operator")).toEqual(OPERATORS.map((operator) => operator.name));
	});

	it("marks the documented required attributes", () => {
		const required = ELEMENTS.flatMap((element) =>
			element.attributes.filter((attribute) => attribute.required).map((attribute) => `${element.name}.${attribute.name}`)
		);
		expect(required.sort()).toEqual(["attribute.name", "condition.operator", "entity.name", "link-entity.name"]);
	});

	it("gives every element and attribute a one-sentence description and every enumeration value a description", () => {
		for (const element of ELEMENTS) {
			expect(element.description).toMatch(/^[A-Z].*\.$/);
			for (const attribute of element.attributes) {
				expect(attribute.description).toMatch(/^[A-Z].*\.$/);
				if (attribute.value.kind === "enumeration") {
					for (const value of attribute.value.values) {
						expect(value.description).toMatch(/^[A-Z].*\.$/);
					}
				}
			}
		}
	});

	it("uses the value kinds the editors need", () => {
		expect(attributeDefinition("entity", "name")?.value.kind).toBe("table");
		expect(attributeDefinition("attribute", "name")?.value.kind).toBe("column");
		expect(attributeDefinition("order", "alias")?.value.kind).toBe("alias");
		expect(attributeDefinition("condition", "valueof")?.value.kind).toBe("column");
		expect(attributeDefinition("fetch", "distinct")?.value.kind).toBe("boolean");
		expect(attributeDefinition("fetch", "top")?.value).toEqual({ kind: "number", minimum: 1, maximum: 5000 });
		expect(attributeDefinition("condition", "value")?.value.kind).toBe("text");
	});

	it("marks the attributes that belong on the tree row", () => {
		const common = (element: string): string[] =>
			attributesOf(element)
				.filter((attribute) => attribute.common)
				.map((attribute) => attribute.name);
		expect(common("condition")).toEqual(["attribute", "operator", "value", "valueof"]);
		expect(common("link-entity")).toEqual(["name", "from", "to", "alias", "link-type"]);
		expect(common("filter")).toEqual(["type"]);
	});
});

describe("element lookups", () => {
	it("lists children in the standard order and derives parents", () => {
		expect(childrenOf("fetch")).toEqual(["entity"]);
		expect(childrenOf("entity")).toEqual(["all-attributes", "attribute", "order", "filter", "link-entity"]);
		expect(childrenOf("link-entity")).toEqual(childrenOf("entity"));
		expect(childrenOf("filter")).toEqual(["condition", "filter", "link-entity"]);
		expect(childrenOf("condition")).toEqual(["value"]);
		expect(childrenOf("value")).toEqual([]);
		expect(elementDefinition("link-entity")?.parents).toEqual(["entity", "filter", "link-entity"]);
		expect(elementDefinition("fetch")?.parents).toEqual([]);
		expect(elementDefinition("value")?.text).toBe(true);
	});

	it("knows the documented occurrence limits", () => {
		const limits = (element: string): Record<string, number | undefined> =>
			Object.fromEntries((elementDefinition(element)?.children ?? []).map((child) => [child.name, child.max]));
		expect(limits("fetch")).toEqual({ entity: 1 });
		expect(limits("entity")).toMatchObject({ "all-attributes": 1, filter: 1, attribute: undefined });
		expect(limits("filter")).toMatchObject({ condition: 500 });
	});

	it("says whether an element is known and valid under a parent", () => {
		expect(isKnownElement("condition")).toBe(true);
		expect(isKnownElement("futurething")).toBe(false);
		expect(isValidChild("filter", "condition")).toBe(true);
		expect(isValidChild("filter", "link-entity")).toBe(true);
		expect(isValidChild("fetch", "condition")).toBe(false);
		expect(isValidChild("entity", "condition")).toBe(false);
		expect(isValidChild("futurething", "condition")).toBe(false);
		expect(attributesOf("futurething")).toEqual([]);
		expect(childrenOf("futurething")).toEqual([]);
	});
});
