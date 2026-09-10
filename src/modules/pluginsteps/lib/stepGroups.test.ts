import { describe, expect, it } from "vitest";

import { type PluginStep } from "@/shared/types";

import {
	assemblyValue,
	groupPluginSteps,
	parseTreeValue,
	stepIdsUnder,
	stepSummary,
	stepValue,
	treeCheckedItems,
	typeCaption,
	typeDisplayName,
	typeValue,
} from "./stepGroups";

const step = (id: string, overrides: Partial<PluginStep> = {}): PluginStep => ({
	id,
	name: `Step ${id}`,
	stage: 40,
	mode: 0,
	rank: 1,
	enabled: true,
	isManaged: false,
	filteringAttributes: null,
	description: null,
	asyncAutoDelete: false,
	messageName: "Create",
	primaryEntity: "account",
	pluginTypeId: "t1",
	pluginTypeName: "Contoso.Plugins.AccountPreCreate",
	pluginTypeFriendlyName: null,
	assemblyId: "a1",
	assemblyName: "Contoso.Plugins",
	assemblyVersion: "1.0.0.0",
	...overrides,
});

const steps = [
	step("s1", { rank: 2 }),
	step("s2", { rank: 1, enabled: false }),
	step("s3", { pluginTypeId: "t2", pluginTypeName: "Contoso.Plugins.ContactPostUpdate", messageName: "Update" }),
	step("s4", {
		assemblyId: null,
		assemblyName: "Unknown assembly",
		pluginTypeId: null,
		pluginTypeName: "Unknown type",
	}),
	step("s5", { assemblyId: "a0", assemblyName: "Alpha.Plugins", pluginTypeId: "t3", pluginTypeName: "Alpha.Zebra" }),
];

describe("step groups", () => {
	it("groups by assembly and type, sorted by name then rank", () => {
		const groups = groupPluginSteps(steps, "", "all");
		expect(groups.map((group) => group.name)).toEqual(["Alpha.Plugins", "Contoso.Plugins", "Unknown assembly"]);
		const contoso = groups[1];
		expect(contoso?.types.map((type) => type.name)).toEqual(["Contoso.Plugins.AccountPreCreate", "Contoso.Plugins.ContactPostUpdate"]);
		expect(contoso?.types[0]?.steps.map((candidate) => candidate.id)).toEqual(["s2", "s1"]);
		expect(groups[2]?.key).toBe("unknown");
	});

	it("applies text and state filters", () => {
		expect(groupPluginSteps(steps, "update", "all").flatMap((group) => group.types.flatMap((type) => type.steps))).toHaveLength(1);
		expect(groupPluginSteps(steps, "zebra", "all")[0]?.name).toBe("Alpha.Plugins");
		const disabled = groupPluginSteps(steps, "", "disabled");
		expect(disabled).toHaveLength(1);
		expect(disabled[0]?.types[0]?.steps[0]?.id).toBe("s2");
	});

	it("resolves step ids under any tree value", () => {
		const groups = groupPluginSteps(steps, "", "all");
		expect(stepIdsUnder(groups, assemblyValue("a1"))).toEqual(["s2", "s1", "s3"]);
		expect(stepIdsUnder(groups, typeValue("a1", "t2"))).toEqual(["s3"]);
		expect(stepIdsUnder(groups, stepValue("s5"))).toEqual(["s5"]);
		expect(stepIdsUnder(groups, "bogus")).toEqual([]);
	});

	it("derives mixed selection states for branches", () => {
		const groups = groupPluginSteps(steps, "", "all");
		const items = new Map(treeCheckedItems(groups, new Set(["s1", "s5"])));
		expect(items.get(assemblyValue("a0"))).toBe(true);
		expect(items.get(assemblyValue("a1"))).toBe("mixed");
		expect(items.get(typeValue("a1", "t1"))).toBe("mixed");
		expect(items.get(typeValue("a1", "t2"))).toBe(false);
		expect(items.get(stepValue("s1"))).toBe(true);
		expect(items.get(stepValue("s2"))).toBe(false);
	});

	it("parses tree values and summarises steps", () => {
		expect(parseTreeValue("assembly:a1")).toEqual({ kind: "assembly", id: "a1" });
		expect(parseTreeValue("type:a1:t1")).toEqual({ kind: "type", parent: "a1", id: "t1" });
		expect(parseTreeValue("step:s1")).toEqual({ kind: "step", id: "s1" });
		expect(parseTreeValue("other:x")).toBeNull();
		expect(stepSummary(step("s1", { stage: 20, mode: 1 }))).toBe("Create of account · PreOperation · Async");
		expect(stepSummary(step("s1", { messageName: "", primaryEntity: null, stage: 99 }))).toBe("Unknown message · Stage 99 · Sync");
	});
});

describe("type display name", () => {
	it("prefers the type name over a friendly name", () => {
		expect(typeDisplayName({ name: "Contoso.Plugins.AccountPreCreate", friendlyName: "Account pre-create" })).toBe("Contoso.Plugins.AccountPreCreate");
	});

	it("never shows a guid friendly name", () => {
		expect(typeDisplayName({ name: "", friendlyName: "{9931d7aa-6062-4c4c-bfc8-ecd0302e164c}" })).toBe("Unknown type");
		expect(typeCaption({ name: "Contoso.Plugins.X", friendlyName: "9931d7aa-6062-4c4c-bfc8-ecd0302e164c" })).toBeNull();
	});

	it("falls back to a readable friendly name when the type name is missing", () => {
		expect(typeDisplayName({ name: "", friendlyName: "Account pre-create" })).toBe("Account pre-create");
	});

	it("captions with the friendly name only when it adds information", () => {
		expect(typeCaption({ name: "Contoso.Plugins.X", friendlyName: "Contoso.Plugins.X" })).toBeNull();
		expect(typeCaption({ name: "Contoso.Plugins.X", friendlyName: null })).toBeNull();
		expect(typeCaption({ name: "Contoso.Plugins.X", friendlyName: "Account pre-create" })).toBe("Account pre-create");
	});
});
