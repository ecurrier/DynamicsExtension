import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { DataverseHttpError } from "./http";
import { pluginStepOperations } from "./pluginSteps";

const STEP_A = "11111111-1111-4111-8111-111111111111";
const STEP_B = "22222222-2222-4222-8222-222222222222";
const TYPE = "33333333-3333-4333-8333-333333333333";
const ASSEMBLY = "44444444-4444-4444-8444-444444444444";

const stepRecord = (id: string, overrides: Record<string, unknown> = {}) => ({
	sdkmessageprocessingstepid: id,
	name: "Contoso: Create of account",
	stage: 20,
	mode: 0,
	rank: 1,
	statecode: 0,
	statuscode: 1,
	ismanaged: false,
	filteringattributes: null,
	description: null,
	asyncautodelete: false,
	plugintypeid: {
		plugintypeid: TYPE,
		typename: "Contoso.Plugins.AccountPreCreate",
		friendlyname: null,
		name: "Contoso.Plugins.AccountPreCreate",
		_pluginassemblyid_value: ASSEMBLY.toUpperCase(),
	},
	sdkmessageid: { name: "Create" },
	sdkmessagefilterid: { primaryobjecttypecode: "account" },
	...overrides,
});

describe("pluginStepOperations", () => {
	it("lists non-hidden steps joined with their assemblies", async () => {
		const { http, calls } = createFakeHttp({
			"sdkmessageprocessingsteps?": {
				value: [
					stepRecord(STEP_A),
					stepRecord(STEP_B, {
						statecode: 1,
						statuscode: 2,
						plugintypeid: null,
						sdkmessageid: null,
						sdkmessagefilterid: null,
					}),
				],
			},
			"pluginassemblies?": { value: [{ pluginassemblyid: ASSEMBLY, name: "Contoso.Plugins", version: "1.0.0.0" }] },
		});
		const steps = await pluginStepOperations(http).getSteps();
		expect(steps[0]).toEqual({
			id: STEP_A,
			name: "Contoso: Create of account",
			stage: 20,
			mode: 0,
			rank: 1,
			enabled: true,
			isManaged: false,
			filteringAttributes: null,
			description: null,
			asyncAutoDelete: false,
			messageName: "Create",
			primaryEntity: "account",
			pluginTypeId: TYPE,
			pluginTypeName: "Contoso.Plugins.AccountPreCreate",
			pluginTypeFriendlyName: null,
			assemblyId: ASSEMBLY,
			assemblyName: "Contoso.Plugins",
			assemblyVersion: "1.0.0.0",
		});
		expect(steps[1]).toMatchObject({
			id: STEP_B,
			enabled: false,
			messageName: "",
			primaryEntity: null,
			pluginTypeName: "Unknown type",
			assemblyName: "Unknown assembly",
		});
		expect(decodeURIComponent(calls[0]?.path ?? "")).toContain("$filter=ishidden/Value eq false");
	});

	it("loads a single step and returns null when it does not exist", async () => {
		const { http } = createFakeHttp({
			[`sdkmessageprocessingsteps(${STEP_A})`]: stepRecord(STEP_A),
			[`sdkmessageprocessingsteps(${STEP_B})`]: () => {
				throw new DataverseHttpError(404, "Not Found", "");
			},
			[`pluginassemblies(${ASSEMBLY})`]: { pluginassemblyid: ASSEMBLY, name: "Contoso.Plugins", version: "2.0.0.0" },
		});
		const operations = pluginStepOperations(http);
		await expect(operations.get({ id: STEP_A })).resolves.toMatchObject({ id: STEP_A, assemblyVersion: "2.0.0.0" });
		await expect(operations.get({ id: STEP_B })).resolves.toBeNull();
		await expect(operations.get({ id: "nope" })).rejects.toMatchObject({ code: "InvalidArgument" });
	});

	it("patches state in both directions and reports per-step failures", async () => {
		const { http, calls } = createFakeHttp({
			[`PATCH sdkmessageprocessingsteps(${STEP_B})`]: () => {
				throw new Error("locked");
			},
		});
		const operations = pluginStepOperations(http);
		await expect(operations.setState({ ids: [STEP_A, STEP_B], enabled: false })).resolves.toEqual({
			updated: 1,
			failed: [{ id: STEP_B, message: "locked" }],
		});
		expect(calls.map((call) => [call.method, call.path, call.body])).toEqual([
			["PATCH", `sdkmessageprocessingsteps(${STEP_A})`, { statecode: 1, statuscode: 2 }],
			["PATCH", `sdkmessageprocessingsteps(${STEP_B})`, { statecode: 1, statuscode: 2 }],
		]);
		await expect(operations.setState({ ids: [STEP_A], enabled: true })).resolves.toEqual({ updated: 1, failed: [] });
		expect(calls[2]?.body).toEqual({ statecode: 0, statuscode: 1 });
	});
});
