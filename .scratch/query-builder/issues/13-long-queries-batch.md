# Long queries through $batch

Status: ready-for-agent
Type: task
Phase: 1
Blocked by: 03

See `../spec.md`, decision 18.

A Query with a long `in` list can exceed what a GET URL may carry. `runQuery` sends such a Query inside a `$batch` request instead, and the caller cannot tell the difference.

- Read "Execute batch operations using the Web API" and the FetchXml-with-Web-API page on learn.microsoft.com for the request and response format and for the documented URL length limit; choose the threshold from what they state, with a margin, and record the source in this issue's comments.
- Build the multipart body with the single GET, carrying the same `Prefer` header, and parse the multipart response back into the same result `runQuery` returns for a plain GET, including a server error inside the batch surfacing as the usual error type with the platform's message.
- `createDataverseHttp` may need to send a non-JSON body and read a non-JSON response; extend it narrowly if so, without changing behaviour for existing callers. Both Connections go through it: the page side uses `pageHttp()` and the Environment side the token client.
- Paging works the same way: the next page of a long Query is also sent through `$batch`.

Acceptance:

- Unit tests: a short Query uses GET; a Query over the threshold uses POST `$batch` with a well-formed body; a batch response with one success parses to rows, more-records and cookie; a batch response carrying an error raises the usual error with the message.
- Harness: a fake-fetch route for `$batch`, and a fixture Query with a 600-GUID `in` list that returns rows.
- `npm run typecheck`, `npm run lint` and `npm test` pass.

Needs a real org (issue 14): a Query with several hundred GUIDs over both Connections.

## Comments

2026-11-22: done except the harness bullet (Opus worker, reviewed; tests pass). The harness route and the 600-GUID fixture are still to add, and the page bundle size is still to measure.

- Threshold: Microsoft's documentation states "The maximum URL length that the service accepts is 32 KB (32,768 characters)", and 64 KB inside `$batch` ("Execute batch operations using the Web API" and the Fetch XML retrieve-data page, fetched 2026-11-22 from learn.microsoft.com). `runQuery` uses `$batch` when the full absolute URL is over 30,000 characters. Nothing checks for a URL over 64 KB.
- Request: `POST $batch` with `Content-Type: multipart/mixed; boundary="batch_<uuid>"`. One part: `Content-Type: application/http`, `Content-Transfer-Encoding: binary`, a blank line, `GET <absolute api url>/<set>?fetchXml=<encoded xml> HTTP/1.1`, `Accept: application/json`, `Prefer: odata.include-annotations="*"`. CRLF line endings. `Prefer` is on the inner request only, because the documentation says envelope headers do not apply to items.
- Response: the boundary comes from the response's `Content-Type`, or from the first `--` line; CRLF and LF are both accepted. A failed part raises `DataverseHttpError` with the part's own status and message; a malformed reply raises `BatchResponseFormatError`.
- HTTP client: one added method, `requestText(method, path, { body, contentType, headers })`, returning `{ status, statusText, contentType, text }` without throwing on an error status. `request` is unchanged for existing callers. On the page side, `runOperation` now converts an escaped `DataverseHttpError` the same way the GET route always has.
- Code: `src/shared/lib/dataverse/batch.ts`.

The harness stub must answer `POST .../$batch` with `Content-Type: multipart/mixed; boundary=batchresponse_<id>` and one `application/http` part (`HTTP/1.1 200 OK`, a JSON content type, a blank line, the usual JSON result); for an error, a 400 envelope whose part is `HTTP/1.1 400 Bad Request` with `{"error":{"message":...}}`.

Needs a real org (for issue 14's checklist): a Query with several hundred GUIDs over both Connections; whether `$batch` works through the Page connection's session; the absolute inner URL; the error shape inside a batch.
