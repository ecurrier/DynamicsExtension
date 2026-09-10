import { describe, expect, it } from "vitest";

import { type PluginPackage } from "@/shared/types";

import {
	describeCounts,
	describeUpdate,
	fileNameMatchesPackage,
	formatFileSize,
	formatTimestamp,
	isPackageFileName,
	packageCounts,
	packageMatches,
	packageTypeRows,
} from "./packages";

const pkg: PluginPackage = {
	id: "11111111-1111-4111-8111-111111111111",
	name: "Contoso.Plugins",
	uniqueName: "contoso_Contoso.Plugins",
	version: "1.4.0",
	modifiedOn: "2026-09-08T14:12:00Z",
	modifiedBy: "Jane Doe",
	isManaged: true,
	assemblies: [
		{
			id: "a",
			name: "Contoso.Plugins",
			version: "1.4.0.0",
			types: [
				{ id: "t1", typeName: "Contoso.Plugins.AccountPreCreate", friendlyName: "Account pre-create", stepCount: 2 },
				{ id: "t2", typeName: "Contoso.Plugins.ContactPostUpdate", friendlyName: null, stepCount: 0 },
			],
		},
		{ id: "b", name: "Contoso.Shared", version: null, types: [{ id: "t3", typeName: "Contoso.Shared.Helper", friendlyName: null, stepCount: 1 }] },
	],
};

describe("packageMatches", () => {
	it("matches package, assembly, and type names case-insensitively", () => {
		expect(packageMatches(pkg, "")).toBe(true);
		expect(packageMatches(pkg, "  ")).toBe(true);
		expect(packageMatches(pkg, "contoso_")).toBe(true);
		expect(packageMatches(pkg, "shared")).toBe(true);
		expect(packageMatches(pkg, "PRE-CREATE")).toBe(true);
		expect(packageMatches(pkg, "1.4")).toBe(true);
		expect(packageMatches(pkg, "fabrikam")).toBe(false);
	});
});

describe("packageTypeRows and packageCounts", () => {
	it("flattens types with their assembly and totals the counts", () => {
		expect(packageTypeRows(pkg).map((row) => [row.assemblyName, row.typeName, row.stepCount])).toEqual([
			["Contoso.Plugins", "Contoso.Plugins.AccountPreCreate", 2],
			["Contoso.Plugins", "Contoso.Plugins.ContactPostUpdate", 0],
			["Contoso.Shared", "Contoso.Shared.Helper", 1],
		]);
		expect(packageCounts(pkg)).toEqual({ assemblies: 2, types: 3, steps: 3 });
		expect(describeCounts({ assemblies: 1, types: 1, steps: 1 })).toBe("1 assembly · 1 type · 1 step");
		expect(describeCounts(packageCounts(pkg))).toBe("2 assemblies · 3 types · 3 steps");
	});
});

describe("file helpers", () => {
	it("formats sizes and timestamps", () => {
		expect(formatFileSize(512)).toBe("512 B");
		expect(formatFileSize(2048)).toBe("2.0 KB");
		expect(formatFileSize(3 * 1024 * 1024)).toBe("3.00 MB");
		expect(formatTimestamp(null)).toBe("");
		expect(formatTimestamp("not a date")).toBe("not a date");
		expect(formatTimestamp("2026-09-08T14:12:00Z")).not.toBe("");
	});

	it("recognises a nupkg built for the package", () => {
		expect(isPackageFileName("Contoso.Plugins.1.4.1.nupkg")).toBe(true);
		expect(isPackageFileName("Contoso.Plugins.dll")).toBe(false);
		expect(fileNameMatchesPackage("Contoso.Plugins.1.4.1.nupkg", pkg)).toBe(true);
		expect(fileNameMatchesPackage("contoso.plugins.nupkg", pkg)).toBe(true);
		expect(fileNameMatchesPackage("contoso_Contoso.Plugins.1.0.0.nupkg", pkg)).toBe(true);
		expect(fileNameMatchesPackage("Fabrikam.Integration.2.0.0.nupkg", pkg)).toBe(false);
		expect(fileNameMatchesPackage("Contoso.PluginsExtra.1.0.0.nupkg", pkg)).toBe(false);
	});

	it("describes the outcome of an update", () => {
		expect(describeUpdate(pkg, null)).toContain("Reload");
		expect(describeUpdate(pkg, { ...pkg, modifiedOn: "2026-09-10T08:00:00Z" })).toMatch(/^Modified .+$/);
		expect(describeUpdate(pkg, { ...pkg, modifiedOn: "2026-09-10T08:00:00Z" })).not.toContain("version");
		expect(describeUpdate(pkg, { ...pkg, modifiedOn: null, version: "1.4.1" })).toBe("Modified just now · version 1.4.0 to 1.4.1");
	});
});
