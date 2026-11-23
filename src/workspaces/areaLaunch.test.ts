import { describe, expect, it } from "vitest";

import { areaWorkspaceLaunch } from "./areaLaunch";

const context = {
	tabId: 7,
	orgOrigin: "https://contoso.crm.dynamics.com",
	environmentName: "Contoso",
	pageReady: true,
	now: "2026-11-14T10:00:00.000Z",
};

describe("areaWorkspaceLaunch", () => {
	it("carries the tool into a Schema Tools launch", () => {
		expect(areaWorkspaceLaunch({ id: "schema-tools", tool: "polymorphic" }, context)).toEqual({
			id: "schema-tools",
			launch: { tool: "polymorphic", tabId: 7, environmentId: null, launchedAt: context.now },
		});
	});

	it("carries the tool into a Security Tools launch", () => {
		expect(areaWorkspaceLaunch({ id: "security-tools", tool: "privileges" }, context)).toEqual({
			id: "security-tools",
			launch: { tool: "privileges", tabId: 7, environmentId: null, launchedAt: context.now },
		});
	});

	it("gives the Trace Viewer the tab it reads through", () => {
		expect(areaWorkspaceLaunch({ id: "plugin-traces" }, context)).toEqual({
			id: "plugin-traces",
			launch: { tabId: 7, orgOrigin: context.orgOrigin, environmentName: "Contoso", launchedAt: context.now },
		});
	});

	it("refuses a Trace Viewer launch with no tab or no org", () => {
		expect(areaWorkspaceLaunch({ id: "plugin-traces" }, { ...context, tabId: null })).toBeNull();
		expect(areaWorkspaceLaunch({ id: "plugin-traces" }, { ...context, orgOrigin: null })).toBeNull();
	});

	it("opens the Data Transporter without a page, because it can read a saved environment instead", () => {
		expect(areaWorkspaceLaunch({ id: "data-transporter" }, { ...context, pageReady: false })).toEqual({
			id: "data-transporter",
			launch: { tabId: null, orgOrigin: null, environmentName: null, launchedAt: context.now },
		});
	});

	it("gives the Data Transporter the page as a source when the page is ready", () => {
		expect(areaWorkspaceLaunch({ id: "data-transporter" }, context)).toEqual({
			id: "data-transporter",
			launch: { tabId: 7, orgOrigin: context.orgOrigin, environmentName: "Contoso", launchedAt: context.now },
		});
	});

	it("opens the Query Builder on the page's tab with no Query", () => {
		expect(areaWorkspaceLaunch({ id: "query-builder" }, context)).toEqual({
			id: "query-builder",
			launch: { tabId: 7, environmentId: null, fetchXml: null, launchedAt: context.now },
		});
	});

	it("refuses the Results Viewer,which opens from a results footer and not from navigation", () => {
		expect(areaWorkspaceLaunch({ id: "results-viewer" }, context)).toBeNull();
	});
});
