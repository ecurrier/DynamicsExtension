import { describe, expect, it } from "vitest";

import { metadataFrom, OPERATORS, type QueryMetadata } from "@/shared/lib/fetchxml";
import type { QueryChoiceOption, QueryColumn, QueryColumnType, QueryTable, QueryTableSummary } from "@/shared/types";

import { completionContextAt } from "./completionContext";
import { type CompletionOptions, type CompletionResult, completionsFor } from "./completions";

type ColumnOptions = { readonly attributeOf?: string; readonly isValidForRead?: boolean; readonly dateOnly?: boolean; readonly options?: QueryChoiceOption[] };

const column = (logicalName: string, displayName: string, columnType: QueryColumnType | null, extra: ColumnOptions = {}): QueryColumn => ({
	logicalName,
	displayName,
	attributeType: "String",
	attributeTypeName: "StringType",
	columnType,
	attributeOf: extra.attributeOf ?? null,
	isPrimaryId: false,
	isPrimaryName: false,
	isValidForRead: extra.isValidForRead ?? true,
	dateOnly: extra.dateOnly ?? false,
	options: extra.options ?? [],
	targets: [],
});

const table = (logicalName: string, displayName: string, columns: QueryColumn[]): QueryTable => ({
	logicalName,
	displayName,
	entitySetName: `${logicalName}s`,
	primaryIdAttribute: `${logicalName}id`,
	primaryNameAttribute: "name",
	columns,
	manyToOne: [],
	oneToMany: [],
	manyToMany: [],
});

const ACCOUNT = table("account", "Account", [
	column("name", "Account Name", "text"),
	column("accountid", "Account", "uniqueIdentifier"),
	column("statecode", "Status", "stateOrStatus", {
		options: [
			{ value: 0, label: "Active" },
			{ value: 1, label: "Inactive" },
		],
	}),
	column("createdon", "Created On", "dateTime"),
	column("openedon", "Opened On", "dateTime", { dateOnly: true }),
	column("donotemail", "Do not allow Emails", "yesNo"),
	column("owneridname", "Owner Name", "text", { attributeOf: "ownerid" }),
	column("secret", "Secret", "text", { isValidForRead: false }),
]);

const CONTACT = table("contact", "Contact", [column("lastname", "Last Name", "text"), column("parentcustomerid", "Company Name", "lookup")]);

const TABLES: QueryTableSummary[] = [
	{
		logicalName: "contact",
		displayName: "Contact",
		entitySetName: "contacts",
		primaryIdAttribute: "contactid",
		primaryNameAttribute: "fullname",
		isIntersect: false,
	},
	{
		logicalName: "account",
		displayName: "Account",
		entitySetName: "accounts",
		primaryIdAttribute: "accountid",
		primaryNameAttribute: "name",
		isIntersect: false,
	},
];

const LOGICAL: CompletionOptions = { names: "logical", tables: TABLES };

const ALL_LOADED = metadataFrom([ACCOUNT, CONTACT]);

const complete = (marked: string, metadata: QueryMetadata = ALL_LOADED, options: CompletionOptions = LOGICAL): CompletionResult => {
	const offset = marked.indexOf("|");
	return completionsFor(completionContextAt(marked.slice(0, offset) + marked.slice(offset + 1), offset), metadata, options);
};

const values = (result: CompletionResult): string[] => result.items.map((item) => item.value);

const ENTITY = '<fetch><entity name="account">';

const JOINED = `${ENTITY}<link-entity name="contact" from="parentcustomerid" to="accountid" alias="c"><filter>{contact}</filter></link-entity><filter>{account}</filter><attribute name="name" alias="accountname"/></entity></fetch>`;

const inContact = (content: string): string => JOINED.replace("{contact}", content).replace("{account}", "");

const inAccount = (content: string): string => JOINED.replace("{account}", content).replace("{contact}", "");

describe("element names", () => {
	it("offers fetch at the root and entity under fetch", () => {
		expect(values(complete("<|"))).toEqual(["fetch"]);
		expect(values(complete("<fetch><|</fetch>"))).toEqual(["entity"]);
	});

	it("offers the catalogue's children of entity", () => {
		expect(values(complete(`${ENTITY}<|`))).toEqual(["all-attributes", "attribute", "order", "filter", "link-entity"]);
	});

	it("leaves out children that have reached their limit", () => {
		expect(values(complete(`${ENTITY}<all-attributes/><filter></filter><|`))).toEqual(["attribute", "order", "link-entity"]);
		expect(values(complete(`<fetch><entity name="account"></entity><|</fetch>`))).toEqual([]);
		const full = Array.from({ length: 500 }, () => '<condition attribute="name" operator="null"/>').join("");
		expect(values(complete(`${ENTITY}<filter>${full}<|`))).toEqual(["filter", "link-entity"]);
		expect(values(complete(`${ENTITY}<filter>${full.slice(0, -45)}<|`))).toEqual(["condition", "filter", "link-entity"]);
	});

	it("inserts required attributes with the cursor in the first, self-closing childless elements", () => {
		const items = complete(`${ENTITY}<link-entity name="contact"><filter><|`).items;
		expect(items.find((item) => item.value === "filter")?.apply).toEqual({ insert: "filter></filter>", cursorOffset: 7 });
		expect(items.find((item) => item.value === "link-entity")?.apply).toEqual({ insert: 'link-entity name=""></link-entity>', cursorOffset: 18 });
		const entityItems = complete(`${ENTITY}<|`).items;
		expect(entityItems.find((item) => item.value === "all-attributes")?.apply).toEqual({ insert: "all-attributes/>", cursorOffset: 16 });
		expect(entityItems.find((item) => item.value === "attribute")?.apply).toEqual({ insert: 'attribute name=""/>', cursorOffset: 16 });
		expect(complete(`${ENTITY}<filter><condition attribute="x" operator="in"><|`).items).toEqual([
			expect.objectContaining({ value: "value", apply: { insert: "value></value>", cursorOffset: 6 } }),
		]);
	});

	it("inserts a condition with empty attribute and operator, the cursor in attribute", () => {
		const items = complete(`${ENTITY}<filter><|`).items;
		const apply = items.find((item) => item.value === "condition")?.apply;
		expect(apply).toEqual({ insert: 'condition attribute="" operator=""/>', cursorOffset: 21 });
		expect(apply?.insert.slice(0, apply.cursorOffset)).toBe('condition attribute="');
	});

	it("inserts only the name when the tag already has more after it", () => {
		const items = complete(`${ENTITY}<attr| name="x"/></entity></fetch>`).items;
		expect(items.find((item) => item.value === "attribute")).toEqual(expect.objectContaining({ label: "attribute", kind: "element" }));
		expect(items.find((item) => item.value === "attribute")?.apply).toBeUndefined();
	});

	it("ranks names starting with what was typed first and describes each element", () => {
		const result = complete(`${ENTITY}<li|`);
		expect(result.items[0]).toMatchObject({ value: "link-entity", rank: 0, description: "Joins a related Table." });
		expect(result.typed).toBe("li");
	});
});

describe("closing tags", () => {
	it("offers the open elements, innermost first, adding > when it is missing", () => {
		const result = complete(`${ENTITY}<filter></|`);
		expect(result.items.map((item) => [item.value, item.apply?.insert])).toEqual([
			["filter", "filter>"],
			["entity", "entity>"],
			["fetch", "fetch>"],
		]);
		expect(result.items[0]?.rank).toBeLessThan(result.items[1]?.rank ?? 0);
		expect(complete(`${ENTITY}</|entity></fetch>`).items[0]?.apply).toBeUndefined();
	});
});

describe("attribute names", () => {
	it("offers the attributes not yet present, common ones first, with descriptions", () => {
		const result = complete(`${ENTITY}<link-entity name="contact" |`);
		expect(values(result)).toEqual(["from", "to", "alias", "link-type", "intersect", "visible"]);
		expect(result.items[0]).toMatchObject({ kind: "attribute", apply: { insert: 'from=""', cursorOffset: 6 } });
		expect(result.items[0]?.description).toBeUndefined();
		expect(result.items.find((item) => item.value === "intersect")?.description).toBe(
			"Marks a join that returns no Columns, such as a many-to-many intersect Table."
		);
	});

	it("marks required attributes", () => {
		expect(complete(`${ENTITY}<filter><condition |`).items.find((item) => item.value === "operator")).toMatchObject({ detail: "required", rank: 2 });
	});

	it("ranks a typed prefix ahead of common attributes", () => {
		expect(values(complete(`<fetch |`)).slice(0, 3)).toEqual(["top", "distinct", "aggregate"]);
		expect(values(complete(`<fetch ag|`)).slice(0, 2)).toEqual(["aggregate", "aggregatelimit"]);
	});

	it("inserts only the name when the attribute already has a value", () => {
		expect(complete(`${ENTITY}<order desc|="true"/>`).items.find((item) => item.value === "descending")?.apply).toBeUndefined();
	});
});

describe("attribute values", () => {
	it("offers enumerations with their descriptions", () => {
		const result = complete(`${ENTITY}<link-entity link-type="|"/>`);
		expect(values(result)).toEqual(["inner", "outer", "any", "not any", "all", "not all", "exists", "in", "matchfirstrowusingcrossapply"]);
		expect(result.items[0]).toMatchObject({ kind: "value", detail: "Returns only Records with a match in both Tables. This is the default." });
	});

	it("offers booleans", () => {
		expect(values(complete(`${ENTITY}<order descending="|"/>`))).toEqual(["true", "false"]);
	});

	it("completes one item of a comma-separated enumeration", () => {
		const marked = `<fetch options="ForceOrder,Loo|p,HashJoin">`;
		const result = complete(marked);
		expect(result.typed).toBe("Loo");
		expect(marked.replace("|", "").slice(result.from, result.to)).toBe("Loop");
		expect(result.items[0]?.value).toBe("LoopJoin");
	});

	it("wraps the value in quotes when none was typed", () => {
		expect(complete(`${ENTITY}<order descending=|`).items[0]).toMatchObject({ value: "true", apply: { insert: '"true"', cursorOffset: 6 } });
	});

	it("offers Table names, following the names toggle but always inserting the logical name", () => {
		expect(complete(`<fetch><entity name="|"`).items).toEqual([
			{ label: "account", value: "account", detail: "Account", kind: "table", rank: 3 },
			{ label: "contact", value: "contact", detail: "Contact", kind: "table", rank: 3 },
		]);
		const display = complete(`<fetch><entity name="co|"`, ALL_LOADED, { names: "display", tables: TABLES });
		expect(display.items[0]).toEqual({ label: "Contact", value: "contact", detail: "contact", kind: "table", rank: 1 });
		expect(values(complete(`${ENTITY}<link-entity name="|"/>`))).toEqual(["account", "contact"]);
	});

	it("offers the root Table's Columns, leaving out attributeOf and unreadable Columns", () => {
		const result = complete(inAccount('<condition attribute="|"/>'));
		expect(values(result)).toEqual(["accountid", "createdon", "donotemail", "name", "openedon", "statecode"]);
		expect(result.items.find((item) => item.value === "name")).toMatchObject({ label: "name", detail: "Account Name", kind: "column" });
	});

	it("sorts Columns by the label the names toggle shows", () => {
		const result = complete(inAccount('<condition attribute="|"/>'), ALL_LOADED, { names: "display", tables: TABLES });
		expect(result.items.map((item) => item.label)).toEqual(["Account", "Account Name", "Created On", "Do not allow Emails", "Opened On", "Status"]);
	});

	it("offers the link-entity's Columns inside its filter", () => {
		expect(values(complete(inContact('<condition attribute="|"/>')))).toEqual(["lastname", "parentcustomerid"]);
	});

	it("offers own Columns for from and the parent's for to", () => {
		expect(values(complete(`${ENTITY}<link-entity name="contact" from="|"/>`))).toEqual(["lastname", "parentcustomerid"]);
		expect(values(complete(`${ENTITY}<link-entity name="contact" to="|"/>`))).toContain("accountid");
	});

	it("offers attribute and order Columns", () => {
		expect(values(complete(`${ENTITY}<attribute name="|"/>`))).toContain("statecode");
		expect(values(complete(`${ENTITY}<order attribute="|"/>`))).toContain("statecode");
	});

	it("reports a pending Table and offers nothing for its Columns yet", () => {
		const pendingContact = metadataFrom([ACCOUNT]);
		const result = complete(inContact('<condition attribute="|"/>'), pendingContact);
		expect(result.items).toEqual([]);
		expect(result.pendingTables).toEqual(["contact"]);
		expect(complete(inContact('<condition attribute="|"/>'), metadataFrom([ACCOUNT], ["contact"])).pendingTables).toEqual([]);
	});

	it("offers link-entity names and aliases for entityname", () => {
		const result = complete(inAccount('<condition entityname="|"/>'));
		expect(result.items).toEqual([{ label: "c", value: "c", detail: "contact", kind: "alias", rank: 2 }]);
	});

	it("offers attribute aliases for an order's alias", () => {
		expect(complete(inAccount("").replace("<filter></filter>", '<order alias="|"/>')).items).toEqual([
			{ label: "accountname", value: "accountname", detail: "name", kind: "alias", rank: 2 },
		]);
	});

	it("offers own Columns and alias-prefixed Columns for valueof", () => {
		expect(values(complete(inAccount('<condition attribute="name" operator="eq" valueof="|"/>')))).toEqual([
			"accountid",
			"createdon",
			"donotemail",
			"name",
			"openedon",
			"statecode",
			"c.lastname",
			"c.parentcustomerid",
		]);
	});

	it("offers nothing for free text and numbers", () => {
		expect(complete(`${ENTITY}<attribute alias="|"/>`).items).toEqual([]);
		expect(complete(`<fetch top="|"`).items).toEqual([]);
	});
});

describe("operators", () => {
	const operatorsAfter = (attribute: string, metadata: QueryMetadata = ALL_LOADED): CompletionResult =>
		complete(inAccount(`<condition attribute="${attribute}" operator="|"/>`), metadata);

	it("offers the list operators and not like for a Choice Column", () => {
		const names = values(operatorsAfter("statecode"));
		expect(names).toEqual(expect.arrayContaining(["eq", "ne", "in", "not-in", "null", "not-null"]));
		expect(names).not.toContain("like");
	});

	it("leaves out the hour and minute operators for a date-only Column", () => {
		expect(values(operatorsAfter("createdon"))).toContain("last-x-hours");
		expect(values(operatorsAfter("openedon"))).not.toContain("last-x-hours");
		expect(values(operatorsAfter("openedon"))).toContain("last-x-days");
	});

	it("offers every non-deprecated operator when the Column cannot be resolved", () => {
		const all = OPERATORS.filter((operator) => !operator.deprecated).map((operator) => operator.name);
		expect(values(operatorsAfter("nosuchcolumn"))).toEqual(all);
		expect(values(complete(inAccount('<condition operator="|"/>')))).toEqual(all);
		expect(values(complete(inAccount('<condition operator="|"/>')))).not.toContain("neq");
	});

	it("offers every operator and reports the Table while its metadata is pending", () => {
		const result = operatorsAfter("statecode", metadataFrom([CONTACT]));
		expect(result.items).toHaveLength(OPERATORS.length - 1);
		expect(result.pendingTables).toEqual(["account"]);
	});

	it("shows the meaning as detail", () => {
		expect(operatorsAfter("name").items.find((item) => item.value === "like")).toMatchObject({
			kind: "operator",
			detail: "Matches the pattern. % matches any characters.",
		});
	});

	it("filters by the Column of the link-entity named by entityname", () => {
		expect(values(complete(inAccount('<condition entityname="c" attribute="lastname" operator="|"/>')))).toContain("like");
	});
});

describe("condition values", () => {
	it("offers Choice options, inserting the number with the label as detail", () => {
		expect(complete(inAccount('<condition attribute="statecode" operator="eq" value="|"/>')).items).toEqual([
			{ label: "0", value: "0", detail: "Active", kind: "value", rank: 2 },
			{ label: "1", value: "1", detail: "Inactive", kind: "value", rank: 2 },
		]);
	});

	it("offers yes and no for a yes/no Column without options", () => {
		expect(complete(inAccount('<condition attribute="donotemail" operator="eq" value="|"/>')).items.map((item) => [item.value, item.detail])).toEqual([
			["0", "No"],
			["1", "Yes"],
		]);
	});

	it("offers options inside a <value> body", () => {
		expect(values(complete(inAccount('<condition attribute="statecode" operator="in"><value>|</value></condition>')))).toEqual(["0", "1"]);
	});

	it("offers nothing for other Column types", () => {
		expect(complete(inAccount('<condition attribute="name" operator="eq" value="|"/>')).items).toEqual([]);
	});
});

describe("nothing to complete", () => {
	it("returns no items for a none context", () => {
		expect(complete(`${ENTITY}<!-- <condition attribute="| -->`)).toEqual({ from: 0, to: 0, typed: "", items: [], pendingTables: [] });
	});
});
