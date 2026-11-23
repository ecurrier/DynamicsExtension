import { describe, expect, it, vi } from "vitest";

import { createDataverseHttp, DataverseHttpError, withSolution } from "./http";

const jsonResponse = (body: unknown, status = 200) =>
	new Response(body === undefined ? null : JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

describe("createDataverseHttp", () => {
	it("builds absolute Web API urls and sends OData headers", async () => {
		const fetchImpl = vi.fn(async () => jsonResponse({ value: [1] }));
		const http = createDataverseHttp({
			origin: "https://org.crm.dynamics.com",
			headers: () => ({ Authorization: "Bearer abc" }),
			fetchImpl,
		});
		await expect(http.get<{ value: number[] }>("roles?$top=1")).resolves.toEqual({ value: [1] });
		expect(http.apiUrl).toBe("https://org.crm.dynamics.com/api/data/v9.2/");
		const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("https://org.crm.dynamics.com/api/data/v9.2/roles?$top=1");
		expect(init.method).toBe("GET");
		expect(init.headers).toMatchObject({
			Accept: "application/json",
			"OData-Version": "4.0",
			Authorization: "Bearer abc",
		});
	});

	it("serialises bodies and returns undefined for 204 responses", async () => {
		const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
		const http = createDataverseHttp({ origin: "https://org.crm.dynamics.com", fetchImpl });
		await expect(http.post("systemusers(1)/systemuserroles_association/$ref", { "@odata.id": "x" })).resolves.toBeUndefined();
		const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
		expect(init.method).toBe("POST");
		expect(init.body).toBe('{"@odata.id":"x"}');
		expect(init.headers).toMatchObject({ "Content-Type": "application/json; charset=utf-8" });
	});

	it("surfaces the Dataverse error message", async () => {
		const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: "Access denied" } }, 403));
		const http = createDataverseHttp({ origin: "https://org.crm.dynamics.com", fetchImpl });
		const failure = await http.get("roles").catch((error: unknown) => error);
		expect(failure).toBeInstanceOf(DataverseHttpError);
		expect((failure as DataverseHttpError).message).toBe("Access denied");
		expect((failure as DataverseHttpError).status).toBe(403);
	});

	it("falls back to the status line when the body is not json", async () => {
		const fetchImpl = vi.fn(async () => new Response("gateway down", { status: 502, statusText: "Bad Gateway" }));
		const http = createDataverseHttp({ origin: "https://org.crm.dynamics.com", fetchImpl });
		await expect(http.delete("roles(1)")).rejects.toThrow("502 Bad Gateway");
	});
});

describe("createDataverseHttp.requestText", () => {
	it("sends a text body with the caller's content type and returns the status, content type and text", async () => {
		const fetchImpl = vi.fn(
			async () => new Response("--b\r\n", { status: 400, statusText: "Bad Request", headers: { "Content-Type": "multipart/mixed; boundary=b" } })
		);
		const http = createDataverseHttp({ origin: "https://org.crm.dynamics.com", headers: () => ({ Authorization: "Bearer abc" }), fetchImpl });
		const response = await http.requestText("POST", "$batch", {
			body: "--a--\r\n",
			contentType: 'multipart/mixed; boundary="a"',
			headers: { Prefer: "x" },
		});
		expect(response).toEqual({ status: 400, statusText: "Bad Request", contentType: "multipart/mixed; boundary=b", text: "--b\r\n" });
		const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe("https://org.crm.dynamics.com/api/data/v9.2/$batch");
		expect(init.method).toBe("POST");
		expect(init.body).toBe("--a--\r\n");
		expect(init.headers).toEqual({
			Accept: "application/json",
			"OData-MaxVersion": "4.0",
			"OData-Version": "4.0",
			"Content-Type": 'multipart/mixed; boundary="a"',
			Authorization: "Bearer abc",
			Prefer: "x",
		});
	});

	it("sends no content type without a body and reports a missing response content type as empty", async () => {
		const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
		const http = createDataverseHttp({ origin: "https://org.crm.dynamics.com", fetchImpl });
		await expect(http.requestText("GET", "x", { contentType: "text/plain" })).resolves.toEqual({ status: 204, statusText: "", contentType: "", text: "" });
		const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
		expect(init.headers).not.toHaveProperty("Content-Type");
		expect(init.body).toBeUndefined();
	});
});

describe("withSolution", () => {
	it("adds the solution header when a name is given", () => {
		expect(withSolution(undefined, "ContosoCore")).toEqual({ "MSCRM.SolutionUniqueName": "ContosoCore" });
	});

	it("keeps the headers it was given", () => {
		expect(withSolution({ "If-Match": "*" }, "ContosoCore")).toEqual({ "If-Match": "*", "MSCRM.SolutionUniqueName": "ContosoCore" });
	});

	it("leaves the headers untouched when there is no solution", () => {
		expect(withSolution(undefined, null)).toBeUndefined();
		expect(withSolution(undefined, "   ")).toBeUndefined();
		expect(withSolution({ "If-Match": "*" }, undefined)).toEqual({ "If-Match": "*" });
	});

	it("trims the name, since a stray space would make the platform reject it", () => {
		expect(withSolution(undefined, "  ContosoCore  ")).toEqual({ "MSCRM.SolutionUniqueName": "ContosoCore" });
	});
});
