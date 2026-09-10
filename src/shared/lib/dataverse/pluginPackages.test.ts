import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { DataverseHttpError } from "./http";
import { composePluginPackages, pluginPackageOperations } from "./pluginPackages";

const PACKAGE_A = "11111111-1111-4111-8111-111111111111";
const PACKAGE_B = "22222222-2222-4222-8222-222222222222";
const ASSEMBLY_A = "33333333-3333-4333-8333-333333333333";
const ASSEMBLY_LOOSE = "44444444-4444-4444-8444-444444444444";
const TYPE_A = "55555555-5555-4555-8555-555555555555";
const TYPE_B = "66666666-6666-4666-8666-666666666666";

const packageRecord = (id: string, overrides: Record<string, unknown> = {}) => ({
	pluginpackageid: id,
	name: "Contoso.Plugins",
	uniquename: "contoso_Contoso.Plugins",
	version: "1.4.0",
	modifiedon: "2026-09-01T10:00:00Z",
	ismanaged: true,
	_modifiedby_value: "77777777-7777-4777-8777-777777777777",
	"_modifiedby_value@OData.Community.Display.V1.FormattedValue": "Jane Doe",
	...overrides,
});

const assemblies = [
	{ pluginassemblyid: ASSEMBLY_A.toUpperCase(), name: "Contoso.Plugins", version: "1.4.0.0", _packageid_value: `{${PACKAGE_A}}` },
	{ pluginassemblyid: ASSEMBLY_LOOSE, name: "Legacy.Plugins", version: "0.9.0.0", _packageid_value: null },
];

const types = [
	{ plugintypeid: TYPE_B, typename: "Contoso.Plugins.ContactPostUpdate", friendlyname: null, _pluginassemblyid_value: ASSEMBLY_A },
	{ plugintypeid: TYPE_A, typename: "Contoso.Plugins.AccountPreCreate", friendlyname: "Account pre-create", _pluginassemblyid_value: ASSEMBLY_A },
];

const steps = [
	{ sdkmessageprocessingstepid: "a", _plugintypeid_value: TYPE_A.toUpperCase() },
	{ sdkmessageprocessingstepid: "b", _plugintypeid_value: TYPE_A },
	{ sdkmessageprocessingstepid: "c", _plugintypeid_value: null },
];

describe("composePluginPackages", () => {
	it("groups assemblies and types under their package with step counts", () => {
		const packages = composePluginPackages(
			[packageRecord(PACKAGE_B, { name: "Fabrikam.Integration", ismanaged: false }), packageRecord(PACKAGE_A)],
			assemblies,
			types,
			steps
		);
		expect(packages.map((pkg) => pkg.name)).toEqual(["Contoso.Plugins", "Fabrikam.Integration"]);
		expect(packages[0]).toMatchObject({ id: PACKAGE_A, uniqueName: "contoso_Contoso.Plugins", modifiedBy: "Jane Doe", isManaged: true });
		expect(packages[0]?.assemblies).toHaveLength(1);
		expect(packages[0]?.assemblies[0]?.types.map((type) => [type.typeName, type.stepCount])).toEqual([
			["Contoso.Plugins.AccountPreCreate", 2],
			["Contoso.Plugins.ContactPostUpdate", 0],
		]);
		expect(packages[1]).toMatchObject({ isManaged: false, assemblies: [] });
	});

	it("falls back when optional columns are missing", () => {
		const [pkg] = composePluginPackages(
			[{ pluginpackageid: PACKAGE_A, name: null, uniquename: null, version: null, modifiedon: null, ismanaged: null }],
			[],
			[],
			[]
		);
		expect(pkg).toEqual({
			id: PACKAGE_A,
			name: "Unknown package",
			uniqueName: "",
			version: null,
			modifiedOn: null,
			modifiedBy: null,
			isManaged: false,
			assemblies: [],
		});
	});
});

describe("pluginPackageOperations", () => {
	it("lists packages and asks for formatted values only on the package query", async () => {
		const { http, calls } = createFakeHttp({
			"pluginpackages?": { value: [packageRecord(PACKAGE_A)] },
			"pluginassemblies?": { value: assemblies },
			"plugintypes?": { value: types },
			"sdkmessageprocessingsteps?": { value: steps },
		});
		const packages = await pluginPackageOperations(http).list();
		expect(packages).toHaveLength(1);
		expect(packages[0]?.assemblies[0]?.types[0]?.stepCount).toBe(2);
		const byPath = Object.fromEntries(calls.map((call) => [call.path.split("?")[0], call.headers]));
		expect(byPath.pluginpackages).toEqual({ Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"' });
		expect(byPath.pluginassemblies).toBeUndefined();
		expect(calls.find((call) => call.path.startsWith("sdkmessageprocessingsteps"))?.path).toContain("$filter=ishidden/Value eq false");
		expect(calls.some((call) => call.path.includes("content"))).toBe(false);
	});

	it("loads one package and returns null when it does not exist", async () => {
		const { http } = createFakeHttp({
			[`pluginpackages(${PACKAGE_A})`]: packageRecord(PACKAGE_A),
			[`pluginpackages(${PACKAGE_B})`]: () => {
				throw new DataverseHttpError(404, "Not Found", "");
			},
			"pluginassemblies?": { value: assemblies },
			"plugintypes?": { value: types },
			"sdkmessageprocessingsteps?": { value: steps },
		});
		const operations = pluginPackageOperations(http);
		await expect(operations.get({ id: PACKAGE_A })).resolves.toMatchObject({ id: PACKAGE_A, assemblies: [{ id: ASSEMBLY_A }] });
		await expect(operations.get({ id: PACKAGE_B })).resolves.toBeNull();
		await expect(operations.get({ id: "nope" })).rejects.toMatchObject({ code: "InvalidArgument" });
	});

	it("patches only the content and rejects bad input", async () => {
		const { http, calls } = createFakeHttp();
		const operations = pluginPackageOperations(http);
		await expect(operations.update({ id: `{${PACKAGE_A.toUpperCase()}}`, content: "UEsDBA==" })).resolves.toEqual({ id: PACKAGE_A });
		expect(calls).toEqual([{ method: "PATCH", path: `pluginpackages(${PACKAGE_A})`, body: { content: "UEsDBA==" }, headers: undefined }]);
		await expect(operations.update({ id: PACKAGE_A, content: "" })).rejects.toMatchObject({ code: "InvalidArgument" });
		await expect(operations.update({ id: "nope", content: "UEsDBA==" })).rejects.toMatchObject({ code: "InvalidArgument" });
	});

	it("reads solution layers for the package component", async () => {
		const { http, calls } = createFakeHttp({
			msdyn_componentlayers: { value: [{ msdyn_name: "Contoso.Plugins", msdyn_solutionname: "Active", msdyn_ismanaged: false, msdyn_order: 1 }] },
		});
		const layers = await pluginPackageOperations(http).getLayers({ id: PACKAGE_A });
		expect(layers).toMatchObject({ componentId: PACKAGE_A, solutionComponentName: "PluginPackage", hasUnmanagedLayer: true });
		expect(calls[0]?.path).toContain("msdyn_solutioncomponentname eq 'PluginPackage'");
	});
});
