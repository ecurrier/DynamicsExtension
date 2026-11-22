import { describe, expect, it } from "vitest";

import { COLUMN_TYPES, type OperatorValueCount, operatorDefinition, OPERATORS, operatorsFor } from "./operators";

const DOCUMENTED = [
	"above",
	"begins-with",
	"between",
	"contain-values",
	"ends-with",
	"eq",
	"eq-businessid",
	"eq-or-above",
	"eq-or-under",
	"eq-userid",
	"eq-userlanguage",
	"eq-useroruserhierarchy",
	"eq-useroruserhierarchyandteams",
	"eq-useroruserteams",
	"eq-userteams",
	"ge",
	"gt",
	"in",
	"in-fiscal-period",
	"in-fiscal-period-and-year",
	"in-fiscal-year",
	"in-or-after-fiscal-period-and-year",
	"in-or-before-fiscal-period-and-year",
	"last-fiscal-period",
	"last-fiscal-year",
	"last-month",
	"last-seven-days",
	"last-week",
	"last-x-days",
	"last-x-fiscal-periods",
	"last-x-fiscal-years",
	"last-x-hours",
	"last-x-months",
	"last-x-weeks",
	"last-x-years",
	"last-year",
	"le",
	"like",
	"lt",
	"ne",
	"ne-businessid",
	"ne-userid",
	"neq",
	"next-fiscal-period",
	"next-fiscal-year",
	"next-month",
	"next-seven-days",
	"next-week",
	"next-x-days",
	"next-x-fiscal-periods",
	"next-x-fiscal-years",
	"next-x-hours",
	"next-x-months",
	"next-x-weeks",
	"next-x-years",
	"next-year",
	"not-begin-with",
	"not-between",
	"not-contain-values",
	"not-end-with",
	"not-in",
	"not-like",
	"not-null",
	"not-under",
	"null",
	"olderthan-x-days",
	"olderthan-x-hours",
	"olderthan-x-minutes",
	"olderthan-x-months",
	"olderthan-x-weeks",
	"olderthan-x-years",
	"on",
	"on-or-after",
	"on-or-before",
	"this-fiscal-period",
	"this-fiscal-year",
	"this-month",
	"this-week",
	"this-year",
	"today",
	"tomorrow",
	"under",
	"yesterday",
];

const namesFor = (columnType: Parameters<typeof operatorsFor>[0]): string[] => operatorsFor(columnType).map((operator) => operator.name);

const valuesOf = (name: string): OperatorValueCount | undefined => operatorDefinition(name)?.values;

describe("operator catalogue", () => {
	it("has every documented operator once", () => {
		expect(OPERATORS.map((operator) => operator.name).sort()).toEqual([...DOCUMENTED].sort());
		expect(new Set(OPERATORS.map((operator) => operator.name)).size).toBe(OPERATORS.length);
	});

	it("gives every operator a one-sentence meaning", () => {
		for (const operator of OPERATORS) {
			expect(operator.meaning).toMatch(/^[A-Z].*\.$/);
		}
	});

	it("offers list operators but not like for a Choice column", () => {
		const choice = namesFor("choice");
		expect(choice).toEqual(expect.arrayContaining(["eq", "ne", "in", "not-in", "null", "not-null"]));
		expect(choice).not.toContain("like");
		expect(choice).not.toContain("contain-values");
		expect(namesFor("multiChoice")).toEqual(expect.arrayContaining(["contain-values", "not-contain-values", "in", "not-in"]));
		expect(namesFor("stateOrStatus")).toEqual(namesFor("choice"));
	});

	it("offers the relative-date operators for a date column with the right value counts", () => {
		const date = namesFor("dateTime");
		expect(date).toEqual(
			expect.arrayContaining(["today", "last-x-days", "next-x-months", "olderthan-x-minutes", "in-fiscal-period-and-year", "between", "on"])
		);
		expect(date).not.toContain("like");
		expect(date).not.toContain("in");
		expect(valuesOf("today")).toBe("none");
		expect(valuesOf("last-seven-days")).toBe("none");
		expect(valuesOf("this-fiscal-year")).toBe("none");
		expect(valuesOf("last-x-days")).toBe("one");
		expect(operatorDefinition("last-x-days")?.valueKind).toBe("integer");
		expect(valuesOf("in-fiscal-year")).toBe("one");
		expect(valuesOf("in-fiscal-period-and-year")).toBe("two");
		expect(valuesOf("between")).toBe("two");
		expect(operatorDefinition("on")?.valueKind).toBe("column");
		expect(operatorDefinition("last-x-hours")?.requiresTime).toBe(true);
		expect(operatorDefinition("last-x-days")?.requiresTime).toBe(false);
	});

	it("counts values for list, none and one-value operators", () => {
		expect(valuesOf("in")).toBe("list");
		expect(valuesOf("not-contain-values")).toBe("list");
		expect(valuesOf("null")).toBe("none");
		expect(valuesOf("eq-userid")).toBe("none");
		expect(valuesOf("eq")).toBe("one");
		expect(valuesOf("under")).toBe("one");
	});

	it("limits text operators to text and memo, and user operators to identifier columns", () => {
		expect(operatorDefinition("like")?.columnTypes).toEqual(["text", "memo"]);
		expect(namesFor("yesNo")).toEqual(["eq", "ne", "null", "not-null"]);
		expect(namesFor("owner")).toEqual(expect.arrayContaining(["eq-userid", "eq-userteams", "eq-useroruserteams", "eq-useroruserhierarchy", "in"]));
		expect(namesFor("lookup")).toEqual(expect.arrayContaining(["eq-businessid", "under", "eq-or-above"]));
		expect(namesFor("wholeNumber")).toContain("eq-userlanguage");
		expect(namesFor("decimalOrMoney")).not.toContain("eq-userlanguage");
	});

	it("keeps neq as deprecated and out of every column's list", () => {
		expect(operatorDefinition("neq")?.deprecated).toBe(true);
		for (const columnType of COLUMN_TYPES) {
			expect(namesFor(columnType)).not.toContain("neq");
		}
	});

	it("returns undefined for an unknown operator", () => {
		expect(operatorDefinition("approximately")).toBeUndefined();
	});
});
