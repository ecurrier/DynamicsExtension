import { describe, expect, it } from "vitest";

import { type Diagnostic, type FetchXmlDocument, metadataFrom, type NodePath, nodeAtPath, type XmlElement } from "@/shared/lib/fetchxml";
import { ACCOUNT, LOADED, parse } from "@/test/queryTree";

import { attributePlacement, type DetailsGroupView, detailsGroups, groupHasProblem, groupHeading, groupIsOpen } from "./detailsGroups";

const DATED = metadataFrom([
	{
		...ACCOUNT,
		columns: [
			...ACCOUNT.columns,
			{
				logicalName: "createdon",
				displayName: "Created On",
				attributeType: "DateTime",
				attributeTypeName: "DateTimeType",
				columnType: "dateTime",
				attributeOf: null,
				isPrimaryId: false,
				isPrimaryName: false,
				isValidForRead: true,
				dateOnly: false,
				options: [],
				targets: [],
			},
		],
	},
]);

const elementAt = (document: FetchXmlDocument, path: NodePath): XmlElement => nodeAtPath(document, path) as XmlElement;

const layout = (xml: string, path: NodePath, metadata = LOADED): Record<string, string[]> => {
	const document = parse(xml);
	return Object.fromEntries(
		detailsGroups(document, path, elementAt(document, path), metadata).map((view) => [
			view.group,
			view.entries.map((each) => `${each.entry.name}${each.optional ? "?" : ""}`),
		])
	);
};

const placement = (xml: string, path: NodePath, name: string, metadata = LOADED) => {
	const document = parse(xml);
	return attributePlacement(document, path, elementAt(document, path), name, metadata);
};

const VIEW = '<fetch version="1.0" mapping="logical" top="50" count="10"><entity name="account"><attribute name="name" /></entity></fetch>';

describe("detailsGroups", () => {
	it("lays fetch out in three groups and marks the optional fields in Main", () => {
		expect(layout(VIEW, [])).toEqual({
			main: ["top?", "distinct?", "aggregate?", "returntotalrecordcount?"],
			more: ["count", "page", "paging-cookie", "aggregatelimit", "datasource", "latematerialize", "options", "useraworderby"],
			legacy: ["no-lock", "version", "mapping"],
		});
	});

	it("leaves out a group with nothing in it for the element", () => {
		expect(layout(VIEW, [0])).toEqual({ main: ["name"] });
		expect(layout(VIEW, [0, 0])).toEqual({
			main: ["name", "alias?"],
			more: ["aggregate", "groupby", "distinct", "dategrouping", "usertimezone", "rowaggregate"],
		});
	});

	it("counts the set attributes of each group", () => {
		const document = parse(VIEW);
		const counts = detailsGroups(document, [], elementAt(document, []), LOADED).map((view) => [view.group, view.setCount]);
		expect(counts).toEqual([
			["main", 1],
			["more", 1],
			["legacy", 2],
		]);
	});

	it("moves aggregate, groupby and alias to Main in an aggregate Query and makes alias required", () => {
		const aggregate = '<fetch aggregate="true"><entity name="account"><attribute name="name" /><order alias="n" /></entity></fetch>';
		expect(layout(aggregate, [0, 0])).toEqual({
			main: ["name", "alias", "aggregate?", "groupby?"],
			more: ["distinct", "dategrouping", "usertimezone", "rowaggregate"],
		});
		expect(layout(aggregate, [0, 1])).toEqual({ main: ["attribute?", "alias", "descending?"], more: ["entityname"] });
		expect(layout('<fetch><entity name="account"><order attribute="name" /></entity></fetch>', [0, 0])).toEqual({
			main: ["attribute", "descending?"],
			more: ["alias", "entityname"],
		});
	});

	it("moves dategrouping to Main when the attribute is grouped and its Column is a date", () => {
		const grouped = '<fetch aggregate="true"><entity name="account"><attribute name="createdon" groupby="true" alias="d" /></entity></fetch>';
		expect(placement(grouped, [0, 0], "dategrouping", DATED)).toEqual({ group: "main", required: false });
		expect(placement(grouped, [0, 0], "dategrouping", LOADED).group).toBe("more");
		const text = '<fetch aggregate="true"><entity name="account"><attribute name="name" groupby="true" alias="n" /></entity></fetch>';
		expect(placement(text, [0, 0], "dategrouping", DATED).group).toBe("more");
		const ungrouped = '<fetch aggregate="true"><entity name="account"><attribute name="createdon" alias="d" /></entity></fetch>';
		expect(placement(ungrouped, [0, 0], "dategrouping", DATED).group).toBe("more");
	});

	it("shows the condition's value field for value and valueof, and requires value only when the operator takes one", () => {
		const condition = '<fetch><entity name="account"><filter><condition attribute="name" operator="eq" value="a" uiname="x" /></filter></entity></fetch>';
		expect(layout(condition, [0, 0, 0])).toEqual({ main: ["attribute", "operator", "value"], more: ["entityname"], legacy: ["uiname"] });
		const document = parse(condition);
		const main = detailsGroups(document, [0, 0, 0], elementAt(document, [0, 0, 0]), LOADED)[0];
		expect(main?.entries.find((each) => each.entry.name === "value")?.covers).toEqual(["value", "valueof"]);
		expect(
			placement('<fetch><entity name="account"><filter><condition attribute="name" operator="null" /></filter></entity></fetch>', [0, 0, 0], "value")
		).toEqual({
			group: "main",
			required: false,
		});
		expect(
			placement(
				'<fetch><entity name="account"><filter><condition attribute="name" operator="eq" valueof="name" /></filter></entity></fetch>',
				[0, 0, 0],
				"value"
			).required
		).toBe(false);
	});

	it("marks every link-entity field but name as optional and keeps visible in the legacy group", () => {
		expect(layout('<fetch><entity name="account"><link-entity name="contact" visible="false" /></entity></fetch>', [0, 0])).toEqual({
			main: ["name", "from?", "to?", "alias?", "link-type?"],
			more: ["intersect"],
			legacy: ["visible"],
		});
	});

	it("puts attributes the catalogue does not know in the legacy group, after the others", () => {
		expect(layout('<fetch><entity name="account"><filter custom="1" /></entity></fetch>', [0, 0])).toEqual({
			main: ["type?"],
			more: ["hint"],
			legacy: ["isquickfindfields", "overridequickfindrecordlimitenabled", "overridequickfindrecordlimitdisabled", "custom"],
		});
	});
});

describe("group headings and opening", () => {
	const view = (setCount: number): DetailsGroupView => ({ group: "more", entries: [], setCount });

	it("says how many attributes are set", () => {
		expect(groupHeading("more", 2)).toBe("More options · 2 set");
		expect(groupHeading("legacy", 0)).toBe("Legacy and view settings");
	});

	it("finds a problem in a group, so the group opens by itself, and counts set attributes without opening", () => {
		const document = parse('<fetch><entity name="account"><filter hint="x" /></entity></fetch>');
		const [, more] = detailsGroups(document, [0, 0], elementAt(document, [0, 0]), LOADED);
		const problem: Diagnostic = { severity: "error", rule: "enumeration", message: "", path: [0, 0], attribute: "hint" };
		expect(more?.setCount).toBe(1);
		expect(more && groupHasProblem([], [0, 0], more)).toBe(false);
		expect(more && groupHasProblem([problem], [0, 0], more)).toBe(true);
		expect(more && groupHasProblem([{ ...problem, path: [0] }], [0, 0], more)).toBe(false);
		expect(groupHasProblem([problem], [0, 0], view(0))).toBe(false);
	});

	it("stays open once opened, opens by itself, and stays closed on the row where it was closed", () => {
		expect(groupIsOpen(true, false, false)).toBe(true);
		expect(groupIsOpen(false, true, false)).toBe(true);
		expect(groupIsOpen(false, false, false)).toBe(false);
		expect(groupIsOpen(true, true, true)).toBe(false);
	});
});
