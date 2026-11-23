import { describe, expect, it } from "vitest";

import { PageError } from "@/messaging/page";
import { DataverseHttpError, DataverseOperationError } from "@/shared/lib";

import { runOperation } from "./runOperation";

describe("runOperation", () => {
	it("turns a Dataverse HTTP error into the page's HttpError with its status and body", async () => {
		const body = JSON.stringify({ error: { message: "Invalid attribute" } });
		const failure = await runOperation(() => Promise.reject(new DataverseHttpError(400, "Bad Request", body))).catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(PageError);
		expect(failure).toMatchObject({ name: "HttpError", message: "Invalid attribute", details: { status: 400, body } });
	});

	it("keeps operation errors and other errors as before", async () => {
		await expect(runOperation(() => Promise.reject(new DataverseOperationError("NotFound", "Missing")))).rejects.toMatchObject({
			name: "NotFound",
			message: "Missing",
		});
		const other = new Error("boom");
		await expect(runOperation(() => Promise.reject(other))).rejects.toBe(other);
		await expect(runOperation(() => Promise.resolve(1))).resolves.toBe(1);
	});
});
