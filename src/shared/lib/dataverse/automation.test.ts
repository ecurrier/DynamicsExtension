import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { automationOperations } from "./automation";

const STEP = "11111111-1111-4111-8111-111111111111";
const WORKFLOW = "22222222-2222-4222-8222-222222222222";
const FLOW = "33333333-3333-4333-8333-333333333333";

const responses = {
	"sdkmessageprocessingsteps?$select=": {
		value: [
			{
				sdkmessageprocessingstepid: STEP,
				name: "Contoso: Post-op of account",
				stage: 40,
				mode: 0,
				rank: 10,
				statecode: 0,
				ismanaged: true,
				filteringattributes: "name,revenue",
				plugintypeid: { typename: "Contoso.AccountPostCreate", friendlyname: "Account post create" },
				sdkmessageid: { name: "Create" },
			},
		],
	},
	"workflows?$select=": {
		value: [
			{
				workflowid: WORKFLOW,
				name: "Set owner",
				category: 0,
				type: 1,
				statecode: 1,
				mode: 1,
				rank: 1,
				triggeroncreate: true,
				triggeronupdateattributelist: "name",
				ismanaged: false,
			},
			{
				workflowid: FLOW,
				name: "Notify sales",
				category: 5,
				type: 1,
				statecode: 1,
				ismanaged: false,
			},
		],
	},
	"callbackregistrations?$select=": {
		value: [{ callbackregistrationid: "cb1", name: "flow", entityname: "account", message: "Update" }],
	},
	"asyncoperations?$select=": {
		value: [
			{
				asyncoperationid: "a1",
				name: "Set owner",
				statuscode: 31,
				message: "Boom",
				startedon: "2026-01-01T00:00:00Z",
			},
		],
	},
};

describe("automationOperations.getTableAutomation", () => {
	it("merges plug-in steps and processes, pipeline stages first then execution order", async () => {
		const { http } = createFakeHttp(responses);
		const result = await automationOperations(http).getTableAutomation({ entityLogicalName: "account" });

		expect(result.items.map((item) => item.name)).toEqual(["Contoso: Post-op of account", "Notify sales", "Set owner"]);
		const step = result.items.find((item) => item.id === STEP);
		expect(step).toMatchObject({
			kind: "plugin",
			stageLabel: "Post-operation",
			mode: "sync",
			messages: ["Create"],
			filteringAttributes: ["name", "revenue"],
			owner: "Contoso.AccountPostCreate",
			enabled: true,
		});
	});

	it("classifies category 5 as a cloud flow and reads workflow trigger flags", async () => {
		const { http } = createFakeHttp(responses);
		const result = await automationOperations(http).getTableAutomation({ entityLogicalName: "account" });

		expect(result.items.find((item) => item.id === FLOW)?.kind).toBe("flow");
		const workflow = result.items.find((item) => item.id === WORKFLOW);
		expect(workflow?.kind).toBe("workflow");
		expect(workflow?.messages).toEqual(["Create", "Update"]);
		expect(workflow?.mode).toBe("sync");
		expect(workflow?.enabled).toBe(true);
	});

	it("shows the plug-in type name, not the GUID that friendlyname often holds", async () => {
		const { http } = createFakeHttp({
			...responses,
			"sdkmessageprocessingsteps?$select=": {
				value: [
					{
						sdkmessageprocessingstepid: STEP,
						name: "Contoso: Post-op of account",
						stage: 40,
						statecode: 0,
						plugintypeid: {
							typename: "Contoso.Plugins.AccountPostCreate",
							friendlyname: "55555555-5555-4555-8555-555555555555",
							name: "Contoso.Plugins.AccountPostCreate",
						},
						sdkmessageid: { name: "Create" },
					},
				],
			},
		});
		const result = await automationOperations(http).getTableAutomation({ entityLogicalName: "account" });
		expect(result.items.find((item) => item.id === STEP)?.owner).toBe("Contoso.Plugins.AccountPostCreate");
	});

	it("falls back to null rather than showing a GUID when no readable type name exists", async () => {
		const { http } = createFakeHttp({
			...responses,
			"sdkmessageprocessingsteps?$select=": {
				value: [
					{
						sdkmessageprocessingstepid: STEP,
						name: "Contoso: Post-op of account",
						statecode: 0,
						plugintypeid: { typename: null, name: null, friendlyname: "55555555-5555-4555-8555-555555555555" },
						sdkmessageid: { name: "Create" },
					},
				],
			},
		});
		const result = await automationOperations(http).getTableAutomation({ entityLogicalName: "account" });
		expect(result.items.find((item) => item.id === STEP)?.owner).toBeNull();
	});

	it("marks failed background jobs", async () => {
		const { http } = createFakeHttp(responses);
		const result = await automationOperations(http).getTableAutomation({ entityLogicalName: "account" });
		expect(result.recentRuns[0]).toMatchObject({ statusLabel: "Failed", failed: true, message: "Boom" });
		expect(result.registrations).toHaveLength(1);
	});

	it("degrades when callbackregistration cannot be read rather than failing the whole view", async () => {
		const { http } = createFakeHttp({
			...responses,
			"callbackregistrations?$select=": () => {
				throw new Error("Principal lacks prvReadCallbackRegistration");
			},
		});
		const result = await automationOperations(http).getTableAutomation({ entityLogicalName: "account" });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.registrations).toEqual([]);
		expect(result.registrationsUnavailable).toContain("prvReadCallbackRegistration");
	});
});
