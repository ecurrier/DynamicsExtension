import { type FluentIcon } from "@fluentui/react-icons";
import { describe, expect, it } from "vitest";

import { modules as registryModules } from "@/modules";
import { type ModuleDefinition } from "@/modules/types";

import { searchNav } from "./navSearch";

const icon = (() => null) as unknown as FluentIcon;
const component = () => null;

const modules: ModuleDefinition[] = [
	{
		id: "utilities",
		label: "Utilities",
		icon,
		order: 1,
		areas: [
			{
				id: "utilities.developer",
				label: "Developer",
				breadcrumb: ["Utilities", "Developer"],
				tooltip: "Developer helpers such as Fetch XML, URLs, and choice code snippets",
				component,
				utilities: [
					{
						id: "generate-query",
						title: "Generate Query",
						description: "Fetch XML for the current record, its subgrids, or the view as displayed.",
						keywords: ["fetchxml"],
					},
					{
						id: "column-browser",
						title: "Column Browser",
						description: "Search the current table's columns by display, logical, or schema name.",
						keywords: ["attributes"],
					},
					{
						id: "record-payload",
						title: "Record Payload",
						description: "The open record as a Web API create or update body, with lookups bound and read-only columns left out.",
					},
				],
			},
		],
	},
	{
		id: "investigate",
		label: "Investigate",
		icon,
		order: 2,
		areas: [
			{
				id: "investigate.columns",
				label: "Column Usage",
				breadcrumb: ["Investigate", "Column Usage"],
				tooltip: "Find every component and cloud flow that depends on a column before changing it",
				keywords: ["attribute"],
				component,
			},
		],
	},
	{
		id: "schema",
		label: "Schema",
		icon,
		order: 3,
		areas: [
			{
				id: "schema.columns",
				label: "Cross-Table Columns",
				breadcrumb: ["Schema", "Cross-Table Columns"],
				tooltip: "Change a column's label, description, or requirement level across every table that has it",
				keywords: ["attribute"],
				component,
			},
		],
	},
	{
		id: "impersonation",
		label: "Impersonation",
		icon,
		order: 4,
		areas: [
			{
				id: "impersonation.user",
				label: "Impersonate User",
				breadcrumb: ["Impersonate User"],
				tooltip: "Run this tab as another user by adding the Dataverse impersonation header to its Web API requests",
				keywords: ["sudo", "act as"],
				component,
			},
		],
	},
	{
		id: "plugins",
		label: "Plug-ins",
		icon,
		order: 5,
		areas: [
			{
				id: "plugins.steps",
				label: "Steps",
				breadcrumb: ["Plug-ins", "Steps"],
				tooltip: "Enable or disable plug-in steps, grouped by assembly and plug-in type",
				component,
			},
			{
				id: "plugins.traces",
				label: "Traces",
				breadcrumb: ["Plug-ins", "Traces"],
				tooltip: "Control plug-in trace logging and open the full-page trace log viewer",
				component,
			},
		],
	},
];

const keys = (query: string) => searchNav(modules, query).hits.map((hit) => hit.key);

describe("searchNav", () => {
	it("returns nothing for a blank query", () => {
		expect(searchNav(modules, "   ")).toEqual({ groups: [], hits: [], total: 0 });
	});

	it("groups hits by module, ordering both by the best match", () => {
		const result = searchNav(modules, "column");
		expect(result.groups.map((group) => [group.moduleId, group.hits.map((hit) => hit.key)])).toEqual([
			["investigate", ["investigate.columns"]],
			["utilities", ["utilities.developer/column-browser"]],
			["schema", ["schema.columns"]],
		]);
		expect(result.hits.map((hit) => hit.index)).toEqual([0, 1, 2]);
	});

	it("leaves out a description-only match when much stronger matches exist", () => {
		expect(keys("column")).not.toContain("utilities.developer/record-payload");
		expect(keys("bound")).toEqual(["utilities.developer/record-payload"]);
	});

	it("finds a Utility and names the Area it opens", () => {
		const [first] = searchNav(modules, "fetch").hits;
		expect(first).toMatchObject({ areaId: "utilities.developer", utilityId: "generate-query", context: "Developer utility" });
	});

	it("matches keywords and names the keyword only when nothing visible explains the match", () => {
		const sudo = searchNav(modules, "sudo").hits;
		expect(sudo.map((hit) => [hit.key, hit.keyword])).toEqual([["impersonation.user", "sudo"]]);
		const fetch = searchNav(modules, "fetch").hits.find((hit) => hit.utilityId === "generate-query");
		expect(fetch?.keyword).toBeNull();
	});

	it("requires every word to match", () => {
		expect(keys("record payload")).toEqual(["utilities.developer/record-payload"]);
		expect(keys("column xyz")).toEqual([]);
	});

	it("matches module names for Areas but not for their Utilities", () => {
		expect(keys("utilities")).toEqual(["utilities.developer"]);
	});

	it("ignores hyphens in labels and module names", () => {
		expect(keys("plugin")).toEqual(["plugins.steps", "plugins.traces"]);
		expect(keys("crosstable")).toEqual(["schema.columns"]);
	});

	it("marks the matched part of the label", () => {
		const hit = searchNav(modules, "col").hits.find((candidate) => candidate.key === "schema.columns");
		expect(hit?.label).toEqual([
			{ text: "Cross-Table ", match: false },
			{ text: "Col", match: true },
			{ text: "umns", match: false },
		]);
	});

	it("trims the start of a long description when only the description explains the match", () => {
		const [hit] = searchNav(modules, "bound").hits;
		expect(hit?.description[0]?.text).toBe("…with lookups ");
		expect(hit?.description.find((segment) => segment.match)?.text).toBe("bound");
	});

	it("keeps the description whole when the label explains the match", () => {
		const [hit] = searchNav(modules, "column").hits;
		expect(hit?.key).toBe("investigate.columns");
		expect(hit?.description.map((segment) => segment.text).join("")).toBe(
			"Find every component and cloud flow that depends on a column before changing it"
		);
	});

	it("caps the hits but reports how many matched", () => {
		const result = searchNav(modules, "e", 2);
		expect(result.hits).toHaveLength(2);
		expect(result.total).toBeGreaterThan(2);
	});
});

describe("searchNav over the registry", () => {
	it("finds every Area by its own label", () => {
		for (const module of registryModules) {
			for (const area of module.areas) {
				expect(searchNav(registryModules, area.label, 100).hits.map((hit) => hit.key)).toContain(area.id);
			}
		}
	});

	it("finds every Utility by its title", () => {
		for (const module of registryModules) {
			for (const area of module.areas) {
				for (const utility of area.utilities ?? []) {
					expect(searchNav(registryModules, utility.title, 100).hits.map((hit) => hit.utilityId)).toContain(utility.id);
				}
			}
		}
	});

	it("reaches tools through the words the glossary tells us to avoid", () => {
		const first = (query: string) => searchNav(registryModules, query).hits[0]?.key;
		expect(first("sudo")).toBe("impersonation.user");
		expect(first("migrate")).toBe("transporter.launch");
		expect(searchNav(registryModules, "option set").hits.map((hit) => hit.utilityId)).toContain("choice-snippet");
		expect(searchNav(registryModules, "attribute").hits.map((hit) => hit.key)).toEqual(
			expect.arrayContaining(["schema.columns", "investigate.columns", "utilities.developer/column-browser"])
		);
	});
});
