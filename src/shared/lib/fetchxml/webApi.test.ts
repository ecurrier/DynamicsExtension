import { describe, expect, it } from "vitest";

import type { QueryColumn, QueryColumnType, QueryTable } from "@/shared/types";

import { metadataFrom, type QueryMetadata } from "./metadata";
import { OPERATORS } from "./operators";
import { parseFetchXml } from "./parse";
import { serializeFetchXml } from "./serialize";
import { type FetchXmlDocument } from "./types";
import { toWebApi, type WebApiConversion, webApiPath } from "./webApi";
import { WEB_API_OPERATORS, WEB_API_UNSUPPORTED_OPERATORS } from "./webApiOperators";

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

const table = (
	logicalName: string,
	entitySetName: string,
	primaryIdAttribute: string,
	columns: readonly QueryColumn[],
	extra: Partial<QueryTable> = {}
): QueryTable => ({
	logicalName,
	displayName: logicalName,
	entitySetName,
	primaryIdAttribute,
	primaryNameAttribute: "name",
	columns: [...columns],
	manyToOne: [],
	oneToMany: [],
	manyToMany: [],
	...extra,
});

const ACCOUNT = table(
	"account",
	"accounts",
	"accountid",
	[
		column("accountid", "uniqueIdentifier"),
		column("name", "text"),
		column("description", "memo"),
		column("revenue", "decimalOrMoney"),
		column("numberofemployees", "wholeNumber"),
		column("industrycode", "choice"),
		column("statecode", "stateOrStatus"),
		column("hobbies", "multiChoice"),
		column("donotemail", "yesNo"),
		column("createdon", "dateTime"),
		column("primarycontactid", "lookup"),
		column("parentaccountid", "lookup"),
		column("ownerid", "owner"),
		column("owneridname", "text", { attributeOf: "ownerid" }),
		column("languagecode", "wholeNumber"),
		column("mystery", null),
	],
	{
		manyToOne: [
			{
				schemaName: "account_primary_contact",
				lookupColumn: "primarycontactid",
				referencedTable: "contact",
				referencedColumn: "contactid",
				navigationProperty: "primarycontactid",
			},
			{
				schemaName: "account_parent_account",
				lookupColumn: "parentaccountid",
				referencedTable: "account",
				referencedColumn: "accountid",
				navigationProperty: "parentaccountid",
			},
		],
		oneToMany: [
			{
				schemaName: "contact_customer_accounts",
				referencedColumn: "accountid",
				referencingTable: "contact",
				referencingColumn: "parentcustomerid",
				navigationProperty: "contact_customer_accounts",
			},
			{
				schemaName: "Account_Tasks",
				referencedColumn: "accountid",
				referencingTable: "task",
				referencingColumn: "regardingobjectid",
				navigationProperty: "Account_Tasks",
			},
		],
		manyToMany: [
			{
				schemaName: "accountleads_association",
				intersectTable: "accountleads",
				first: { table: "account", intersectColumn: "accountid", navigationProperty: "accountleads_association" },
				second: { table: "lead", intersectColumn: "leadid", navigationProperty: "accountleads_association" },
			},
		],
	}
);

const CONTACT = table(
	"contact",
	"contacts",
	"contactid",
	[
		column("contactid", "uniqueIdentifier"),
		column("fullname", "text"),
		column("lastname", "text"),
		column("jobtitle", "text"),
		column("createdon", "dateTime"),
		column("parentcustomerid", "lookup"),
		column("owninguser", "lookup"),
	],
	{
		manyToOne: [
			{
				schemaName: "contact_owning_user",
				lookupColumn: "owninguser",
				referencedTable: "systemuser",
				referencedColumn: "systemuserid",
				navigationProperty: "owninguser",
			},
			{
				schemaName: "contact_customer_accounts",
				lookupColumn: "parentcustomerid",
				referencedTable: "account",
				referencedColumn: "accountid",
				navigationProperty: "parentcustomerid_account",
			},
		],
		oneToMany: [
			{
				schemaName: "Contact_Tasks",
				referencedColumn: "contactid",
				referencingTable: "task",
				referencingColumn: "regardingobjectid",
				navigationProperty: "Contact_Tasks",
			},
		],
	}
);

const SYSTEMUSER = table("systemuser", "systemusers", "systemuserid", [
	column("systemuserid", "uniqueIdentifier"),
	column("fullname", "text"),
	column("isdisabled", "yesNo"),
]);

const TASK = table("task", "tasks", "activityid", [
	column("activityid", "uniqueIdentifier"),
	column("subject", "text"),
	column("createdon", "dateTime"),
	column("statecode", "stateOrStatus"),
	column("regardingobjectid", "lookup"),
]);

const META: QueryMetadata = metadataFrom([ACCOUNT, CONTACT, SYSTEMUSER, TASK], ["nosuch"]);

const convert = (text: string, metadata: QueryMetadata = META): WebApiConversion => toWebApi(parsed(text), metadata);

const accountQuery = (body: string, fetchAttributes = ""): string => `<fetch${fetchAttributes}><entity name="account">${body}</entity></fetch>`;

const filterOf = (conditions: string): string | null => convert(accountQuery(`<attribute name="name" /><filter>${conditions}</filter>`)).options.filter;

const messages = (result: WebApiConversion): readonly string[] => result.warnings.map((warning) => warning.message);

describe("toWebApi: the request", () => {
	it("builds the path from the entity set name and query options", () => {
		const result = convert(
			accountQuery(
				'<attribute name="name" /><attribute name="revenue" /><order attribute="name" /><filter><condition attribute="revenue" operator="gt" value="100" /></filter>',
				' top="10" returntotalrecordcount="true"'
			)
		);
		expect(result.path).toBe("accounts?$select=name,revenue&$filter=revenue gt 100&$orderby=name&$top=10&$count=true");
		expect(result.entitySetName).toBe("accounts");
		expect(result.options).toEqual({
			select: "name,revenue",
			filter: "revenue gt 100",
			orderby: "name",
			top: 10,
			expand: null,
			count: true,
			apply: null,
		});
		expect(result.warnings).toEqual([]);
	});

	it("returns the bare entity set when nothing is selected or filtered", () => {
		expect(convert(accountQuery("<all-attributes />")).path).toBe("accounts");
	});

	it("percent-encodes only the characters that break a query string, and leaves the options raw", () => {
		const result = convert(
			accountQuery('<attribute name="name" /><filter><condition attribute="name" operator="eq" value="A+B &amp; C #1 50%" /></filter>')
		);
		expect(result.options.filter).toBe("name eq 'A+B & C #1 50%'");
		expect(result.path).toBe("accounts?$select=name&$filter=name eq 'A%2BB %26 C %231 50%25'");
	});

	it("exposes the path builder for callers that assemble options themselves", () => {
		expect(webApiPath("accounts", { select: "name", filter: null, orderby: null, top: 5, expand: null, count: false, apply: null })).toBe(
			"accounts?$select=name&$top=5"
		);
	});

	it("returns no path when the root Table is missing or pending", () => {
		const missing = convert('<fetch><entity name="nosuch"><attribute name="name" /></entity></fetch>');
		expect(missing.path).toBeNull();
		expect(messages(missing)).toEqual(["Table nosuch is not in this Environment. The converter cannot make a Web API URL."]);
		expect(missing.warnings[0]?.path).toEqual([0]);
		const pending = convert('<fetch><entity name="lead"><attribute name="name" /></entity></fetch>');
		expect(pending.path).toBeNull();
		expect(messages(pending)[0]).toContain("is not loaded yet");
	});

	it("returns no path, without throwing, for a document that is not a query", () => {
		expect(convert("<fetch />").path).toBeNull();
		expect(messages(convert("<fetch />"))).toEqual(["fetch has no entity. The converter cannot make a Web API URL."]);
		expect(convert("<fetch><entity /></fetch>").path).toBeNull();
		expect(convert("<savedquery />").path).toBeNull();
	});

	it("does not change the document it is given", () => {
		const document = parsed(accountQuery('<attribute name="name" /><filter type="or"><condition attribute="name" operator="like" value="%a%" /></filter>'));
		const before = serializeFetchXml(document);
		toWebApi(document, META);
		expect(serializeFetchXml(document)).toBe(before);
	});
});

describe("toWebApi: $select", () => {
	it("selects lookups by their _name_value property", () => {
		expect(convert(accountQuery('<attribute name="name" /><attribute name="primarycontactid" /><attribute name="ownerid" />')).options.select).toBe(
			"name,_primarycontactid_value,_ownerid_value"
		);
	});

	it("omits $select for all-attributes and selects the primary key when no attribute is listed", () => {
		expect(convert(accountQuery('<all-attributes /><attribute name="name" />')).options.select).toBeNull();
		expect(convert(accountQuery("")).options.select).toBe("accountid");
	});

	it("warns that an attribute alias has no Web API equivalent", () => {
		const result = convert(accountQuery('<attribute name="name" alias="accountname" />'));
		expect(result.options.select).toBe("name");
		expect(result.warnings).toEqual([
			{
				message: "attribute name has alias accountname. The Web API has no Column alias outside $apply. The URL returns it as name.",
				path: [0, 0],
				attribute: "alias",
			},
		]);
	});

	it("selects the base Column of a name Column and warns", () => {
		const result = convert(accountQuery('<attribute name="owneridname" />'));
		expect(result.options.select).toBe("_ownerid_value");
		expect(messages(result)[0]).toContain("is part of Column ownerid");
	});

	it("keeps an unknown Column as written and warns", () => {
		const result = convert(accountQuery('<attribute name="nocolumn" />'));
		expect(result.options.select).toBe("nocolumn");
		expect(messages(result)).toEqual(["Column nocolumn is not in Table account. The URL selects it as written."]);
	});

	it("skips Excluded attributes", () => {
		expect(convert(accountQuery('<attribute name="name" /><!-- <attribute name="revenue" /> -->')).options.select).toBe("name");
	});
});

describe("toWebApi: $filter grouping", () => {
	it("nests and/or three deep with parentheses", () => {
		const filter = filterOf(
			[
				'<condition attribute="name" operator="eq" value="a" />',
				'<filter type="or">',
				'<condition attribute="revenue" operator="gt" value="5" />',
				"<filter>",
				'<condition attribute="numberofemployees" operator="lt" value="10" />',
				'<filter type="or">',
				'<condition attribute="statecode" operator="eq" value="0" />',
				'<condition attribute="statecode" operator="eq" value="1" />',
				"</filter>",
				"</filter>",
				"</filter>",
			].join("")
		);
		expect(filter).toBe("name eq 'a' and (revenue gt 5 or (numberofemployees lt 10 and (statecode eq 0 or statecode eq 1)))");
	});

	it("drops parentheses around a group with one part and skips Excluded rows", () => {
		const filter = filterOf(
			[
				'<filter type="or"><condition attribute="name" operator="eq" value="a" /></filter>',
				'<!-- <condition attribute="revenue" operator="gt" value="5" /> -->',
				'<filter type="or"><condition attribute="revenue" operator="gt" value="1" /><!-- <condition attribute="revenue" operator="lt" value="0" /> --></filter>',
			].join("")
		);
		expect(filter).toBe("name eq 'a' and revenue gt 1");
	});

	it("leaves out an empty filter", () => {
		expect(filterOf("")).toBeNull();
	});
});

describe("toWebApi: operators", () => {
	it("maps the comparison family", () => {
		expect(
			filterOf(
				[
					'<condition attribute="revenue" operator="eq" value="1" />',
					'<condition attribute="revenue" operator="ne" value="2" />',
					'<condition attribute="revenue" operator="neq" value="3" />',
					'<condition attribute="revenue" operator="gt" value="4" />',
					'<condition attribute="revenue" operator="ge" value="5" />',
					'<condition attribute="revenue" operator="lt" value="6" />',
					'<condition attribute="revenue" operator="le" value="7" />',
				].join("")
			)
		).toBe("revenue eq 1 and revenue ne 2 and revenue ne 3 and revenue gt 4 and revenue ge 5 and revenue lt 6 and revenue le 7");
	});

	it("maps null and not-null", () => {
		expect(filterOf('<condition attribute="name" operator="null" /><condition attribute="primarycontactid" operator="not-null" />')).toBe(
			"name eq null and _primarycontactid_value ne null"
		);
	});

	it("maps the string functions, negating with not", () => {
		expect(
			filterOf(
				[
					'<condition attribute="name" operator="begins-with" value="a" />',
					'<condition attribute="name" operator="not-begin-with" value="b" />',
					'<condition attribute="name" operator="ends-with" value="c" />',
					'<condition attribute="name" operator="not-end-with" value="d" />',
				].join("")
			)
		).toBe("startswith(name,'a') and not startswith(name,'b') and endswith(name,'c') and not endswith(name,'d')");
	});

	it("translates like patterns that the string functions can express", () => {
		expect(
			filterOf(
				[
					'<condition attribute="name" operator="like" value="%mid%" />',
					'<condition attribute="name" operator="like" value="start%" />',
					'<condition attribute="name" operator="like" value="%end" />',
					'<condition attribute="name" operator="like" value="exact" />',
					'<condition attribute="name" operator="not-like" value="%x_y%" />',
					'<condition attribute="name" operator="like" value="%" />',
				].join("")
			)
		).toBe("contains(name,'mid') and startswith(name,'start') and endswith(name,'end') and name eq 'exact' and not contains(name,'x_y') and name ne null");
	});

	it("warns about a like pattern with a wildcard in the middle", () => {
		const result = convert(accountQuery('<attribute name="name" /><filter><condition attribute="name" operator="like" value="a%b" /></filter>'));
		expect(result.options.filter).toBeNull();
		expect(result.warnings).toEqual([
			{
				message:
					'The like pattern "a%b" has a wildcard that is not one % at the start or end. contains, startswith and endswith cannot express it. The URL leaves out this condition.',
				path: [0, 1, 0],
				attribute: "value",
			},
		]);
		expect(messages(convert(accountQuery('<filter><condition attribute="name" operator="like" value="a_b" /></filter>')))[0]).toContain("a_b");
	});

	it("maps list operators to In and NotIn with a JSON array of strings", () => {
		expect(
			filterOf(
				[
					'<condition attribute="industrycode" operator="in"><value>1</value><value>2</value></condition>',
					'<condition attribute="name" operator="not-in"><value>O\'Brian</value><value>Say "hi"</value></condition>',
					'<condition attribute="primarycontactid" operator="in"><value>{00000000-0000-0000-0000-000000000001}</value></condition>',
					'<condition attribute="hobbies" operator="contain-values"><value>3</value></condition>',
					'<condition attribute="hobbies" operator="not-contain-values"><value>4</value></condition>',
				].join("")
			)
		).toBe(
			[
				`Microsoft.Dynamics.CRM.In(PropertyName='industrycode',PropertyValues=["1","2"])`,
				`Microsoft.Dynamics.CRM.NotIn(PropertyName='name',PropertyValues=["O'Brian","Say \\"hi\\""])`,
				`Microsoft.Dynamics.CRM.In(PropertyName='primarycontactid',PropertyValues=["00000000-0000-0000-0000-000000000001"])`,
				`Microsoft.Dynamics.CRM.ContainValues(PropertyName='hobbies',PropertyValues=["3"])`,
				`Microsoft.Dynamics.CRM.DoesNotContainValues(PropertyName='hobbies',PropertyValues=["4"])`,
			].join(" and ")
		);
	});

	it("maps between and not-between, and warns when they do not have two values", () => {
		expect(
			filterOf(
				'<condition attribute="numberofemployees" operator="between"><value>5</value><value>2000</value></condition><condition attribute="createdon" operator="not-between"><value>2024-01-01</value><value>2024-12-31</value></condition>'
			)
		).toBe(
			`Microsoft.Dynamics.CRM.Between(PropertyName='numberofemployees',PropertyValues=["5","2000"]) and Microsoft.Dynamics.CRM.NotBetween(PropertyName='createdon',PropertyValues=["2024-01-01","2024-12-31"])`
		);
		const result = convert(accountQuery('<filter><condition attribute="numberofemployees" operator="between"><value>5</value></condition></filter>'));
		expect(result.options.filter).toBeNull();
		expect(messages(result)).toEqual(["Operator between needs two value elements. The URL leaves out this condition."]);
	});

	it("maps relative and fixed date operators to query functions", () => {
		expect(
			filterOf(
				[
					'<condition attribute="createdon" operator="last-x-days" value="7" />',
					'<condition attribute="createdon" operator="today" />',
					'<condition attribute="createdon" operator="olderthan-x-minutes" value="30" />',
					'<condition attribute="createdon" operator="last-seven-days" />',
					'<condition attribute="createdon" operator="on-or-after" value="2024-01-31" />',
					'<condition attribute="createdon" operator="in-fiscal-period-and-year"><value>3</value><value>2024</value></condition>',
				].join("")
			)
		).toBe(
			[
				"Microsoft.Dynamics.CRM.LastXDays(PropertyName='createdon',PropertyValue=7)",
				"Microsoft.Dynamics.CRM.Today(PropertyName='createdon')",
				"Microsoft.Dynamics.CRM.OlderThanXMinutes(PropertyName='createdon',PropertyValue=30)",
				"Microsoft.Dynamics.CRM.Last7Days(PropertyName='createdon')",
				"Microsoft.Dynamics.CRM.OnOrAfter(PropertyName='createdon',PropertyValue='2024-01-31')",
				"Microsoft.Dynamics.CRM.InFiscalPeriodAndYear(PropertyName='createdon',PropertyValue1=3,PropertyValue2=2024)",
			].join(" and ")
		);
	});

	it("warns when a relative date operator's value is not a whole number", () => {
		const result = convert(accountQuery('<filter><condition attribute="createdon" operator="last-x-days" value="soon" /></filter>'));
		expect(result.options.filter).toBeNull();
		expect(messages(result)).toEqual(['Operator last-x-days takes a whole number. "soon" is not a whole number. The URL leaves out this condition.']);
	});

	it("maps the user, business unit, language and hierarchy operators", () => {
		expect(
			filterOf(
				[
					'<condition attribute="ownerid" operator="eq-userid" />',
					'<condition attribute="ownerid" operator="eq-useroruserteams" />',
					'<condition attribute="ownerid" operator="ne-businessid" />',
					'<condition attribute="languagecode" operator="eq-userlanguage" />',
					'<condition attribute="accountid" operator="under" value="{00000000-0000-0000-0000-00000000000A}" />',
					'<condition attribute="parentaccountid" operator="eq-or-above" value="00000000-0000-0000-0000-00000000000B" />',
				].join("")
			)
		).toBe(
			[
				"Microsoft.Dynamics.CRM.EqualUserId(PropertyName='ownerid')",
				"Microsoft.Dynamics.CRM.EqualUserOrUserTeams(PropertyName='ownerid')",
				"Microsoft.Dynamics.CRM.NotEqualBusinessId(PropertyName='ownerid')",
				"Microsoft.Dynamics.CRM.EqualUserLanguage(PropertyName='languagecode')",
				"Microsoft.Dynamics.CRM.Under(PropertyName='accountid',PropertyValue='00000000-0000-0000-0000-00000000000A')",
				"Microsoft.Dynamics.CRM.AboveOrEqual(PropertyName='parentaccountid',PropertyValue='00000000-0000-0000-0000-00000000000B')",
			].join(" and ")
		);
	});

	it("warns about an operator it does not recognise", () => {
		const result = convert(accountQuery('<filter><condition attribute="name" operator="sounds-like" value="x" /></filter>'));
		expect(result.options.filter).toBeNull();
		expect(result.warnings).toEqual([
			{ message: "Operator sounds-like is not a Fetch XML operator. The URL leaves out this condition.", path: [0, 0, 0], attribute: "operator" },
		]);
	});

	it("compares two Columns of the same row with valueof, and warns about a linked Column", () => {
		expect(filterOf('<condition attribute="name" operator="ne" valueof="description" />')).toBe("name ne description");
		const result = convert(accountQuery('<filter><condition attribute="name" operator="eq" valueof="c.fullname" /></filter>'));
		expect(result.options.filter).toBeNull();
		expect(messages(result)[0]).toContain("compares only Columns of the same Record");
		expect(messages(convert(accountQuery('<filter><condition attribute="name" operator="like" valueof="description" /></filter>')))[0]).toContain(
			"The converter uses valueof only with eq"
		);
	});
});

describe("toWebApi: the operator table", () => {
	it("accounts for every non-deprecated operator in the catalogue", () => {
		const unaccounted = OPERATORS.filter((definition) => !definition.deprecated)
			.map((definition) => definition.name)
			.filter((name) => !(name in WEB_API_OPERATORS) && !(name in WEB_API_UNSUPPORTED_OPERATORS));
		expect(unaccounted).toEqual([]);
	});

	it("never both maps an operator and lists it as unsupported, and names only catalogued operators", () => {
		const names = new Set(OPERATORS.map((definition) => definition.name));
		expect(Object.keys(WEB_API_UNSUPPORTED_OPERATORS).filter((name) => name in WEB_API_OPERATORS)).toEqual([]);
		expect([...Object.keys(WEB_API_OPERATORS), ...Object.keys(WEB_API_UNSUPPORTED_OPERATORS)].filter((name) => !names.has(name))).toEqual([]);
	});

	it("converts every mapped operator on a Column it applies to without a warning", () => {
		const sample: Readonly<Record<string, string>> = {
			text: "name",
			memo: "description",
			wholeNumber: "numberofemployees",
			decimalOrMoney: "revenue",
			dateTime: "createdon",
			choice: "industrycode",
			multiChoice: "hobbies",
			yesNo: "donotemail",
			lookup: "primarycontactid",
			owner: "ownerid",
			uniqueIdentifier: "accountid",
			stateOrStatus: "statecode",
		};
		const valueFor = (columnType: string, integer: boolean): string => {
			if (integer) {
				return "3";
			}
			if (["lookup", "owner", "uniqueIdentifier"].includes(columnType)) {
				return "00000000-0000-0000-0000-000000000001";
			}
			return columnType === "dateTime" ? "2024-01-31" : columnType === "yesNo" ? "1" : ["text", "memo"].includes(columnType) ? "abc%" : "3";
		};
		const failures = OPERATORS.filter((definition) => !definition.deprecated).flatMap((definition) => {
			const columnType = definition.columnTypes[0] ?? "text";
			const value = valueFor(columnType, definition.valueKind === "integer");
			const values =
				definition.values === "none"
					? ""
					: definition.values === "one"
						? ` value="${value}"`
						: `>${(definition.values === "two" ? [value, value] : [value]).map((item) => `<value>${item}</value>`).join("")}</condition`;
			const close = definition.values === "two" || definition.values === "list" ? ">" : " />";
			const condition = `<condition attribute="${sample[columnType] ?? "name"}" operator="${definition.name}"${values}${close}`;
			const result = convert(accountQuery(`<filter>${condition}</filter>`));
			return result.options.filter === null || result.warnings.length > 0 ? [{ operator: definition.name, warnings: messages(result) }] : [];
		});
		expect(failures).toEqual([]);
	});
});

describe("toWebApi: values", () => {
	it("types values by Column", () => {
		expect(
			filterOf(
				[
					`<condition attribute="name" operator="eq" value="O'Bryan" />`,
					'<condition attribute="numberofemployees" operator="eq" value="12" />',
					'<condition attribute="revenue" operator="ge" value="1.5" />',
					'<condition attribute="donotemail" operator="eq" value="1" />',
					'<condition attribute="donotemail" operator="ne" value="false" />',
					'<condition attribute="primarycontactid" operator="eq" value="{00000000-0000-0000-0000-000000000001}" />',
					'<condition attribute="accountid" operator="ne" value="00000000-0000-0000-0000-000000000002" />',
					'<condition attribute="createdon" operator="gt" value="2024-01-31 09:30:00" />',
					'<condition attribute="createdon" operator="lt" value="2024-02-01T00:00:00+02:00" />',
					'<condition attribute="statecode" operator="eq" value="0" />',
					'<condition attribute="hobbies" operator="eq" value="1,9" />',
				].join("")
			)
		).toBe(
			[
				"name eq 'O''Bryan'",
				"numberofemployees eq 12",
				"revenue ge 1.5",
				"donotemail eq true",
				"donotemail ne false",
				"_primarycontactid_value eq 00000000-0000-0000-0000-000000000001",
				"accountid ne 00000000-0000-0000-0000-000000000002",
				"createdon gt 2024-01-31T09:30:00",
				"createdon lt 2024-02-01T00:00:00+02:00",
				"statecode eq 0",
				"hobbies eq '1,9'",
			].join(" and ")
		);
	});

	it("encodes the + of a time zone offset in the path", () => {
		const result = convert(
			accountQuery('<attribute name="name" /><filter><condition attribute="createdon" operator="lt" value="2024-02-01T00:00:00+02:00" /></filter>')
		);
		expect(result.path).toBe("accounts?$select=name&$filter=createdon lt 2024-02-01T00:00:00%2B02:00");
	});

	it("warns when a value does not fit its Column and quotes it", () => {
		const result = convert(accountQuery('<filter><condition attribute="numberofemployees" operator="eq" value="lots" /></filter>'));
		expect(result.options.filter).toBe("numberofemployees eq 'lots'");
		expect(messages(result)).toEqual(['Column numberofemployees expects a number. The value "lots" is not correct. The URL writes it as a quoted string.']);
		expect(messages(convert(accountQuery('<filter><condition attribute="primarycontactid" operator="eq" value="bob" /></filter>')))[0]).toContain(
			"expects a GUID"
		);
		expect(messages(convert(accountQuery('<filter><condition attribute="createdon" operator="eq" value="31/01/2024" /></filter>')))[0]).toContain(
			"expects an ISO date"
		);
		expect(messages(convert(accountQuery('<filter><condition attribute="donotemail" operator="eq" value="maybe" /></filter>')))[0]).toContain(
			"expects 0, 1, true or false"
		);
	});

	it("writes a best guess and warns when the Column is unknown or its Table is pending", () => {
		const unknown = convert(accountQuery('<filter><condition attribute="nocolumn" operator="eq" value="42" /></filter>'));
		expect(unknown.options.filter).toBe("nocolumn eq 42");
		expect(unknown.warnings).toEqual([
			{
				message: "The type of this value is not known, because Column nocolumn is not in Table account. The URL uses a best guess.",
				path: [0, 0, 0],
				attribute: "value",
			},
		]);
		const untyped = convert(
			accountQuery('<filter><condition attribute="mystery" operator="eq" value="{00000000-0000-0000-0000-000000000003}" /></filter>')
		);
		expect(untyped.options.filter).toBe("mystery eq 00000000-0000-0000-0000-000000000003");
		expect(messages(untyped)[0]).toContain("the converter does not know the type of Column mystery");
		const pending = convert(
			accountQuery(
				'<attribute name="name" /><link-entity name="contact" from="parentcustomerid" to="accountid" link-type="outer"><attribute name="fullname" /><filter><condition attribute="jobtitle" operator="eq" value="Boss" /></filter></link-entity>'
			),
			metadataFrom([ACCOUNT])
		);
		expect(messages(pending)).toEqual([
			"The metadata for Table contact is not loaded yet. The URL selects its attribute elements as written. A lookup Column needs the _name_value form.",
			"The type of this value is not known, because the metadata for Table contact is not loaded yet. The URL uses a best guess.",
		]);
		expect(pending.options.expand).toBe("contact_customer_accounts($select=fullname;$filter=jobtitle eq 'Boss')");
	});
});

describe("toWebApi: order, top, count and fetch attributes", () => {
	it("orders ascending and descending, with lookups as _name_value", () => {
		expect(convert(accountQuery('<order attribute="revenue" descending="true" /><order attribute="primarycontactid" />')).options.orderby).toBe(
			"revenue desc,_primarycontactid_value"
		);
	});

	it("warns that a Choice Column sorts differently unless useraworderby is set", () => {
		const result = convert(accountQuery('<order attribute="industrycode" />'));
		expect(result.options.orderby).toBe("industrycode");
		expect(messages(result)[0]).toContain("Fetch XML sorts it by label, but the Web API sorts it by number");
		expect(convert(accountQuery('<order attribute="industrycode" />', ' useraworderby="true"')).warnings).toEqual([]);
	});

	it("warns about an order on a link-entity's Column or by alias", () => {
		const result = convert(accountQuery('<order attribute="fullname" entityname="c" /><order alias="total" />'));
		expect(result.options.orderby).toBeNull();
		expect(result.warnings.map((warning) => warning.attribute)).toEqual(["entityname", "attribute"]);
	});

	it("warns once about paging attributes", () => {
		const result = convert(accountQuery('<attribute name="name" />', ' count="50" page="2" paging-cookie="x"'));
		expect(result.path).toBe("accounts?$select=name");
		expect(result.warnings).toEqual([
			{
				message:
					"count controls Fetch XML paging. The Web API uses the Prefer: odata.maxpagesize header and @odata.nextLink for pages. The URL leaves out page, count and paging-cookie.",
				path: [],
				attribute: "count",
			},
		]);
	});

	it("warns once for each fetch attribute with no Web API equivalent", () => {
		const result = convert(
			accountQuery(
				'<attribute name="name" />',
				' distinct="true" no-lock="true" latematerialize="true" datasource="retained" options="OptimizeForUnknown" aggregatelimit="100" version="1.0" mapping="logical" madeup="x"'
			)
		);
		expect(result.path).toBe("accounts?$select=name");
		expect(result.warnings.map((warning) => warning.attribute)).toEqual([
			"distinct",
			"no-lock",
			"latematerialize",
			"datasource",
			"options",
			"aggregatelimit",
			"madeup",
		]);
		expect(convert(accountQuery('<attribute name="name" />', ' distinct="false" no-lock="false"')).warnings).toEqual([]);
	});
});

describe("toWebApi: link-entity", () => {
	it("expands a many-to-one link with a nested $select", () => {
		const result = convert(
			accountQuery(
				'<attribute name="name" /><link-entity name="contact" from="contactid" to="primarycontactid" link-type="outer" alias="pc"><attribute name="fullname" /><attribute name="owninguser" /></link-entity>'
			)
		);
		expect(result.path).toBe("accounts?$select=name&$expand=primarycontactid($select=fullname,_owninguser_value)");
		expect(result.warnings).toEqual([]);
	});

	it("turns an inner many-to-one link's filter into a filter on the navigation property path", () => {
		const result = convert(
			accountQuery(
				'<attribute name="name" /><link-entity name="contact" from="contactid" to="primarycontactid"><attribute name="fullname" /><filter type="or"><condition attribute="lastname" operator="eq" value="Smith" /><condition attribute="jobtitle" operator="null" /></filter></link-entity>'
			)
		);
		expect(result.options.expand).toBe("primarycontactid($select=fullname)");
		expect(result.options.filter).toBe("_primarycontactid_value ne null and (primarycontactid/lastname eq 'Smith' or primarycontactid/jobtitle eq null)");
		expect(result.warnings).toEqual([]);
	});

	it("restricts the root to Records with the lookup set for an inner many-to-one link without a filter", () => {
		const result = convert(accountQuery('<attribute name="name" /><link-entity name="contact" from="contactid" to="primarycontactid" />'));
		expect(result.path).toBe("accounts?$select=name&$filter=_primarycontactid_value ne null");
	});

	it("follows nested many-to-one links down the path", () => {
		const result = convert(
			accountQuery(
				'<link-entity name="contact" from="contactid" to="primarycontactid"><link-entity name="systemuser" from="systemuserid" to="owninguser" link-type="outer"><attribute name="fullname" /></link-entity><link-entity name="systemuser" from="systemuserid" to="owninguser" alias="u2"><filter><condition attribute="isdisabled" operator="eq" value="0" /></filter></link-entity></link-entity>'
			)
		);
		expect(result.options.expand).toBe("primarycontactid($select=contactid;$expand=owninguser($select=fullname))");
		expect(result.options.filter).toBe(
			"_primarycontactid_value ne null and (primarycontactid/_owninguser_value ne null and primarycontactid/owninguser/isdisabled eq false)"
		);
	});

	it("warns that an outer many-to-one link's filter cannot be expressed", () => {
		const result = convert(
			accountQuery(
				'<link-entity name="contact" from="contactid" to="primarycontactid" link-type="outer"><attribute name="fullname" /><filter><condition attribute="lastname" operator="eq" value="Smith" /></filter><order attribute="fullname" /></link-entity>'
			)
		);
		expect(result.options.filter).toBeNull();
		expect(result.options.expand).toBe("primarycontactid($select=fullname)");
		expect(messages(result)).toEqual([
			"link-entity contact is a many-to-one link-entity. The Web API cannot sort the Records by its Columns. The URL leaves out this order.",
			"link-entity contact is an outer many-to-one link-entity with a filter or an inner link-entity. The Web API cannot filter a single-valued navigation property inside $expand. The URL leaves them out.",
		]);
	});

	it("expands a one-to-many link with nested $select, $filter and $orderby", () => {
		const result = convert(
			accountQuery(
				'<attribute name="name" /><link-entity name="task" from="regardingobjectid" to="accountid" link-type="outer"><attribute name="subject" /><filter><condition attribute="subject" operator="like" value="%Task%" /></filter><order attribute="createdon" descending="true" /></link-entity>'
			)
		);
		expect(result.path).toBe("accounts?$select=name&$expand=Account_Tasks($select=subject;$filter=contains(subject,'Task');$orderby=createdon desc)");
		expect(result.warnings).toEqual([]);
	});

	it("turns an inner one-to-many link into an any() lambda as well as an $expand", () => {
		const result = convert(
			accountQuery(
				'<attribute name="name" /><link-entity name="contact" from="parentcustomerid" to="accountid"><attribute name="fullname" /><filter><condition attribute="jobtitle" operator="eq" value="CEO" /><condition attribute="lastname" operator="ne" value="X" /></filter></link-entity>'
			)
		);
		expect(result.options.filter).toBe("contact_customer_accounts/any(c:c/jobtitle eq 'CEO' and c/lastname ne 'X')");
		expect(result.options.expand).toBe("contact_customer_accounts($select=fullname;$filter=jobtitle eq 'CEO' and lastname ne 'X')");
		expect(convert(accountQuery('<link-entity name="contact" from="parentcustomerid" to="accountid" />')).options.filter).toBe(
			"contact_customer_accounts/any()"
		);
	});

	it("nests lambdas with distinct variables", () => {
		const result = convert(
			accountQuery(
				'<link-entity name="contact" from="parentcustomerid" to="accountid"><link-entity name="task" from="regardingobjectid" to="contactid"><filter><condition attribute="subject" operator="eq" value="Call" /></filter></link-entity></link-entity><link-entity name="contact" from="parentcustomerid" to="accountid" alias="c2"><filter><condition attribute="owninguser" operator="not-null" /></filter><link-entity name="contact" from="contactid" to="contactid" /></link-entity>'
			)
		);
		expect(result.options.filter).toContain("contact_customer_accounts/any(c:c/Contact_Tasks/any(t:t/subject eq 'Call'))");
		expect(result.options.filter).toContain("contact_customer_accounts/any(c:c/_owninguser_value ne null)");
	});

	it("maps link-type any, not any, all and not all inside a filter to lambdas", () => {
		const linked = (type: string): string =>
			`<link-entity name="task" from="regardingobjectid" to="accountid" link-type="${type}"><filter><condition attribute="statecode" operator="eq" value="0" /></filter></link-entity>`;
		const result = convert(
			accountQuery(
				`<attribute name="name" /><filter type="or">${linked("any")}${linked("not any")}${linked("all")}${linked("not all")}<link-entity name="contact" from="contactid" to="primarycontactid" link-type="any"><filter><condition attribute="lastname" operator="eq" value="Smith" /></filter></link-entity></filter>`
			)
		);
		expect(result.options.filter).toBe(
			[
				"Account_Tasks/any(t:t/statecode eq 0)",
				"not Account_Tasks/any(t:t/statecode eq 0)",
				"(Account_Tasks/any() and not Account_Tasks/any(t:t/statecode eq 0))",
				"Account_Tasks/any(t:t/statecode eq 0)",
				"(_primarycontactid_value ne null and primarycontactid/lastname eq 'Smith')",
			].join(" or ")
		);
		expect(result.options.expand).toBeNull();
		expect(result.warnings).toEqual([]);
	});

	it("tests a many-to-one link's Column from the entity's filter through entityname", () => {
		const result = convert(
			accountQuery(
				'<filter><condition attribute="contactid" entityname="pc" operator="null" /></filter><link-entity name="contact" from="contactid" to="primarycontactid" link-type="outer" alias="pc" />'
			)
		);
		expect(result.options.filter).toBe("primarycontactid/contactid eq null");
		const oneToMany = convert(
			accountQuery(
				'<filter><condition attribute="contactid" entityname="kids" operator="null" /></filter><link-entity name="contact" from="parentcustomerid" to="accountid" link-type="outer" alias="kids" />'
			)
		);
		expect(oneToMany.options.filter).toBeNull();
		expect(messages(oneToMany)[0]).toContain("refers to a one-to-many link-entity");
		expect(messages(convert(accountQuery('<filter><condition attribute="x" entityname="nobody" operator="null" /></filter>')))[0]).toBe(
			"entityname nobody does not refer to a link-entity. The URL leaves out this condition."
		);
	});

	it("warns about a query function on a linked Column inside a lambda or path", () => {
		const result = convert(
			accountQuery(
				'<link-entity name="contact" from="parentcustomerid" to="accountid"><filter><condition attribute="createdon" operator="last-x-days" value="3" /></filter></link-entity>'
			)
		);
		expect(result.options.filter).toBe("contact_customer_accounts/any()");
		expect(result.options.expand).toBeNull();
		expect(messages(result)).toEqual([
			"Operator last-x-days becomes the query function Microsoft.Dynamics.CRM.LastXDays. The Web API documentation shows this function only on a Column of the filtered Table. The URL leaves out this condition.",
		]);
	});

	it("warns about a one-to-many link reached through a lookup path", () => {
		const result = convert(
			accountQuery(
				'<link-entity name="contact" from="contactid" to="primarycontactid"><link-entity name="task" from="regardingobjectid" to="contactid"><filter><condition attribute="subject" operator="eq" value="x" /></filter></link-entity></link-entity>'
			)
		);
		expect(result.options.filter).toBe("_primarycontactid_value ne null");
		expect(messages(result)[0]).toContain("cannot filter on a collection through a lookup");
	});

	it("drops $orderby inside $expand when the query has a nested $expand", () => {
		const result = convert(
			accountQuery(
				'<link-entity name="contact" from="parentcustomerid" to="accountid" link-type="outer"><attribute name="fullname" /><order attribute="fullname" /><link-entity name="systemuser" from="systemuserid" to="owninguser" link-type="outer"><attribute name="fullname" /></link-entity></link-entity>'
			)
		);
		expect(result.options.expand).toBe("contact_customer_accounts($select=fullname;$expand=owninguser($select=fullname))");
		expect(result.warnings).toEqual([
			{
				message:
					"If a Query has a nested $expand, the Web API does not allow $orderby inside $expand. The URL leaves out the order elements of link-entity contact.",
				path: [0, 0],
			},
		]);
	});

	it("warns about and leaves out many-to-many, custom and unmatched joins", () => {
		const manyToMany = convert(
			accountQuery(
				'<attribute name="name" /><link-entity name="accountleads" from="accountid" to="accountid" intersect="true"><link-entity name="lead" from="leadid" to="leadid"><attribute name="fullname" /></link-entity></link-entity>'
			)
		);
		expect(manyToMany.path).toBe("accounts?$select=name");
		expect(messages(manyToMany)).toEqual([
			"link-entity accountleads joins accountleads, the intersect Table of a many-to-many relationship. The converter cannot make many-to-many joins. The URL leaves out link-entity accountleads and the link-entity elements in it.",
		]);
		const custom = convert(
			accountQuery(
				'<attribute name="name" /><link-entity name="contact" from="lastname" to="name" alias="namesake"><attribute name="fullname" /></link-entity>'
			)
		);
		expect(custom.path).toBe("accounts?$select=name");
		expect(custom.warnings).toEqual([
			{
				message:
					"link-entity namesake (from lastname to name) matches no relationship of Table account. The Web API cannot make a custom join. The URL leaves it out.",
				path: [0, 1],
			},
		]);
		expect(messages(convert(accountQuery('<link-entity name="contact" to="primarycontactid"><attribute name="fullname" /></link-entity>')))[0]).toContain(
			"does not have both from and to"
		);
	});

	it("warns when the parent Table's relationships have not loaded", () => {
		const result = convert(
			accountQuery(
				'<link-entity name="contact" from="contactid" to="primarycontactid" link-type="outer"><link-entity name="systemuser" from="systemuserid" to="owninguser" link-type="outer"><attribute name="fullname" /></link-entity></link-entity>'
			),
			metadataFrom([ACCOUNT])
		);
		expect(result.options.expand).toBeNull();
		expect(messages(result)).toEqual(["The relationships of Table contact are not loaded yet. The URL leaves out link-entity systemuser."]);
	});

	it("warns about link-types with no equivalent", () => {
		const outerInFilter = convert(accountQuery('<filter><link-entity name="task" from="regardingobjectid" to="accountid" link-type="outer" /></filter>'));
		expect(messages(outerInFilter)[0]).toContain("has link-type outer inside a filter");
		const unknown = convert(
			accountQuery('<link-entity name="task" from="regardingobjectid" to="accountid" link-type="sideways"><attribute name="subject" /></link-entity>')
		);
		expect(unknown.options.expand).toBeNull();
		expect(unknown.warnings).toEqual([
			{
				message: "The Web API has no equivalent for link-type sideways on link-entity task. The URL leaves it out.",
				path: [0, 0],
				attribute: "link-type",
			},
		]);
		const crossApply = convert(
			accountQuery(
				'<link-entity name="task" from="regardingobjectid" to="accountid" link-type="matchfirstrowusingcrossapply"><attribute name="subject" /></link-entity>'
			)
		);
		expect(crossApply.options.filter).toBe("Account_Tasks/any()");
		expect(crossApply.options.expand).toBe("Account_Tasks($select=subject)");
		expect(messages(crossApply)[0]).toContain("returns all matching Records, not only the first");
	});

	it("warns when a query needs more than fifteen $expand options", () => {
		const links = Array.from(
			{ length: 16 },
			(_, index) =>
				`<link-entity name="contact" from="contactid" to="primarycontactid" link-type="outer" alias="c${index}"><attribute name="fullname" /></link-entity>`
		).join("");
		expect(messages(convert(accountQuery(links)))).toEqual(["The Query needs 16 $expand options. The Web API allows no more than 15."]);
	});
});

describe("toWebApi: aggregates", () => {
	it("groups and aggregates with $apply", () => {
		const result = convert(
			accountQuery(
				'<attribute name="statecode" groupby="true" alias="state" /><attribute name="revenue" aggregate="sum" alias="total" /><attribute name="accountid" aggregate="count" alias="rows" /><attribute name="revenue" aggregate="avg" alias="mean" />',
				' aggregate="true"'
			)
		);
		expect(result.options.apply).toBe("groupby((statecode),aggregate(revenue with sum as total,$count as rows,revenue with average as mean))");
		expect(result.path).toBe("accounts?$apply=groupby((statecode),aggregate(revenue with sum as total,$count as rows,revenue with average as mean))");
		expect(result.warnings).toEqual([]);
	});

	it("expresses a simple aggregate and a filter transformation", () => {
		expect(convert(accountQuery('<attribute name="createdon" aggregate="max" alias="lastCreate" />', ' aggregate="true"')).options.apply).toBe(
			"aggregate(createdon with max as lastCreate)"
		);
		expect(
			convert(
				accountQuery(
					'<attribute name="primarycontactid" groupby="true" alias="pc" /><filter><condition attribute="name" operator="begins-with" value="A" /><condition attribute="revenue" operator="gt" value="0" /></filter>',
					' aggregate="true"'
				)
			).options.apply
		).toBe("filter(startswith(name,'A') and revenue gt 0)/groupby((_primarycontactid_value))");
	});

	it("groups by a many-to-one link's Column through its navigation property", () => {
		const result = convert(
			accountQuery(
				'<attribute name="revenue" aggregate="sum" alias="total" /><link-entity name="contact" from="contactid" to="primarycontactid" link-type="outer"><attribute name="fullname" groupby="true" alias="contactname" /></link-entity>',
				' aggregate="true"'
			)
		);
		expect(result.options.apply).toBe("groupby((primarycontactid/fullname),aggregate(revenue with sum as total))");
	});

	it("warns that order and top are left out of an aggregate", () => {
		const result = convert(
			accountQuery(
				'<attribute name="statecode" groupby="true" alias="s" /><attribute name="accountid" aggregate="count" alias="n" /><order alias="n" />',
				' aggregate="true" top="5"'
			)
		);
		expect(result.options.apply).toBe("groupby((statecode),aggregate($count as n))");
		expect(result.options.top).toBeNull();
		expect(result.warnings.map((warning) => warning.attribute ?? warning.path.join("/"))).toEqual(["top", "0/2"]);
	});

	it("returns no path for aggregates the documentation does not cover", () => {
		const cases = [
			'<attribute name="name" aggregate="countcolumn" alias="n" />',
			'<attribute name="name" aggregate="countcolumn" distinct="true" alias="n" />',
			'<attribute name="createdon" groupby="true" dategrouping="month" alias="m" /><attribute name="accountid" aggregate="count" alias="n" />',
			'<attribute name="createdon" groupby="true" alias="m" />',
			'<attribute name="accountid" aggregate="count" alias="n" /><link-entity name="task" from="regardingobjectid" to="accountid"><attribute name="subject" groupby="true" alias="s" /></link-entity>',
			'<attribute name="accountid" aggregate="count" alias="n" /><filter><condition attribute="lastname" entityname="pc" operator="null" /></filter>',
		];
		cases.forEach((body) => {
			const result = convert(accountQuery(body, ' aggregate="true"'));
			expect(result.path).toBeNull();
			expect(messages(result).some((message) => message.startsWith("The Web API has no equivalent for this aggregate Query:"))).toBe(true);
		});
	});
});
