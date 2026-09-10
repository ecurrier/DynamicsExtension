import { describe, expect, it } from "vitest";

import { createBridge, toCommandError } from "./createBridge";
import { type HandlerMap } from "./defineHandlers";
import { PageError } from "./PageError";

const handlers = {
	"global.getPageContext": () => "model-driven-app",
	"utilities.enableAdminMode": () => {
		throw new PageError("NoFormContext", "Navigate to a record form first", { hint: true });
	},
	"webapi.getRecordValues": () => Promise.reject({ message: "Xrm failed", errorCode: 42 }),
} as unknown as HandlerMap;

describe("createBridge", () => {
	const bridge = createBridge(handlers, "2.0.0");

	it("wraps handler results in an ok envelope", async () => {
		await expect(bridge.invoke("global.getPageContext", undefined)).resolves.toEqual({
			ok: true,
			value: "model-driven-app",
		});
	});

	it("converts thrown PageErrors into error envelopes", async () => {
		await expect(bridge.invoke("utilities.enableAdminMode", undefined)).resolves.toEqual({
			ok: false,
			error: { name: "NoFormContext", message: "Navigate to a record form first", details: { hint: true } },
		});
	});

	it("converts Xrm-style rejections into XrmError envelopes", async () => {
		await expect(bridge.invoke("webapi.getRecordValues", undefined)).resolves.toEqual({
			ok: false,
			error: { name: "XrmError", message: "Xrm failed", details: { errorCode: 42 } },
		});
	});

	it("rejects unknown commands without throwing", async () => {
		await expect(bridge.invoke("security.getCurrentUser", undefined)).resolves.toMatchObject({
			ok: false,
			error: { name: "UnknownCommand" },
		});
	});

	it("describes unknown error shapes", () => {
		expect(toCommandError("boom")).toEqual({ name: "UnknownError", message: "boom" });
		expect(toCommandError(new TypeError("bad"))).toEqual({ name: "TypeError", message: "bad" });
	});
});
