import { describe, expect, it } from "vitest";

import { type FetchXmlDocument, metadataFrom, nodeAtPath, serializeFetchXml, type XmlElement } from "@/shared/lib/fetchxml";
import { type QueryColumn } from "@/shared/types";
import { ACCOUNT, CONTACT, parse } from "@/test/queryTree";

import {
	changeConditionColumn,
	changeConditionOperator,
	conditionLookup,
	conditionOperators,
	conditionValues,
	defaultValueOf,
	fitValues,
	operatorOptions,
	parseListValues,
	setConditionLookup,
	setConditionValueOf,
	setConditionValues,
	valueEditorFor,
	valueFits,
	valueOfOptions,
} from "./conditionEditing";
import { rankPickerOptions } from "./pickerSearch";
import { type ChangeResult } from "./treeEdits";

const column = (logicalName: string, extra: Partial<QueryColumn>): QueryColumn => ({
	logicalName,
	displayName: logicalName,
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

const NAME = column("name", { isPrimaryName: true });
const INDUSTRY = column("industrycode", {
	columnType: "choice",
	options: [
		{ value: 1, label: "Accounting" },
		{ value: 2, label: "Agriculture" },
	],
});
const CREATED = column("createdon", { columnType: "dateTime" });
const BIRTHDAY = column("birthdate", { columnType: "dateTime", dateOnly: true });
const EMPLOYEES = column("numberofemployees", { columnType: "wholeNumber" });
const CONTACT_LOOKUP = column("primarycontactid", {
	columnType: "lookup",
	targets: [{ logicalName: "contact", navigationProperty: "primarycontactid", entitySetName: "contacts" }],
});
const DONOTEMAIL = column("donotemail", { columnType: "yesNo" });
const ID = column("accountid", { columnType: "uniqueIdentifier", isPrimaryId: true });

const ok = (result: ChangeResult): FetchXmlDocument => {
	if (!result.ok) {
		throw new Error(result.reason);
	}
	return result.change.document;
};

const condition = (document: FetchXmlDocument): XmlElement => nodeAtPath(document, [0, 0, 0]) as XmlElement;

const xml = (document: FetchXmlDocument): string => serializeFetchXml(document, { minify: true });

const query = (inner: string): FetchXmlDocument => parse(`<fetch><entity name="account"><filter>${inner}</filter></entity></fetch>`);

describe("conditionOperators", () => {
	it("never offers a deprecated operator", () => {
		expect(conditionOperators(undefined).some((operator) => operator.name === "neq")).toBe(false);
		expect(conditionOperators(NAME).some((operator) => operator.deprecated)).toBe(false);
	});

	it("leaves the hour and minute operators off date-only Columns", () => {
		const timed = conditionOperators(CREATED).map((operator) => operator.name);
		const dateOnly = conditionOperators(BIRTHDAY).map((operator) => operator.name);
		expect(timed).toContain("last-x-hours");
		expect(dateOnly).not.toContain("last-x-hours");
		expect(dateOnly).not.toContain("olderthan-x-minutes");
		expect(dateOnly).toContain("last-x-days");
	});

	it("offers like for text but not for a Choice", () => {
		expect(conditionOperators(NAME).map((operator) => operator.name)).toContain("like");
		expect(conditionOperators(INDUSTRY).map((operator) => operator.name)).not.toContain("like");
		expect(conditionOperators(INDUSTRY)[0]?.name).toBe("eq");
	});

	it("finds eq by typing equals, leading with the literal operator", () => {
		const options = operatorOptions(NAME);
		expect(rankPickerOptions(options, "equals")[0]?.value).toBe("eq");
		expect(options.find((option) => option.value === "eq")).toMatchObject({ text: "eq", secondary: "Equal to the value." });
	});
});

describe("valueEditorFor", () => {
	it("follows the Column type and the operator's value count", () => {
		expect(valueEditorFor(NAME, "null")).toEqual({ kind: "none", count: "none" });
		expect(valueEditorFor(NAME, "like")).toEqual({ kind: "text", count: "one" });
		expect(valueEditorFor(NAME, "in")).toEqual({ kind: "text", count: "list" });
		expect(valueEditorFor(INDUSTRY, "eq")).toEqual({ kind: "choice", count: "one" });
		expect(valueEditorFor(INDUSTRY, "in")).toEqual({ kind: "choice", count: "list" });
		expect(valueEditorFor(DONOTEMAIL, "eq")).toEqual({ kind: "yesNo", count: "one" });
		expect(valueEditorFor(CREATED, "on")).toEqual({ kind: "date", count: "one" });
		expect(valueEditorFor(CREATED, "between")).toEqual({ kind: "date", count: "two" });
		expect(valueEditorFor(CREATED, "last-x-days")).toEqual({ kind: "integer", count: "one" });
		expect(valueEditorFor(EMPLOYEES, "gt")).toEqual({ kind: "number", count: "one" });
		expect(valueEditorFor(CONTACT_LOOKUP, "eq")).toEqual({ kind: "lookup", count: "one" });
		expect(valueEditorFor(CONTACT_LOOKUP, "in")).toEqual({ kind: "text", count: "list" });
		expect(valueEditorFor(ID, "eq")).toEqual({ kind: "lookup", count: "one" });
		expect(valueEditorFor(undefined, "eq")).toEqual({ kind: "text", count: "one" });
	});
});

describe("values", () => {
	it("reads the value attribute or the value children", () => {
		expect(conditionValues(condition(query('<condition attribute="name" operator="eq" value="x"/>')))).toEqual(["x"]);
		expect(conditionValues(condition(query('<condition attribute="industrycode" operator="in"><value>1</value><value>2</value></condition>')))).toEqual([
			"1",
			"2",
		]);
	});

	it("knows which values fit an editor", () => {
		expect(valueFits("%Contoso%", "choice", INDUSTRY)).toBe(false);
		expect(valueFits("2", "choice", INDUSTRY)).toBe(true);
		expect(valueFits("true", "yesNo", DONOTEMAIL)).toBe(true);
		expect(valueFits("1.5", "integer", undefined)).toBe(false);
		expect(valueFits("12", "number", undefined)).toBe(true);
		expect(valueFits("{00000000-0000-0000-0000-000000000001}", "lookup", undefined)).toBe(true);
		expect(fitValues(["1", "2", "3"], { kind: "text", count: "one" }, NAME)).toEqual(["1"]);
		expect(fitValues(["1", "x"], { kind: "number", count: "list" }, EMPLOYEES)).toEqual(["1"]);
	});

	it("splits a list on lines when there are any, otherwise on commas", () => {
		expect(parseListValues("a, b ,,c")).toEqual(["a", "b", "c"]);
		expect(parseListValues("Smith, John\nDoe, Jane\n")).toEqual(["Smith, John", "Doe, Jane"]);
	});
});

describe("changeConditionColumn", () => {
	it("resets like to eq and clears the text value when the Column becomes a Choice", () => {
		const document = ok(
			changeConditionColumn(query('<condition attribute="name" operator="like" value="%Contoso%"/>'), [0, 0, 0], "industrycode", INDUSTRY)
		);
		expect(xml(document)).toContain('<condition attribute="industrycode" operator="eq"/>');
	});

	it("keeps the operator and a value that still fits", () => {
		const document = ok(changeConditionColumn(query('<condition attribute="name" operator="eq" value="1"/>'), [0, 0, 0], "industrycode", INDUSTRY));
		expect(xml(document)).toContain('<condition attribute="industrycode" operator="eq" value="1"/>');
	});

	it("keeps a value list when the new Column takes the same list", () => {
		const document = ok(
			changeConditionColumn(
				query('<condition attribute="statecode" operator="in"><value>1</value><value>9</value></condition>'),
				[0, 0, 0],
				"industrycode",
				INDUSTRY
			)
		);
		expect(xml(document)).toContain('<condition attribute="industrycode" operator="in"><value>1</value></condition>');
	});

	it("drops the record name and table when the Column changes", () => {
		const document = ok(
			changeConditionColumn(
				query('<condition attribute="primarycontactid" operator="eq" value="00000000-0000-0000-0000-000000000001" uiname="Ann" uitype="contact"/>'),
				[0, 0, 0],
				"name",
				NAME
			)
		);
		expect(xml(document)).toContain('<condition attribute="name" operator="eq" value="00000000-0000-0000-0000-000000000001"/>');
	});
});

describe("changeConditionOperator", () => {
	it("turns a single value into value children for a list operator and back", () => {
		const listed = ok(changeConditionOperator(query('<condition attribute="industrycode" operator="eq" value="2"/>'), [0, 0, 0], "in", INDUSTRY));
		expect(xml(listed)).toContain('<condition attribute="industrycode" operator="in"><value>2</value></condition>');
		const single = ok(changeConditionOperator(listed, [0, 0, 0], "ne", INDUSTRY));
		expect(xml(single)).toContain('<condition attribute="industrycode" operator="ne" value="2"/>');
	});

	it("clears the value for an operator that takes none, and valueof with it", () => {
		const document = ok(changeConditionOperator(query('<condition attribute="name" operator="eq" valueof="accountnumber"/>'), [0, 0, 0], "null", NAME));
		expect(xml(document)).toContain('<condition attribute="name" operator="null"/>');
	});

	it("keeps valueof for another one-value operator", () => {
		const document = ok(changeConditionOperator(query('<condition attribute="name" operator="eq" valueof="accountnumber"/>'), [0, 0, 0], "ne", NAME));
		expect(xml(document)).toContain('<condition attribute="name" operator="ne" valueof="accountnumber"/>');
	});
});

describe("setConditionValues", () => {
	it("writes one value as an attribute", () => {
		const document = ok(
			setConditionValues(query('<condition attribute="name" operator="like"/>'), [0, 0, 0], ["%Contoso%"], { kind: "text", count: "one" })
		);
		expect(xml(document)).toContain('<condition attribute="name" operator="like" value="%Contoso%"/>');
	});

	it("writes a list as value children", () => {
		const document = ok(
			setConditionValues(query('<condition attribute="industrycode" operator="in"/>'), [0, 0, 0], ["1", "2"], { kind: "choice", count: "list" })
		);
		expect(xml(document)).toContain('<condition attribute="industrycode" operator="in"><value>1</value><value>2</value></condition>');
	});

	it("refuses when nothing changed", () => {
		expect(setConditionValues(query('<condition attribute="name" operator="eq" value="a"/>'), [0, 0, 0], ["a"], { kind: "text", count: "one" }).ok).toBe(
			false
		);
	});

	it("removes the value attribute when emptied", () => {
		const document = ok(
			setConditionValues(query('<condition attribute="name" operator="eq" value="a"/>'), [0, 0, 0], [""], { kind: "text", count: "one" })
		);
		expect(xml(document)).toContain('<condition attribute="name" operator="eq"/>');
	});
});

describe("lookups", () => {
	it("writes value, uiname and uitype together and reads them back", () => {
		const document = ok(
			setConditionLookup(query('<condition attribute="primarycontactid" operator="eq"/>'), [0, 0, 0], {
				id: "00000000-0000-0000-0000-000000000001",
				name: "Ann Smith",
				table: "contact",
			})
		);
		expect(xml(document)).toContain('value="00000000-0000-0000-0000-000000000001" uiname="Ann Smith" uitype="contact"');
		expect(conditionLookup(condition(document), "contact")).toEqual({ id: "00000000-0000-0000-0000-000000000001", name: "Ann Smith", table: "contact" });
		expect(xml(ok(setConditionLookup(document, [0, 0, 0], null)))).toContain('<condition attribute="primarycontactid" operator="eq"/>');
	});
});

describe("valueof", () => {
	const metadata = metadataFrom([ACCOUNT, CONTACT]);
	const linked = parse(
		'<fetch><entity name="account"><filter><condition attribute="name" operator="eq" value="x"/></filter><link-entity name="contact" from="contactid" to="primarycontactid" alias="pc"/></entity></fetch>'
	);

	it("lists own Columns and alias-prefixed Columns of linked Tables", () => {
		const values = valueOfOptions(linked, [0, 0, 0], metadata, "logical").map((option) => option.value);
		expect(values).toContain("name");
		expect(values).toContain("pc.fullname");
	});

	it("switches to comparing with a Column and back", () => {
		const reference = defaultValueOf(linked, [0, 0, 0], metadata, NAME);
		expect(reference).toBe("pc.fullname");
		const on = ok(setConditionValueOf(linked, [0, 0, 0], reference));
		expect(xml(on)).toContain('<condition attribute="name" operator="eq" valueof="pc.fullname"/>');
		expect(xml(ok(setConditionValueOf(on, [0, 0, 0], null)))).toContain('<condition attribute="name" operator="eq"/>');
	});
});
