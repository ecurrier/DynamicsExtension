import { describe, expect, it } from "vitest";

import { createFakeHttp } from "@/test/fakeHttp";

import { BATCH_URL_THRESHOLD, batchContentType, boundaryOf, buildBatchGetBody, getBatchedWhenLong, getThroughBatch, parseBatchResponse } from "./batch";

const URL = "https://org.crm.dynamics.com/api/data/v9.2/accounts?fetchXml=%3Cfetch%3E%3C%2Ffetch%3E";

const responseText = (boundary: string, inner: string[]) =>
	[`--${boundary}`, "Content-Type: application/http", "Content-Transfer-Encoding: binary", "", ...inner, `--${boundary}--`, ""].join("\r\n");

const SUCCESS = [
	"HTTP/1.1 200 OK",
	"Content-Type: application/json; odata.metadata=minimal; odata.streaming=true",
	"OData-Version: 4.0",
	"",
	'{"value":[{"name":"A"}],"@Microsoft.Dynamics.CRM.morerecords":true}',
];

const FAILURE = [
	"HTTP/1.1 400 Bad Request",
	"REQ_ID: 5ecd1cb3-1730-4ffc-909c-d44c22270026",
	"Content-Type: application/json; odata.metadata=minimal",
	"OData-Version: 4.0",
	"",
	'{"error":{"code":"0x80041103","message":"\'account\' entity doesn\'t contain attribute with Name = \'nope\'."}}',
];

describe("buildBatchGetBody", () => {
	it("wraps one GET in a multipart body with CRLF line endings and a closing boundary", () => {
		const body = buildBatchGetBody({ boundary: "batch_abc", url: URL, headers: { Accept: "application/json", Prefer: 'odata.include-annotations="*"' } });
		expect(body).toBe(
			[
				"--batch_abc",
				"Content-Type: application/http",
				"Content-Transfer-Encoding: binary",
				"",
				`GET ${URL} HTTP/1.1`,
				"Accept: application/json",
				'Prefer: odata.include-annotations="*"',
				"",
				"",
				"--batch_abc--",
				"",
			].join("\r\n")
		);
		expect(body.replace(/\r\n/g, "")).not.toContain("\n");
	});

	it("writes no header lines when none are given", () => {
		expect(buildBatchGetBody({ boundary: "b", url: URL })).toBe(
			`--b\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\n\r\nGET ${URL} HTTP/1.1\r\n\r\n\r\n--b--\r\n`
		);
	});

	it("quotes the boundary in the envelope content type", () => {
		expect(batchContentType("batch_abc")).toBe('multipart/mixed; boundary="batch_abc"');
	});
});

describe("boundaryOf", () => {
	it("reads quoted and unquoted boundaries", () => {
		expect(boundaryOf('multipart/mixed; boundary="batchresponse_1"')).toBe("batchresponse_1");
		expect(boundaryOf("multipart/mixed; boundary=batchresponse_2")).toBe("batchresponse_2");
		expect(boundaryOf("multipart/mixed;boundary=batchresponse_3; charset=utf-8")).toBe("batchresponse_3");
		expect(boundaryOf("application/json")).toBeNull();
	});
});

describe("parseBatchResponse", () => {
	it("parses one successful part into its status, headers and body", () => {
		const parts = parseBatchResponse("multipart/mixed; boundary=batchresponse_1", responseText("batchresponse_1", SUCCESS));
		expect(parts).toHaveLength(1);
		expect(parts[0]).toMatchObject({ status: 200, statusText: "OK", headers: { "odata-version": "4.0" } });
		expect(JSON.parse(parts[0]?.body ?? "")).toEqual({ value: [{ name: "A" }], "@Microsoft.Dynamics.CRM.morerecords": true });
	});

	it("parses a part that carries an error", () => {
		const [part] = parseBatchResponse("multipart/mixed; boundary=batchresponse_2", responseText("batchresponse_2", FAILURE));
		expect(part).toMatchObject({ status: 400, statusText: "Bad Request" });
		expect(JSON.parse(part?.body ?? "").error.message).toBe("'account' entity doesn't contain attribute with Name = 'nope'.");
	});

	it("accepts LF line endings", () => {
		const text = responseText("batchresponse_3", SUCCESS).replace(/\r\n/g, "\n");
		expect(parseBatchResponse('multipart/mixed; boundary="batchresponse_3"', text)[0]?.status).toBe(200);
	});

	it("takes the boundary from the header rather than from the request", () => {
		const text = responseText("batchresponse_4", SUCCESS);
		expect(() => parseBatchResponse("multipart/mixed; boundary=batch_request", text)).toThrow(/could not be read/);
		expect(parseBatchResponse("multipart/mixed; boundary=batchresponse_4", text)).toHaveLength(1);
	});

	it("falls back to the first delimiter line when the header has no boundary", () => {
		expect(parseBatchResponse("multipart/mixed", responseText("batchresponse_5", SUCCESS))[0]?.status).toBe(200);
	});

	it("rejects malformed responses with a clear error", () => {
		expect(() => parseBatchResponse("multipart/mixed; boundary=b", "")).toThrow("The batch response could not be read: the closing boundary is missing");
		expect(() => parseBatchResponse("multipart/mixed", "not multipart")).toThrow("no multipart boundary was found");
		expect(() => parseBatchResponse("multipart/mixed; boundary=b", "--b--\r\n")).toThrow("it contains no responses");
		expect(() => parseBatchResponse("multipart/mixed; boundary=b", responseText("b", SUCCESS).replace("--b--", "--b"))).toThrow(
			"the closing boundary is missing"
		);
		expect(() => parseBatchResponse("multipart/mixed; boundary=b", responseText("b", ["garbage", "", "{}"]))).toThrow("a part has no HTTP status line");
		expect(() => parseBatchResponse("multipart/mixed; boundary=b", responseText("b", SUCCESS).replace("application/http", "text/plain"))).toThrow(
			'a part has the content type "text/plain" instead of application/http'
		);
	});

	it("does not change its input", () => {
		const text = responseText("batchresponse_6", SUCCESS);
		const copy = `${text}`;
		parseBatchResponse("multipart/mixed; boundary=batchresponse_6", text);
		expect(text).toBe(copy);
	});
});

const batchReply = (inner: string[], status = 200, statusText = "OK") => ({
	status,
	statusText,
	contentType: "multipart/mixed; boundary=batchresponse_9",
	text: responseText("batchresponse_9", inner),
});

describe("getThroughBatch", () => {
	it("posts one GET to $batch and returns the inner JSON", async () => {
		const { http, calls } = createFakeHttp({ "POST $batch": batchReply(SUCCESS) });
		const result = await getThroughBatch(http, "accounts?fetchXml=x", { Prefer: 'odata.include-annotations="*"' });
		expect(result).toEqual({ value: [{ name: "A" }], "@Microsoft.Dynamics.CRM.morerecords": true });
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({ method: "POST", path: "$batch" });
		const contentType = calls[0]?.headers?.["Content-Type"] ?? "";
		const boundary = boundaryOf(contentType) ?? "";
		expect(boundary).toMatch(/^batch_[0-9a-f-]{36}$/);
		expect(calls[0]?.body).toBe(
			buildBatchGetBody({
				boundary,
				url: "https://org.crm.dynamics.com/api/data/v9.2/accounts?fetchXml=x",
				headers: { Accept: "application/json", Prefer: 'odata.include-annotations="*"' },
			})
		);
	});

	it("raises the inner error with its status and message when the batch fails as a whole", async () => {
		const { http } = createFakeHttp({ "POST $batch": batchReply(FAILURE, 400, "Bad Request") });
		await expect(getThroughBatch(http, "accounts?fetchXml=x")).rejects.toMatchObject({
			name: "DataverseHttpError",
			status: 400,
			message: "'account' entity doesn't contain attribute with Name = 'nope'.",
		});
	});

	it("raises the inner error inside a 200 envelope", async () => {
		const { http } = createFakeHttp({ "POST $batch": batchReply(FAILURE) });
		await expect(getThroughBatch(http, "accounts?fetchXml=x")).rejects.toMatchObject({ name: "DataverseHttpError", status: 400 });
	});

	it("raises a non-multipart envelope error as the usual error", async () => {
		const { http } = createFakeHttp({
			"POST $batch": { status: 401, statusText: "Unauthorized", contentType: "application/json", text: '{"error":{"message":"Token expired"}}' },
		});
		await expect(getThroughBatch(http, "accounts?fetchXml=x")).rejects.toMatchObject({ name: "DataverseHttpError", status: 401, message: "Token expired" });
	});

	it("rejects a successful envelope that is not multipart or whose part is not JSON", async () => {
		const plain = createFakeHttp({ "POST $batch": { status: 200, statusText: "OK", contentType: "application/json", text: "{}" } });
		await expect(getThroughBatch(plain.http, "accounts?fetchXml=x")).rejects.toThrow('the content type is "application/json" instead of multipart/mixed');
		const broken = createFakeHttp({ "POST $batch": batchReply(["HTTP/1.1 200 OK", "", "<html>"]) });
		await expect(getThroughBatch(broken.http, "accounts?fetchXml=x")).rejects.toThrow("the response body is not JSON");
	});
});

describe("getBatchedWhenLong", () => {
	it("uses a plain GET up to the threshold and $batch beyond it", async () => {
		const prefix = "https://org.crm.dynamics.com/api/data/v9.2/".length;
		const { http, calls } = createFakeHttp({ "GET accounts": { value: [] }, "POST $batch": batchReply(SUCCESS) });
		await getBatchedWhenLong(http, `accounts?q=${"a".repeat(BATCH_URL_THRESHOLD - prefix - 11)}`);
		await getBatchedWhenLong(http, `accounts?q=${"a".repeat(BATCH_URL_THRESHOLD - prefix - 10)}`);
		expect(calls.map((call) => call.method)).toEqual(["GET", "POST"]);
	});
});
