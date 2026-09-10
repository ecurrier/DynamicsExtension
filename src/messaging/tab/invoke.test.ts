import { beforeEach, describe, expect, it, vi } from "vitest";

const executeScript = vi.fn();

vi.mock("wxt/browser", () => ({
	browser: { scripting: { executeScript: (...args: unknown[]) => executeScript(...args) } },
}));

const { invoke } = await import("./invoke");
const { PageCommandError } = await import("./PageCommandError");

const envelope = (value: unknown) => [{ frameId: 0, result: { ok: true, value } }];

describe("invoke", () => {
	beforeEach(() => {
		executeScript.mockReset();
	});

	it("returns the envelope value from the page bridge", async () => {
		executeScript.mockResolvedValueOnce(envelope(["a"]));
		await expect(invoke(7, "global.getSolutions", undefined)).resolves.toEqual(["a"]);
		expect(executeScript).toHaveBeenCalledTimes(1);
		expect(executeScript.mock.calls[0]?.[0]).toMatchObject({
			target: { tabId: 7 },
			world: "MAIN",
			args: ["global.getSolutions", null],
		});
	});

	it("injects the bridge and retries when the page has no bridge yet", async () => {
		executeScript
			.mockResolvedValueOnce([{ frameId: 0, result: undefined }])
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce(envelope("portal"));
		await expect(invoke(7, "global.getPageContext", undefined)).resolves.toBe("portal");
		expect(executeScript).toHaveBeenCalledTimes(3);
		expect(executeScript.mock.calls[1]?.[0]).toMatchObject({ files: ["/page.js"], world: "MAIN" });
	});

	it("throws BridgeUnavailable when injection does not produce a bridge", async () => {
		executeScript.mockResolvedValue([{ frameId: 0, result: undefined }]);
		await expect(invoke(7, "global.getPageContext", undefined)).rejects.toMatchObject({ code: "BridgeUnavailable" });
	});

	it("maps error envelopes to PageCommandError", async () => {
		executeScript.mockResolvedValueOnce([{ frameId: 0, result: { ok: false, error: { name: "NoFormContext", message: "No form", details: 1 } } }]);
		const error = await invoke(7, "utilities.enableAdminMode", undefined).catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(PageCommandError);
		expect(error).toMatchObject({
			command: "utilities.enableAdminMode",
			code: "NoFormContext",
			message: "No form",
			details: 1,
		});
	});

	it("maps executeScript rejections to InjectionFailed", async () => {
		executeScript.mockRejectedValueOnce(new Error("Cannot access contents of the page"));
		await expect(invoke(7, "global.getPageContext", undefined)).rejects.toMatchObject({
			code: "InjectionFailed",
			message: "Cannot access contents of the page",
		});
	});

	it("times out when the page never responds", async () => {
		vi.useFakeTimers();
		executeScript.mockReturnValueOnce(new Promise(() => undefined));
		const pending = invoke(7, "global.getPageContext", undefined, { timeoutMs: 50 });
		const assertion = expect(pending).rejects.toMatchObject({ code: "Timeout" });
		await vi.advanceTimersByTimeAsync(60);
		await assertion;
		vi.useRealTimers();
	});
});
