# Record Payload Utility

Status: resolved
Type: task

See `../spec.md`, "Record Payload".

- Page command `utilities.getRecordPayloadSource`: for the open Record, returns raw values from the Web API (`$select` of every column, no formatted values) together with the column metadata needed to shape a body: type, valid for create, valid for update, is primary id, lookup target entity set names, and whether a lookup value is set.
- Pure `buildRecordPayload(source, mode)` in `src/modules/utilities/lib/recordPayload.ts` with tests: `mode` Create or Update; lookups to `"column@odata.bind": "/entityset(guid)"` using the target's entity set (polymorphic lookups use the `lookuplogicalname` annotation to pick the target); choices as integers; money as the number; dates unchanged ISO; nulls, read-only, and system columns dropped; Create omits the primary id, Update keeps only valid-for-update columns.
- Dialog `RecordPayloadDialog`: Create / Update `RadioGroup`, `CodeBlock` JSON, Copy.
- Card on the Developer Area, disabled unless a Record is open.
- Harness: stub with the sample Account including a parent account lookup and a money column.

Blocked by: none
