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
