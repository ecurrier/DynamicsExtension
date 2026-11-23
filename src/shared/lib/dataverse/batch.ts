import { type DataverseHttp, DataverseHttpError } from "./http";

export interface BatchGetRequest {
	boundary: string;
	url: string;
	headers?: Record<string, string>;
}

export interface BatchResponsePart {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: string;
}

export class BatchResponseFormatError extends Error {
	constructor(detail: string) {
		super(`The batch response could not be read: ${detail}`);
		this.name = "BatchResponseFormatError";
	}
}

const CRLF = "\r\n";

export const batchContentType = (boundary: string): string => `multipart/mixed; boundary="${boundary}"`;

export const buildBatchGetBody = ({ boundary, url, headers = {} }: BatchGetRequest): string =>
	[
		`--${boundary}`,
		"Content-Type: application/http",
		"Content-Transfer-Encoding: binary",
		"",
		`GET ${url} HTTP/1.1`,
		...Object.entries(headers).map(([name, value]) => `${name}: ${value}`),
		"",
		"",
		`--${boundary}--`,
		"",
	].join(CRLF);

export const boundaryOf = (contentType: string): string | null => {
	const match = /;\s*boundary\s*=\s*(?:"([^"]+)"|([^\s;]+))/i.exec(contentType);
	return match?.[1] ?? match?.[2] ?? null;
};

const headerBlock = (block: string): Record<string, string> =>
	Object.fromEntries(
		block
			.split("\n")
			.filter((line) => line.includes(":"))
			.map((line) => {
				const separator = line.indexOf(":");
				return [line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim()];
			})
	);

const splitHead = (text: string): [string, string] => {
	const end = text.indexOf("\n\n");
	return end < 0 ? [text, ""] : [text.slice(0, end), text.slice(end + 2)];
};

const parsePart = (raw: string): BatchResponsePart => {
	const [partHead, message] = splitHead(raw.replace(/^[ \t]*\n/, ""));
	const partType = headerBlock(partHead)["content-type"] ?? "";
	if (!/^application\/http\b/i.test(partType)) {
		throw new BatchResponseFormatError(`a part has the content type "${partType}" instead of application/http`);
	}
	const [responseHead, body] = splitHead(message.replace(/^\n+/, ""));
	const [statusLine = "", ...headerLines] = responseHead.split("\n");
	const status = /^HTTP\/\d(?:\.\d)?\s+(\d{3})\s*(.*)$/.exec(statusLine.trim());
	if (!status) {
		throw new BatchResponseFormatError("a part has no HTTP status line");
	}
	return { status: Number(status[1]), statusText: status[2] ?? "", headers: headerBlock(headerLines.join("\n")), body: body.trim() };
};

export const parseBatchResponse = (contentType: string, text: string): BatchResponsePart[] => {
	const normalised = text.replace(/\r\n/g, "\n");
	const boundary = boundaryOf(contentType) ?? /^--(\S+)[ \t]*$/m.exec(normalised)?.[1];
	if (!boundary) {
		throw new BatchResponseFormatError("no multipart boundary was found");
	}
	const delimiter = `\n--${boundary}`;
	const segments = `\n${normalised}`.split(delimiter);
	const closing = segments.findIndex((segment, index) => index > 0 && segment.startsWith("--"));
	if (closing < 0) {
		throw new BatchResponseFormatError("the closing boundary is missing");
	}
	const parts = segments.slice(1, closing);
	if (parts.length === 0) {
		throw new BatchResponseFormatError("it contains no responses");
	}
	return parts.map(parsePart);
};

export const BATCH_URL_THRESHOLD = 30000;

const isSuccess = (status: number): boolean => status >= 200 && status < 300;

const parseJson = <T>(body: string): T => {
	try {
		return (body ? JSON.parse(body) : undefined) as T;
	} catch {
		throw new BatchResponseFormatError("the response body is not JSON");
	}
};

export const getThroughBatch = async <T>(http: DataverseHttp, path: string, headers: Record<string, string> = {}): Promise<T> => {
	const boundary = `batch_${crypto.randomUUID()}`;
	const response = await http.requestText("POST", "$batch", {
		body: buildBatchGetBody({ boundary, url: `${http.apiUrl}${path}`, headers: { Accept: "application/json", ...headers } }),
		contentType: batchContentType(boundary),
	});
	if (!/^multipart\/mixed/i.test(response.contentType)) {
		if (isSuccess(response.status)) {
			throw new BatchResponseFormatError(`the content type is "${response.contentType}" instead of multipart/mixed`);
		}
		throw new DataverseHttpError(response.status, response.statusText, response.text);
	}
	const [part] = parseBatchResponse(response.contentType, response.text);
	if (!part) {
		throw new BatchResponseFormatError("it contains no responses");
	}
	if (!isSuccess(part.status)) {
		throw new DataverseHttpError(part.status, part.statusText, part.body);
	}
	return parseJson<T>(part.body);
};

export const getBatchedWhenLong = <T>(http: DataverseHttp, path: string, headers: Record<string, string> = {}): Promise<T> =>
	`${http.apiUrl}${path}`.length > BATCH_URL_THRESHOLD ? getThroughBatch<T>(http, path, headers) : http.request<T>("GET", path, undefined, headers);
