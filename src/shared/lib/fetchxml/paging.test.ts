import { describe, expect, it } from "vitest";

import { decodePagingCookie } from "@/shared/lib";
import { type QueryColumnType } from "@/shared/types";

import { COLUMN_TYPES, type ColumnType } from "./operators";
import { DEFAULT_PAGE_SIZE, pagedFetchXml } from "./paging";
import { parseFetchXml } from "./parse";
import { serializeFetchXml } from "./serialize";
import { type FetchXmlDocument } from "./types";

const parse = (text: string): FetchXmlDocument => {
	const result = parseFetchXml(text);
	if (!result.ok) {
		throw new Error(result.errors.map((error) => error.message).join("; "));
	}
	return result.document;
};

const fetchAttributes = (text: string): Record<string, string> =>
	Object.fromEntries(parse(text).root.attributes.map((attribute) => [attribute.name, attribute.value]));

const QUERY = `<fetch>
  <entity name="account">
    <attribute name="name" />
    <order attribute="name" />
    <order attribute="accountid" />
  </entity>
</fetch>`;

const COOKIE = '<cookie page="1"><name last="City Power &amp; Light" first="A. Datum" /><accountid last="{70BF4D48}" first="{49B0BE2E}" /></cookie>';

describe("pagedFetchXml", () => {
	it("asks for page 1 with the page size as count", () => {
		const result = pagedFetchXml(parse(QUERY), { page: 1, pagingCookie: null, pageSize: DEFAULT_PAGE_SIZE });
		expect(result).toMatchObject({ pageable: true, page: 1, count: 50 });
		expect(result.fetchXml).toBe(
			'<fetch page="1" count="50"><entity name="account"><attribute name="name"/><order attribute="name"/><order attribute="accountid"/></entity></fetch>'
		);
	});

	it("asks for page 2 with the previous page's cookie", () => {
		const result = pagedFetchXml(parse(QUERY), { page: 2, pagingCookie: COOKIE, pageSize: 50 });
		expect(result).toMatchObject({ pageable: true, page: 2, count: 50 });
		expect(fetchAttributes(result.fetchXml)).toEqual({ page: "2", count: "50", "paging-cookie": COOKIE });
	});

	it("XML-encodes a cookie with characters that need escaping and keeps it intact", () => {
		const cookie = `<cookie page="7"><name last="O'Brien & Sons <Ltd>" first="Tab\there" /></cookie>`;
		const result = pagedFetchXml(parse(QUERY), { page: 8, pagingCookie: cookie, pageSize: 50 });
		expect(result.fetchXml).toContain(
			'paging-cookie="&lt;cookie page=&quot;7&quot;&gt;&lt;name last=&quot;O\'Brien &amp; Sons &lt;Ltd&gt;&quot; first=&quot;Tab&#9;here&quot; /&gt;&lt;/cookie&gt;"'
		);
		expect(fetchAttributes(result.fetchXml)["paging-cookie"]).toBe(cookie);
	});

	it("uses simple paging when page 2 has no cookie and drops a stale cookie", () => {
		const stale = `<fetch paging-cookie="&lt;cookie page=&quot;4&quot; /&gt;" page="5"><entity name="account" /></fetch>`;
		const second = pagedFetchXml(parse(stale), { page: 2, pagingCookie: null, pageSize: 50 });
		expect(fetchAttributes(second.fetchXml)).toEqual({ page: "2", count: "50" });
		const first = pagedFetchXml(parse(stale), { page: 1, pagingCookie: COOKIE, pageSize: 50 });
		expect(fetchAttributes(first.fetchXml)).toEqual({ page: "1", count: "50" });
	});

	it("leaves a Query with top untouched and reports that it cannot be paged", () => {
		const text = '<fetch top="10"><entity name="account"><attribute name="name" /></entity></fetch>';
		const document = parse(text);
		const result = pagedFetchXml(document, { page: 2, pagingCookie: COOKIE, pageSize: 50 });
		expect(result).toEqual({ pageable: false, fetchXml: serializeFetchXml(document, { minify: true }), reason: "A Query with top returns a single page" });
		expect(fetchAttributes(result.fetchXml)).toEqual({ top: "10" });
	});

	it("respects a count the Query already sets", () => {
		const text = '<fetch count="25" returntotalrecordcount="true"><entity name="account" /></fetch>';
		const result = pagedFetchXml(parse(text), { page: 3, pagingCookie: COOKIE, pageSize: 50 });
		expect(result).toMatchObject({ pageable: true, page: 3, count: 25 });
		expect(fetchAttributes(result.fetchXml)).toEqual({ count: "25", returntotalrecordcount: "true", page: "3", "paging-cookie": COOKIE });
	});

	it("leaves an aggregate Query untouched and reports that it cannot be paged", () => {
		const text = '<fetch aggregate="true"><entity name="account"><attribute name="accountid" alias="total" aggregate="count" /></entity></fetch>';
		const document = parse(text);
		const result = pagedFetchXml(document, { page: 1, pagingCookie: null, pageSize: 50 });
		expect(result).toMatchObject({ pageable: false, reason: "An aggregate Query returns a single page" });
		expect(result.fetchXml).toBe(serializeFetchXml(document, { minify: true }));
	});

	it("puts a cookie decoded by runQuery on the next request as the documentation's example does", () => {
		const annotation =
			'<cookie pagenumber="2" pagingcookie="%253ccookie%2520page%253d%25221%2522%253e%253cfullname%2520last%253d%2522Susanna%2520Stubberod%2520%2528sample%2529%2522%2520first%253d%2522Yvonne%2520McKay%2520%2528sample%2529%2522%2520%252f%253e%253ccontactid%2520last%253d%2522%257b70BF4D48-34CB-ED11-B596-0022481D68CD%257d%2522%2520first%253d%2522%257b49B0BE2E-D01C-ED11-B83E-000D3A572421%257d%2522%2520%252f%253e%253c%252fcookie%253e" istracking="False" />';
		const documented = `<fetch count='3' page='2' paging-cookie='&lt;cookie page="1"&gt;&lt;fullname last="Susanna Stubberod (sample)" first="Yvonne McKay (sample)" /&gt;&lt;contactid last="{70BF4D48-34CB-ED11-B596-0022481D68CD}" first="{49B0BE2E-D01C-ED11-B83E-000D3A572421}" /&gt;&lt;/cookie&gt;'><entity name='contact'><attribute name='fullname' /></entity></fetch>`;
		const first = "<fetch count='3' page='1'><entity name='contact'><attribute name='fullname' /></entity></fetch>";
		const result = pagedFetchXml(parse(first), { page: 2, pagingCookie: decodePagingCookie(annotation), pageSize: 50 });
		expect(fetchAttributes(result.fetchXml)).toEqual(fetchAttributes(documented));
	});

	it("does not change the document it is given", () => {
		const document = parse(QUERY);
		const before = serializeFetchXml(document);
		pagedFetchXml(document, { page: 2, pagingCookie: COOKIE, pageSize: 50 });
		expect(serializeFetchXml(document)).toBe(before);
	});

	it("refuses a document whose root is not fetch", () => {
		expect(pagedFetchXml(parse('<entity name="account" />'), { page: 1, pagingCookie: null, pageSize: 50 })).toMatchObject({ pageable: false });
	});
});

describe("Column types", () => {
	it("match the operator catalogue's Column types exactly", () => {
		const fromCatalogue: readonly QueryColumnType[] = COLUMN_TYPES;
		const toCatalogue: readonly ColumnType[] = [] as QueryColumnType[];
		expect([...fromCatalogue].sort()).toEqual(
			(
				[
					"text",
					"memo",
					"wholeNumber",
					"decimalOrMoney",
					"dateTime",
					"choice",
					"multiChoice",
					"yesNo",
					"lookup",
					"owner",
					"uniqueIdentifier",
					"stateOrStatus",
				] satisfies QueryColumnType[]
			).sort()
		);
		expect(toCatalogue).toEqual([]);
	});
});
