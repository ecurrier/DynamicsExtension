import { describe, expect, it } from "vitest";

import { nodeAtPath, serializeFetchXml, type XmlElement } from "@/shared/lib/fetchxml";
import { parse } from "@/test/queryTree";

import { aggregateChoiceOf, GROUP_BY, isAggregateQuery, isTrueValue, setAggregateChoice, setAttributes } from "./attributeEdits";

const QUERY =
	'<fetch aggregate="1"><entity name="account"><attribute name="name" groupby="true" alias="n"/><attribute name="revenue" aggregate="sum"/></entity></fetch>';

describe("setAttributes", () => {
	it("sets and removes attributes in one change that keeps the row selected", () => {
		const result = setAttributes(parse(QUERY), [0, 0], { alias: "group", groupby: null, dategrouping: "month" });
		if (!result.ok) {
			throw new Error(result.reason);
		}
		expect(serializeFetchXml(result.change.document, { minify: true })).toContain('<attribute name="name" alias="group" dategrouping="month"/>');
		expect(result.change.select).toEqual([0, 0]);
		expect(result.change.shift).toEqual({ kind: "none" });
	});

	it("refuses a change that changes nothing", () => {
		expect(setAttributes(parse(QUERY), [0, 0], { alias: "n", distinct: null }).ok).toBe(false);
	});
});

describe("aggregates", () => {
	it("accepts 1 as well as true", () => {
		expect(isTrueValue("1")).toBe(true);
		expect(isTrueValue(" TRUE ")).toBe(true);
		expect(isTrueValue("0")).toBe(false);
		expect(isAggregateQuery(parse(QUERY))).toBe(true);
		expect(isAggregateQuery(parse('<fetch><entity name="account"/></fetch>'))).toBe(false);
	});

	it("reads and writes group by and the aggregate function as one choice", () => {
		const document = parse(QUERY);
		expect(aggregateChoiceOf(nodeAtPath(document, [0, 0]) as XmlElement)).toBe(GROUP_BY);
		expect(aggregateChoiceOf(nodeAtPath(document, [0, 1]) as XmlElement)).toBe("sum");
		const result = setAggregateChoice(document, [0, 0], "count");
		expect(result.ok && serializeFetchXml(result.change.document, { minify: true })).toContain('<attribute name="name" alias="n" aggregate="count"/>');
		const grouped = setAggregateChoice(document, [0, 1], GROUP_BY);
		expect(grouped.ok && serializeFetchXml(grouped.change.document, { minify: true })).toContain('<attribute name="revenue" groupby="true"/>');
	});
});
