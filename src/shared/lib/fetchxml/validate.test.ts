import { describe, expect, it } from "vitest";

import type { QueryColumn, QueryColumnType, QueryTable } from "@/shared/types";

import { setAttribute } from "./edit";
import { metadataFrom, type QueryMetadata } from "./metadata";
import { parseFetchXml } from "./parse";
import { type FetchXmlDocument } from "./types";
import { type Diagnostic, type DiagnosticRule, validate } from "./validate";

const parsed = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors.map((error) => error.message).join("; "));
	}
	return result.document;
};

const column = (logicalName: string, columnType: QueryColumnType | null, extra: Partial<QueryColumn> = {}): QueryColumn => ({
	logicalName,
	displayName: logicalName,
	attributeType: "String",
	attributeTypeName: "StringType",
	columnType,
	attributeOf: null,
	isPrimaryId: false,
	isPrimaryName: false,
	isValidForRead: true,
	dateOnly: false,
	options: [],
	targets: [],
	...extra,
});

const table = (logicalName: string, columns: readonly QueryColumn[]): QueryTable => ({
	logicalName,
	displayName: logicalName,
	entitySetName: `${logicalName}s`,
	primaryIdAttribute: `${logicalName}id`,
	primaryNameAttribute: "name",
	columns: [...columns],
	manyToOne: [],
	oneToMany: [],
	manyToMany: [],
});

const OPTIONS = [
	{ value: 1, label: "Accounting" },
	{ value: 2, label: "Agriculture" },
];

const META: QueryMetadata = metadataFrom(
	[
		table("account", [
			column("accountid", "uniqueIdentifier"),
			column("name", "text"),
			column("description", "memo"),
			column("revenue", "decimalOrMoney"),
			column("numberofemployees", "wholeNumber"),
			column("industrycode", "choice", { options: OPTIONS }),
			column("categories", "multiChoice", { options: OPTIONS }),
			column("statecode", "stateOrStatus", { options: [{ value: 0, label: "Active" }] }),
			column("createdon", "dateTime"),
			column("donotemail", "yesNo"),
			column("primarycontactid", "lookup"),
			column("ownerid", "owner"),
			column("address1_composite", null),
		]),
		table("contact", [
			column("contactid", "uniqueIdentifier"),
			column("fullname", "text"),
			column("parentcustomerid", "lookup"),
			column("birthdate", "dateTime", { dateOnly: true }),
		]),
		table("systemuser", [column("systemuserid", "uniqueIdentifier"), column("fullname", "text")]),
	],
	["nosuch"]
);

const check = (text: string, metadata: QueryMetadata = META): readonly Diagnostic[] => validate(parsed(text), metadata);

const rulesOf = (text: string, metadata: QueryMetadata = META): DiagnosticRule[] => check(text, metadata).map((entry) => entry.rule);

const inAccount = (inner: string, fetch = ""): string => `<fetch${fetch}><entity name="account">${inner}</entity></fetch>`;

const condition = (attributes: string, values = ""): string =>
	inAccount(values === "" ? `<filter><condition ${attributes} /></filter>` : `<filter><condition ${attributes}>${values}</condition></filter>`);

const deepFreeze = <T>(value: T): T => {
	if (value && typeof value === "object") {
		Object.values(value).forEach(deepFreeze);
		Object.freeze(value);
	}
	return value;
};

const VALID = [
	'<fetch top="50" distinct="true" version="1.0" mapping="logical">',
	'  <entity name="account">',
	'    <attribute name="name" />',
	'    <attribute name="revenue" alias="income" />',
	'    <order attribute="name" />',
	'    <order attribute="fullname" entityname="pc" descending="true" />',
	'    <filter type="and">',
	'      <condition attribute="statecode" operator="eq" value="0" />',
	'      <condition attribute="industrycode" operator="in"><value>1</value><value>2</value></condition>',
	'      <condition attribute="categories" operator="contain-values"><value>2</value></condition>',
	'      <condition attribute="revenue" operator="gt" valueof="numberofemployees" />',
	'      <condition attribute="name" operator="eq" valueof="pc.fullname" />',
	'      <condition attribute="primarycontactid" operator="eq" value="{6F5A4C52-0000-0000-0000-000000000001}" uiname="Pat" uitype="contact" />',
	'      <filter type="or">',
	'        <condition attribute="createdon" operator="last-x-days" value="30" />',
	'        <condition attribute="createdon" operator="between"><value>2024-01-01</value><value>2024-12-31T23:59:59Z</value></condition>',
	'        <condition attribute="name" operator="like" value="%co%" />',
	'        <condition attribute="address1_composite" operator="like" value="%x%" />',
	"      </filter>",
	'      <condition attribute="fullname" entityname="pc" operator="not-null" />',
	"    </filter>",
	'    <link-entity name="contact" from="contactid" to="primarycontactid" alias="pc" link-type="outer">',
	'      <attribute name="fullname" />',
	'      <filter><condition attribute="birthdate" operator="on-or-before" value="2000-01-01" /></filter>',
	"    </link-entity>",
	'    <link-entity name="systemuser" from="systemuserid" to="ownerid" alias="owner">',
	'      <filter><condition attribute="systemuserid" operator="eq-userid" /></filter>',
	"    </link-entity>",
	"  </entity>",
	"</fetch>",
].join("\n");

const VALID_AGGREGATE = [
	'<fetch aggregate="true" aggregatelimit="1000">',
	'  <entity name="account">',
	'    <attribute name="industrycode" groupby="true" alias="industry" />',
	'    <attribute name="revenue" aggregate="sum" alias="total" />',
	'    <order alias="total" descending="true" />',
	'    <link-entity name="contact" from="parentcustomerid" to="accountid" alias="c">',
	'      <attribute name="contactid" aggregate="countcolumn" distinct="true" alias="contacts" />',
	"    </link-entity>",
	"  </entity>",
	"</fetch>",
].join("\n");

describe("validate: valid queries", () => {
	it("finds nothing wrong with a complex Query", () => {
		expect(check(VALID)).toEqual([]);
	});

	it("finds nothing wrong with an aggregate Query", () => {
		expect(check(VALID_AGGREGATE)).toEqual([]);
	});

	it("does not mutate its input", () => {
		const document = deepFreeze(parsed(VALID));
		expect(() => validate(document, META)).not.toThrow();
	});
});

describe("validate: structure", () => {
	it("root-element: the root must be fetch", () => {
		expect(rulesOf("<savedquery />")).toEqual(["root-element"]);
		expect(rulesOf(inAccount(""))).toEqual([]);
	});

	it("invalid-child: an element not valid under its parent", () => {
		const diagnostics = check(inAccount('<condition attribute="name" operator="null" />'));
		expect(diagnostics.map((entry) => [entry.rule, entry.severity, entry.path])).toEqual([["invalid-child", "error", [0, 0]]]);
		expect(diagnostics[0]?.message).toBe("condition is not valid inside entity.");
		expect(rulesOf(condition('attribute="name" operator="null"'))).toEqual([]);
	});

	it("child-limit: occurrences beyond ChildRule.max", () => {
		const diagnostics = check(inAccount("<filter /><filter /><all-attributes /><all-attributes />"));
		expect(diagnostics.map((entry) => [entry.rule, entry.path])).toEqual([
			["child-limit", [0, 1]],
			["child-limit", [0, 3]],
		]);
		expect(diagnostics[0]?.message).toBe("entity can hold at most 1 filter element.");
		expect(rulesOf(inAccount("<filter /><!-- <filter /> --><all-attributes />"))).toEqual([]);
	});

	it("required-attribute: entity name, link-entity name, condition operator, order attribute or alias", () => {
		const diagnostics = check('<fetch><entity><link-entity from="a" to="b" /><order /><filter><condition attribute="name" /></filter></entity></fetch>');
		expect(diagnostics.map((entry) => [entry.rule, entry.message])).toEqual([
			["required-attribute", "entity is missing its required name attribute."],
			["required-attribute", "link-entity is missing its required name attribute."],
			["required-attribute", "order needs an attribute or an alias."],
			["required-attribute", "condition is missing its required operator attribute."],
		]);
		expect(
			rulesOf(
				inAccount(
					'<link-entity name="contact" from="contactid" to="primarycontactid" /><order attribute="name" /><filter><condition attribute="name" operator="null" /></filter>'
				)
			)
		).toEqual([]);
	});

	it("enumeration: values outside an enumeration, booleans and operators", () => {
		const diagnostics = check(
			[
				'<fetch distinct="yes" options="ForceOrder,Bogus"><entity name="account">',
				'<link-entity name="contact" from="contactid" to="primarycontactid" link-type="left" />',
				'<filter type="xor"><condition attribute="name" operator="equals" value="x" /></filter>',
				"</entity></fetch>",
			].join("")
		);
		expect(diagnostics.map((entry) => [entry.rule, entry.attribute, entry.message])).toEqual([
			["enumeration", "distinct", 'distinct on fetch must be true or false, not "yes".'],
			[
				"enumeration",
				"options",
				'options "Bogus" on fetch is not one of ForceOrder, DisableRowGoal, EnableOptimizerHotfixes, LoopJoin, MergeJoin, HashJoin, NO_PERFORMANCE_SPOOL, ENABLE_HIST_AMENDMENT_FOR_ASC_KEYS.',
			],
			[
				"enumeration",
				"link-type",
				'link-type "left" on link-entity is not one of inner, outer, any, not any, all, not all, exists, in, matchfirstrowusingcrossapply.',
			],
			["enumeration", "type", 'type "xor" on filter is not one of and, or.'],
			["enumeration", "operator", '"equals" is not a Fetch XML operator.'],
		]);
		expect(
			rulesOf(
				'<fetch distinct="1" options="ForceOrder, LoopJoin"><entity name="account"><link-entity name="contact" from="contactid" to="primarycontactid" link-type="not any" /></entity></fetch>'
			)
		).toEqual([]);
	});

	it("number: a non-numeric value where a whole number is required", () => {
		expect(check(inAccount("", ' top="abc"')).map((entry) => [entry.rule, entry.message])).toEqual([
			["number", 'top on fetch must be a whole number, not "abc".'],
		]);
		expect(rulesOf(inAccount("", ' count="1.5"'))).toEqual(["number"]);
		expect(rulesOf(inAccount("", ' count="25" page="2"'))).toEqual([]);
	});

	it("number-range: top above 5,000, aggregatelimit above 50,000, page below 1", () => {
		expect(check(inAccount("", ' top="5001"'))[0]?.message).toBe("top on fetch must be at most 5,000.");
		expect(check(inAccount('<attribute name="name" groupby="true" alias="n" />', ' aggregate="true" aggregatelimit="50001"'))[0]?.message).toBe(
			"aggregatelimit on fetch must be at most 50,000."
		);
		expect(check(inAccount("", ' page="0"'))[0]?.message).toBe("page on fetch must be at least 1.");
		expect(rulesOf(inAccount("", ' top="5000"'))).toEqual([]);
	});

	it("unknown-element: an information note, with nothing beneath it validated", () => {
		const diagnostics = check(inAccount('<thing><condition operator="nonsense" /></thing>'));
		expect(diagnostics.map((entry) => [entry.rule, entry.severity, entry.message])).toEqual([
			["unknown-element", "info", "The element thing is not recognised and is left as written."],
		]);
		expect(rulesOf(inAccount("<all-attributes />"))).toEqual([]);
	});

	it("unknown-attribute: an information note, while documented: false attributes are silent", () => {
		const diagnostics = check('<fetch version="1.0"><entity name="account" bogus="1" /></fetch>');
		expect(diagnostics.map((entry) => [entry.rule, entry.severity, entry.attribute, entry.message])).toEqual([
			["unknown-attribute", "info", "bogus", "The attribute bogus on entity is not recognised and is left as written."],
		]);
		expect(rulesOf('<fetch version="1.0" mapping="logical"><entity name="account" /></fetch>')).toEqual([]);
	});
});

describe("validate: metadata", () => {
	it("missing-table: one error on the element, and no Column errors beneath it", () => {
		const diagnostics = check(
			'<fetch><entity name="account"><link-entity name="nosuch" from="x" to="accountid"><attribute name="y" /><link-entity name="contact" from="contactid" to="z" /></link-entity></entity></fetch>'
		);
		expect(diagnostics.map((entry) => [entry.rule, entry.attribute, entry.message])).toEqual([
			["missing-table", "name", "There is no Table named nosuch on this Connection."],
		]);
		expect(rulesOf('<fetch><entity name="contact" /></fetch>')).toEqual([]);
	});

	it("a pending Table produces no Column diagnostics", () => {
		expect(rulesOf('<fetch><entity name="lead"><attribute name="anything" /></entity></fetch>')).toEqual([]);
	});

	it("missing-column: attribute, order, condition, from, to, valueof and entityname-resolved Columns", () => {
		const diagnostics = check(
			[
				'<fetch><entity name="account">',
				'<attribute name="nme" />',
				'<order attribute="nam" />',
				'<filter><condition attribute="fullnme" entityname="pc" operator="null" /><condition attribute="name" operator="eq" valueof="pc.fulname" /></filter>',
				'<link-entity name="contact" from="contactidd" to="primarycontact" alias="pc" />',
				"</entity></fetch>",
			].join("")
		);
		expect(diagnostics.map((entry) => [entry.rule, entry.attribute, entry.message])).toEqual([
			["missing-column", "name", "Table account has no Column named nme."],
			["missing-column", "attribute", "Table account has no Column named nam."],
			["missing-column", "attribute", "Table contact has no Column named fullnme."],
			["missing-column", "valueof", "Table contact has no Column named fulname."],
			["missing-column", "from", "Table contact has no Column named contactidd."],
			["missing-column", "to", "Table account has no Column named primarycontact."],
		]);
		expect(rulesOf(inAccount('<attribute name="Name" /><link-entity name="contact" from="contactid" to="primarycontactid" />'))).toEqual([]);
	});
});

describe("validate: operators", () => {
	it("deprecated-operator: neq is a warning", () => {
		const diagnostics = check(condition('attribute="name" operator="neq" value="x"'));
		expect(diagnostics.map((entry) => [entry.rule, entry.severity, entry.message])).toEqual([
			["deprecated-operator", "warning", "Operator neq is deprecated; use ne."],
		]);
		expect(rulesOf(condition('attribute="name" operator="ne" value="x"'))).toEqual([]);
	});

	it("operator-column-type: the operator must apply to the Column's type, and hour operators need a time", () => {
		expect(check(condition('attribute="industrycode" operator="like" value="%1%"')).map((entry) => [entry.rule, entry.message])).toEqual([
			["operator-column-type", "Operator like does not apply to Column industrycode, which is a Choice Column."],
		]);
		const dateOnly = check(
			inAccount(
				'<link-entity name="contact" from="contactid" to="primarycontactid"><filter><condition attribute="birthdate" operator="last-x-hours" value="3" /></filter></link-entity>'
			)
		);
		expect(dateOnly.map((entry) => entry.message)).toEqual(["Operator last-x-hours needs a time, but Column birthdate holds only a date."]);
		expect(rulesOf(condition('attribute="createdon" operator="last-x-hours" value="3"'))).toEqual([]);
		expect(rulesOf(condition('attribute="address1_composite" operator="last-x-hours" value="x"'))).toEqual(["value-type"]);
	});

	it("value-count: none, one, two, a list, and valueof with a value", () => {
		expect(check(condition('attribute="name" operator="eq"')).map((entry) => entry.message)).toEqual([
			"Operator eq takes one value, but the condition has 0.",
		]);
		expect(check(condition('attribute="createdon" operator="between"', "<value>2024-01-01</value>")).map((entry) => entry.message)).toEqual([
			"Operator between takes two values, but the condition has 1.",
		]);
		expect(check(condition('attribute="name" operator="null" value="x"')).map((entry) => entry.message)).toEqual([
			"Operator null takes no value, but the condition has 1.",
		]);
		expect(check(condition('attribute="industrycode" operator="in"')).map((entry) => entry.message)).toEqual([
			"Operator in takes a list of one or more values, but the condition has none.",
		]);
		expect(check(condition('attribute="name" operator="eq" valueof="description" value="x"')).map((entry) => entry.message)).toEqual([
			"The condition compares with valueof, so it takes no value, but it has 1 value.",
		]);
		expect(rulesOf(condition('attribute="name" operator="eq"', "<value>x</value>"))).toEqual([]);
		expect(rulesOf(condition('attribute="name" operator="eq" valueof="description"'))).toEqual([]);
	});

	it("value-type: text in a number, non-GUID in a lookup, non-integer for integer operators, non-date, yes/no", () => {
		const cases: readonly (readonly [string, string])[] = [
			['attribute="revenue" operator="gt" value="lots"', 'Column revenue holds numbers, so "lots" is not a valid value.'],
			['attribute="numberofemployees" operator="eq" value="1.5"', 'Column numberofemployees holds whole numbers, so "1.5" is not a valid value.'],
			['attribute="primarycontactid" operator="eq" value="pat"', 'Column primarycontactid holds GUIDs, so "pat" is not a valid value.'],
			['attribute="ownerid" operator="ne" value="12"', 'Column ownerid holds GUIDs, so "12" is not a valid value.'],
			['attribute="createdon" operator="last-x-days" value="three"', 'Operator last-x-days takes a whole number, so "three" is not a valid value.'],
			['attribute="createdon" operator="on" value="yesterday"', 'Column createdon holds dates, so "yesterday" is not a valid value.'],
			['attribute="donotemail" operator="eq" value="maybe"', 'Column donotemail holds 0 or 1, so "maybe" is not a valid value.'],
			['attribute="industrycode" operator="eq" value="one"', 'Column industrycode holds option numbers, so "one" is not a valid value.'],
		];
		for (const [attributes, message] of cases) {
			const diagnostics = check(condition(attributes));
			expect(diagnostics.map((entry) => [entry.rule, entry.attribute, entry.message])).toEqual([["value-type", "value", message]]);
		}
		const listed = check(condition('attribute="numberofemployees" operator="in"', "<value>1</value><value>x</value>"));
		expect(listed.map((entry) => [entry.rule, entry.path, entry.attribute])).toEqual([["value-type", [0, 0, 0, 1], undefined]]);
		expect(rulesOf(condition('attribute="revenue" operator="gt" value="-12.5"'))).toEqual([]);
		expect(rulesOf(condition('attribute="primarycontactid" operator="eq" value="6f5a4c52-0000-0000-0000-000000000001"'))).toEqual([]);
		expect(rulesOf(condition('attribute="createdon" operator="on-or-after" value="2024-02-29 10:00"'))).toEqual([]);
		expect(rulesOf(condition('attribute="donotemail" operator="eq" value="1"'))).toEqual([]);
		expect(rulesOf(condition('attribute="name" operator="eq" value="12"'))).toEqual([]);
	});

	it("choice-option: an option number the Choice Column does not have is a warning", () => {
		const diagnostics = check(condition('attribute="industrycode" operator="in"', "<value>1</value><value>9</value>"));
		expect(diagnostics.map((entry) => [entry.rule, entry.severity, entry.message])).toEqual([
			["choice-option", "warning", "Column industrycode has no option with the value 9."],
		]);
		expect(rulesOf(condition('attribute="industrycode" operator="eq" value="2"'))).toEqual([]);
	});
});

describe("validate: aliases", () => {
	it("duplicate-alias: a second definition of the same kind", () => {
		const diagnostics = check(
			inAccount(
				'<link-entity name="contact" from="contactid" to="primarycontactid" alias="c" /><link-entity name="systemuser" from="systemuserid" to="ownerid" alias="c" />'
			)
		);
		expect(diagnostics.map((entry) => [entry.rule, entry.path, entry.message])).toEqual([
			["duplicate-alias", [0, 1], "The alias c is already defined by another link-entity."],
		]);
		expect(
			rulesOf(inAccount('<attribute name="name" alias="c" /><link-entity name="contact" from="contactid" to="primarycontactid" alias="c" />'))
		).toEqual([]);
		expect(
			rulesOf(
				inAccount(
					'<link-entity name="contact" from="contactid" to="primarycontactid" alias="c" /><!-- <link-entity name="systemuser" from="systemuserid" to="ownerid" alias="c" /> -->'
				)
			)
		).toEqual([]);
	});

	it("invalid-alias: not a valid identifier", () => {
		expect(
			rulesOf(inAccount('<attribute name="name" alias="1st" /><link-entity name="contact" from="contactid" to="primarycontactid" alias="a-b" />'))
		).toEqual(["invalid-alias", "invalid-alias"]);
		expect(rulesOf(inAccount('<attribute name="name" alias="_first1" />'))).toEqual([]);
	});

	it("undefined-alias: entityname, valueof and order alias that nothing defines, including aliases in switched-off rows", () => {
		const diagnostics = check(
			[
				'<fetch aggregate="true"><entity name="account">',
				'<attribute name="name" groupby="true" alias="n" />',
				'<!-- <attribute name="revenue" aggregate="sum" alias="total" /> -->',
				'<order alias="total" />',
				'<filter><condition attribute="fullname" entityname="pc" operator="null" /><condition attribute="name" operator="eq" valueof="pc.fullname" /></filter>',
				'<!-- <link-entity name="contact" from="contactid" to="primarycontactid" alias="pc" /> -->',
				"</entity></fetch>",
			].join("")
		);
		expect(diagnostics.map((entry) => [entry.rule, entry.attribute, entry.message])).toEqual([
			["undefined-alias", "alias", "order alias total does not match the alias of any attribute."],
			["undefined-alias", "entityname", "entityname pc does not match the alias or name of any link-entity."],
			["undefined-alias", "valueof", "valueof pc.fullname uses pc, which is not the alias or name of any link-entity."],
		]);
		expect(check(VALID)).toEqual([]);
	});
});

describe("validate: aggregates", () => {
	it("aggregate-attribute: every attribute needs aggregate or groupby, and an alias", () => {
		const diagnostics = check(inAccount('<attribute name="name" /><attribute name="revenue" aggregate="sum" />', ' aggregate="true"'));
		expect(diagnostics.map((entry) => [entry.rule, entry.path, entry.message])).toEqual([
			["aggregate-attribute", [0, 0], "In an aggregate query, attribute name needs aggregate or groupby."],
			["aggregate-attribute", [0, 0], "In an aggregate query, attribute name needs an alias."],
			["aggregate-attribute", [0, 1], "In an aggregate query, attribute revenue needs an alias."],
		]);
		expect(rulesOf(VALID_AGGREGATE)).toEqual([]);
	});

	it("aggregate-all-attributes: not allowed in an aggregate query", () => {
		expect(rulesOf(inAccount("<all-attributes />", ' aggregate="true"'))).toEqual(["aggregate-all-attributes"]);
		expect(rulesOf(inAccount("<all-attributes />", ' aggregate="false"'))).toEqual([]);
	});

	it("aggregate-order: an order must use an alias", () => {
		const diagnostics = check(inAccount('<attribute name="name" groupby="true" alias="n" /><order attribute="name" />', ' aggregate="true"'));
		expect(diagnostics.map((entry) => [entry.rule, entry.attribute, entry.message])).toEqual([
			["aggregate-order", "attribute", "In an aggregate query, order must use an alias, not attribute."],
		]);
		expect(rulesOf(inAccount('<attribute name="name" groupby="true" alias="n" /><order alias="n" />', ' aggregate="true"'))).toEqual([]);
	});

	it("aggregate-not-set: aggregate or groupby without aggregate on fetch", () => {
		const diagnostics = check(inAccount('<attribute name="revenue" aggregate="sum" alias="t" /><attribute name="name" groupby="true" />'));
		expect(diagnostics.map((entry) => [entry.rule, entry.attribute, entry.message])).toEqual([
			["aggregate-not-set", "aggregate", 'attribute revenue uses aggregate, but fetch does not set aggregate="true".'],
			["aggregate-not-set", "groupby", 'attribute name uses groupby, but fetch does not set aggregate="true".'],
		]);
		expect(rulesOf(inAccount('<attribute name="name" groupby="false" />'))).toEqual([]);
	});
});

describe("validate: paging", () => {
	it("top-with-paging: top together with page or count", () => {
		expect(check(inAccount("", ' top="10" page="2" count="5"')).map((entry) => [entry.rule, entry.attribute, entry.message])).toEqual([
			["top-with-paging", "top", "top cannot be used together with page or count."],
		]);
		expect(rulesOf(inAccount("", ' top="10" distinct="true"'))).toEqual([]);
	});
});

describe("validate: switched-off rows, ranges and order", () => {
	it("does not validate switched-off rows", () => {
		expect(
			rulesOf(inAccount('<!-- <attribute name="nme" alias="1x" /> --><filter><!-- <condition attribute="name" operator="eq" /> --></filter>'))
		).toEqual([]);
	});

	it("underlines the attribute when there is one, else the element", () => {
		const text = inAccount('<attribute name="nme" />');
		const [onAttribute] = check(text);
		expect(onAttribute?.range && text.slice(onAttribute.range.from, onAttribute.range.to)).toContain("nme");
		const elementText = inAccount('<condition attribute="name" operator="null" />');
		const [onElement] = check(elementText);
		expect(onElement?.range && elementText.slice(onElement.range.from, onElement.range.to)).toBe('<condition attribute="name" operator="null" />');
	});

	it("leaves the range out on an edited node with none", () => {
		const edited = setAttribute(parsed(inAccount('<attribute name="name" />')), [0, 0], "name", "nme");
		if (!edited.ok) {
			throw new Error(edited.reason);
		}
		const [entry] = validate(edited.document, META);
		expect(entry?.rule).toBe("missing-column");
		expect(entry?.path).toEqual([0, 0]);
		expect(entry && "range" in entry).toBe(false);
	});

	it("reports in document order", () => {
		const diagnostics = check(
			inAccount('<attribute name="x1" /><filter><condition attribute="x2" operator="null" /></filter><link-entity name="nosuch" />')
		);
		expect(diagnostics.map((entry) => entry.path)).toEqual([
			[0, 0],
			[0, 1, 0],
			[0, 2],
		]);
	});
});
